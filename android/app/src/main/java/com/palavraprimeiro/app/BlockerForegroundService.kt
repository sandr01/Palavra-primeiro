package com.palavraprimeiro.app

import android.app.Notification
import android.app.Service
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import android.app.ForegroundServiceStartNotAllowedException
import android.content.pm.ServiceInfo

class BlockerForegroundService : Service() {

  private val handler = Handler(Looper.getMainLooper())
  private var lastBlockedPackage: String? = null

  private val pollRunnable = object : Runnable {
    override fun run() {
      try {
        val topPackage = getTopPackageName()
        if (topPackage != null && topPackage in BlockerModule.blockedPackages) {
          if (topPackage != lastBlockedPackage) {
            lastBlockedPackage = topPackage
            val displayName = getDisplayName(topPackage)
            BlockerModule.instance?.emitAppBlocked(topPackage, displayName)

            // Bring app to front to show overlay
            val intent = Intent(this@BlockerForegroundService, MainActivity::class.java).apply {
              addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
          }
        } else {
          lastBlockedPackage = null
        }
      } finally {
        handler.postDelayed(this, 1000)
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(
          BlockerModule.NOTIF_ID,
          buildNotification(),
          ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
        )
      } else {
        startForeground(BlockerModule.NOTIF_ID, buildNotification())
      }
    } catch (e: ForegroundServiceStartNotAllowedException) {
      stopSelf()
      return
    } catch (e: RuntimeException) {
      stopSelf()
      return
    }
    handler.post(pollRunnable)
  }

  override fun onDestroy() {
    handler.removeCallbacks(pollRunnable)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun buildNotification(): Notification {
    return NotificationCompat.Builder(this, BlockerModule.CHANNEL_ID)
      .setContentTitle("Palavra Primeiro")
      .setContentText("Bloqueio de apps ativo")
      .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
      .setOngoing(true)
      .build()
  }

  private fun getTopPackageName(): String? {
    val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val end = System.currentTimeMillis()
    val start = end - 10_000
    val stats = usageStatsManager.queryUsageStats(
      UsageStatsManager.INTERVAL_DAILY,
      start,
      end
    )
    if (stats.isNullOrEmpty()) return null
    val recent = stats.maxByOrNull { it.lastTimeUsed }
    return recent?.packageName
  }

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
