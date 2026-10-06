package ai.eventsnap.camera

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * After the phone restarts, continue auto upload if the photographer had it on.
 * Android 15+ doesn't allow starting this kind of background service at boot,
 * so there a notification asks for one tap (opening the app resumes it).
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val prefs = Prefs(context)
        if (!prefs.running || prefs.eventId.isEmpty()) return

        if (Build.VERSION.SDK_INT < 35) {
            UploadService.start(context)
            return
        }
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel("auto_upload_resume", "Resume camera auto upload", NotificationManager.IMPORTANCE_DEFAULT)
        )
        val open = PendingIntent.getActivity(
            context, 2, Intent(context, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        manager.notify(
            43,
            Notification.Builder(context, "auto_upload_resume")
                .setSmallIcon(android.R.drawable.stat_sys_upload)
                .setContentTitle("Resume camera auto upload")
                .setContentText("Tap to continue uploading to ${prefs.eventName}")
                .setContentIntent(open)
                .setAutoCancel(true)
                .build()
        )
    }
}
