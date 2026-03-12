// android/app/src/main/java/com/palavraprimeiro/BlockerModule.kt
//
// Módulo nativo Android que:
// 1. Verifica permissão UsageStats
// 2. Roda um ForegroundService monitorando o app em foco
// 3. Emite evento React Native quando um app bloqueado é aberto

package com.palavraprimeiro

import android.app.*
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.*
import android.os.*
import android.provider.Settings
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class BlockerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "BlockerModule"
        const val CHANNEL_ID = "palavra_primeiro_blocker"
        const val NOTIF_ID = 1001
        const val EVENT_APP_BLOCKED = "APP_BLOCKED"

        var blockedPackages: Set<String> = emptySet()
        var instance: BlockerModule? = null
    }

    init {
        instance = this
    }

    override fun getName() = MODULE_NAME

    // ─── Permissões ────────────────────────────────────────────────────────────

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

    // ─── Foreground Service ────────────────────────────────────────────────────

    @ReactMethod
    fun startForegroundService(packages: ReadableArray, promise: Promise) {
        blockedPackages = (0 until packages.size()).map { packages.getString(it) }.toSet()

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
        val serviceIntent = Intent(reactContext, BlockerForegroundService::class.java)
        reactContext.stopService(serviceIntent)
        promise.resolve(null)
    }

    // ─── Estatísticas de uso ───────────────────────────────────────────────────

    @ReactMethod
    fun getUsageStats(startTime: Double, endTime: Double, promise: Promise) {
        val usageStatsManager =
            reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            startTime.toLong(),
            endTime.toLong()
        )

        val result = WritableNativeMap()
        stats.forEach { stat ->
            result.putDouble(stat.packageName, stat.totalTimeInForeground.toDouble())
        }
        promise.resolve(result)
    }

    // ─── Emissão de eventos para o JS ─────────────────────────────────────────

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

// ─── AccessibilityService ─────────────────────────────────────────────────────
// Arquivo: android/app/src/main/java/com/palavraprimeiro/BlockerAccessibilityService.kt

/*
class BlockerAccessibilityService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val packageName = event.packageName?.toString() ?: return

        if (packageName in BlockerModule.blockedPackages) {
            val displayName = getDisplayName(packageName)
            BlockerModule.instance?.emitAppBlocked(packageName, displayName)

            // Abre a overlay do app sobre o app bloqueado
            val intent = Intent(this, BlockerActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtra("packageName", packageName)
                putExtra("displayName", displayName)
            }
            startActivity(intent)
        }
    }

    override fun onInterrupt() {}

    private fun getDisplayName(packageName: String): String {
        return try {
            val pm = packageManager
            val appInfo = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
            packageName
        }
    }
}
*/
