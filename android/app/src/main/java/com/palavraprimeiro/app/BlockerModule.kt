package com.palavraprimeiro.app

import android.app.AppOpsManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class BlockerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val MODULE_NAME = "BlockerModule"
    const val CHANNEL_ID = "palavra_primeiro_blocker"
    const val NOTIF_ID = 1001
    const val EVENT_APP_BLOCKED = "APP_BLOCKED"

    @Volatile
    var blockedPackages: Set<String> = emptySet()

    @Volatile
    var releasedPackageName: String? = null

    @Volatile
    var releasedPackageUntilMs: Long = 0L

    @Volatile
    var instance: BlockerModule? = null
  }

  init {
    instance = this
  }

  override fun getName() = MODULE_NAME

  // Permissions
  @ReactMethod
  fun hasUsageStatsPermission(promise: Promise) {
    val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = appOps.checkOpNoThrow(
      AppOpsManager.OPSTR_GET_USAGE_STATS,
      android.os.Process.myUid(),
      reactContext.packageName
    )
    promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
  }

  @ReactMethod
  fun openUsageStatsSettings(promise: Promise) {
    val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
    promise.resolve(null)
  }

  @ReactMethod
  fun isAccessibilityServiceEnabled(promise: Promise) {
    val service = "${reactContext.packageName}/${BlockerAccessibilityService::class.java.canonicalName}"
    val enabled = Settings.Secure.getString(
      reactContext.contentResolver,
      Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    )?.contains(service) == true
    promise.resolve(enabled)
  }

  @ReactMethod
  fun openAccessibilitySettings(promise: Promise) {
    val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
    promise.resolve(null)
  }

  // Foreground Service
  @ReactMethod
  fun startForegroundService(packages: ReadableArray, promise: Promise) {
    // Avoid starting a foreground service while app is backgrounded (Android 14+ restriction)
    if (reactContext.currentActivity == null) {
      promise.resolve(null)
      return
    }
    blockedPackages = (0 until packages.size()).mapNotNull { packages.getString(it) }.toSet()
    createNotificationChannel()

    val serviceIntent = Intent(reactContext, BlockerForegroundService::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      reactContext.startForegroundService(serviceIntent)
    } else {
      reactContext.startService(serviceIntent)
    }
    promise.resolve(null)
  }

  @ReactMethod
  fun stopForegroundService(promise: Promise) {
    blockedPackages = emptySet()
    releasedPackageName = null
    releasedPackageUntilMs = 0L
    val serviceIntent = Intent(reactContext, BlockerForegroundService::class.java)
    reactContext.stopService(serviceIntent)
    promise.resolve(null)
  }

  @ReactMethod
  fun releaseBlockedApp(packageName: String, promise: Promise) {
    try {
      val launchIntent = reactContext.packageManager.getLaunchIntentForPackage(packageName)
      if (launchIntent == null) {
        promise.resolve(false)
        return
      }

      releasedPackageName = packageName
      releasedPackageUntilMs = System.currentTimeMillis() + 5000L
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
      reactContext.startActivity(launchIntent)
      promise.resolve(true)
    } catch (e: Exception) {
      releasedPackageName = null
      releasedPackageUntilMs = 0L
      promise.reject("OPEN_BLOCKED_APP_FAILED", e)
    }
  }

  // Usage stats
  @ReactMethod
  fun getUsageStats(startTime: Double, endTime: Double, promise: Promise) {
    val usageStatsManager =
      reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as android.app.usage.UsageStatsManager
    val stats = usageStatsManager.queryUsageStats(
      android.app.usage.UsageStatsManager.INTERVAL_DAILY,
      startTime.toLong(),
      endTime.toLong()
    )

    val result = WritableNativeMap()
    stats.forEach { stat ->
      result.putDouble(stat.packageName, stat.totalTimeInForeground.toDouble())
    }
    promise.resolve(result)
  }

  // Events to JS
  fun emitAppBlocked(packageName: String, displayName: String) {
    val params = WritableNativeMap().apply {
      putString("packageName", packageName)
      putString("displayName", displayName)
      putDouble("timestamp", System.currentTimeMillis().toDouble())
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENT_APP_BLOCKED, params)
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Palavra Primeiro — Bloqueio ativo",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Monitora apps bloqueados em segundo plano"
      }
      val manager = reactContext.getSystemService(NotificationManager::class.java)
      manager.createNotificationChannel(channel)
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Int) {}
}
