package ai.eventsnap.camera

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.database.ContentObserver
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.MediaStore
import java.io.IOException
import java.util.Calendar
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Camera Auto Upload — background service (shown as an ongoing notification,
 * Android's required form for continuous background work).
 *
 * The camera's own app (Canon Camera Connect, Nikon SnapBridge, Sony Imaging
 * Edge Mobile, Fujifilm XApp, …) or Android's photo import from a USB-connected
 * camera saves new photos into the phone's gallery. This service is notified
 * of every gallery change (and also re-checks every 10 s), and uploads each new
 * photo to the chosen event with the existing EventSnap upload API.
 *
 * No duplicates: each gallery photo id is remembered once uploaded; photos with
 * the same name + size as one already in the event are skipped; a photo is only
 * sent once Android marks it complete (not IS_PENDING) and its size is unchanged
 * between two checks.
 */
class UploadService : Service() {

    companion object {
        private const val CHANNEL = "auto_upload"
        private const val NOTIFICATION_ID = 42
        private const val ACTION_STOP = "ai.eventsnap.camera.STOP"
        private const val RECHECK_MS = 10_000L
        private const val MAX_SIZE = 25L * 1024 * 1024 // backend per-file limit
        private const val BATCH_MAX_FILES = 5
        private const val BATCH_MAX_BYTES = 25L * 1024 * 1024
        private const val MAX_ATTEMPTS = 5
        private val IMAGE_TYPES = setOf("image/jpeg", "image/png", "image/webp", "image/heic", "image/heif")

        fun start(context: Context) {
            context.startForegroundService(Intent(context, UploadService::class.java))
        }

        fun stop(context: Context) {
            Prefs(context).running = false
            context.stopService(Intent(context, UploadService::class.java))
        }
    }

    private class Failure(val attempts: Int, val nextTry: Long)
    private class Candidate(val id: Long, val name: String, val size: Long, val mime: String, val uri: Uri)

    private lateinit var prefs: Prefs
    private lateinit var api: Api
    private var worker: ExecutorService = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private var observer: ContentObserver? = null
    @Volatile private var scanQueued = false
    @Volatile private var stopped = false

    // Worker-thread state.
    private var initialized = false
    private var eventId = ""
    private var uploadedIds: MutableSet<String> = HashSet()
    private var inEvent: MutableSet<String> = HashSet()
    private val lastSeen = HashMap<Long, Pair<Long, Long>>() // id -> (size, dateModified)
    private val failures = HashMap<Long, Failure>()
    private var uploadedCount = 0
    private var skippedCount = 0

    private val recheck = object : Runnable {
        override fun run() {
            requestScan()
            main.postDelayed(this, RECHECK_MS)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        prefs = Prefs(this)
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, "Camera auto upload", NotificationManager.IMPORTANCE_LOW)
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            prefs.running = false
            stopSelf()
            return START_NOT_STICKY
        }
        // Restarted by Android after being killed, but the photographer had stopped it.
        if (!prefs.running || prefs.eventId.isEmpty()) {
            stopSelf()
            return START_NOT_STICKY
        }
        startInForeground(notification("Starting…"))
        if (observer == null) {
            stopped = false
            api = Api(prefs.apiUrl).also { it.token = prefs.token.ifEmpty { null } }
            Status.update { Status.State(running = true, eventName = prefs.eventName, phase = "Connecting…") }
            observer = object : ContentObserver(main) {
                override fun onChange(selfChange: Boolean) = requestScan()
            }.also {
                contentResolver.registerContentObserver(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, true, it)
            }
            main.post(recheck)
        }
        return START_STICKY
    }

    override fun onDestroy() {
        stopped = true
        observer?.let { contentResolver.unregisterContentObserver(it) }
        observer = null
        main.removeCallbacks(recheck)
        worker.shutdownNow()
        Status.update { it.copy(running = false, phase = if (it.error.isNotEmpty()) "Stopped — ${it.error}" else "Stopped") }
        super.onDestroy()
    }

    /** Android 15+: data-sync services may run ~6 h a day; Android then asks us to stop. */
    override fun onTimeout(startId: Int, fgsType: Int) {
        Status.update { it.copy(error = "Android paused background upload after its daily time limit. Open the app and tap Start to continue.") }
        prefs.running = false
        stopSelf()
    }

    private fun startInForeground(n: Notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(NOTIFICATION_ID, n)
        }
    }

    private fun notification(text: String): Notification {
        val open = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val stop = PendingIntent.getService(
            this, 1, Intent(this, UploadService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE
        )
        return Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.stat_sys_upload)
            .setContentTitle("Auto upload → ${prefs.eventName}")
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(open)
            .addAction(Notification.Action.Builder(null, "Stop", stop).build())
            .build()
    }

    private fun publish(phase: String, waiting: Int, last: String? = null) {
        val failed = failures.values.count { it.attempts >= MAX_ATTEMPTS }
        Status.update {
            it.copy(
                running = true, phase = phase, uploaded = uploadedCount, skipped = skippedCount,
                waiting = waiting, failed = failed, last = last ?: it.last,
            )
        }
        val summary = "$phase · $uploadedCount uploaded" +
            (if (waiting > 0) " · $waiting waiting" else "") + (if (failed > 0) " · $failed failed" else "")
        getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification(summary))
    }

    private fun requestScan() {
        if (stopped || scanQueued) return
        scanQueued = true
        try {
            worker.execute {
                scanQueued = false
                try {
                    scanAndUpload()
                } catch (e: Exception) {
                    publish("Problem: ${e.message ?: "unknown"} — retrying", lastSeen.size)
                }
            }
        } catch (e: Exception) {
            scanQueued = false // shutting down
        }
    }

    private fun signIn() {
        val token = api.login(prefs.email, prefs.password)
        prefs.token = token
    }

    /** First run on the worker: sign in if needed and learn what the event already has. */
    private fun initialize() {
        eventId = prefs.eventId
        if (api.token == null) signIn()
        inEvent = try {
            api.photoKeys(eventId)
        } catch (e: ApiException) {
            if (e.status != 401) throw e
            signIn()
            api.photoKeys(eventId)
        }
        uploadedIds = prefs.uploadedIds(eventId)
        initialized = true
    }

    private fun since(): Long {
        if (!prefs.includeToday) return prefs.startedAt
        val c = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
        }
        return minOf(prefs.startedAt, c.timeInMillis / 1000)
    }

    private fun scanAndUpload() {
        if (stopped) return
        if (!initialized) {
            try {
                initialize()
            } catch (e: ApiException) {
                if (e.status == 401 || e.status == 404) {
                    fatal(if (e.status == 404) "The event no longer exists." else "Sign in failed — open the app and sign in again.")
                    return
                }
                publish("Can't reach EventSnap (${e.message}) — retrying", 0)
                return
            } catch (e: IOException) {
                publish("Offline — waiting for a connection", 0)
                return
            }
        }

        val ready = ArrayList<Candidate>()
        var waiting = 0
        val now = System.currentTimeMillis()
        val album = prefs.album.trim()
        val projection = mutableListOf(
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.DISPLAY_NAME,
            MediaStore.Images.Media.SIZE,
            MediaStore.Images.Media.DATE_MODIFIED,
            MediaStore.Images.Media.MIME_TYPE,
            MediaStore.Images.Media.BUCKET_DISPLAY_NAME,
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) projection += MediaStore.MediaColumns.IS_PENDING

        contentResolver.query(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            projection.toTypedArray(),
            "${MediaStore.Images.Media.DATE_ADDED} >= ?",
            arrayOf(since().toString()),
            "${MediaStore.Images.Media.DATE_ADDED} ASC",
        )?.use { c ->
            val iId = c.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
            val iName = c.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
            val iSize = c.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE)
            val iMod = c.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_MODIFIED)
            val iMime = c.getColumnIndexOrThrow(MediaStore.Images.Media.MIME_TYPE)
            val iBucket = c.getColumnIndexOrThrow(MediaStore.Images.Media.BUCKET_DISPLAY_NAME)
            val iPending = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) c.getColumnIndex(MediaStore.MediaColumns.IS_PENDING) else -1

            while (c.moveToNext()) {
                val id = c.getLong(iId)
                if (uploadedIds.contains(id.toString())) continue
                val name = c.getString(iName) ?: continue
                val size = c.getLong(iSize)
                val mime = (c.getString(iMime) ?: "").lowercase()
                if (mime !in IMAGE_TYPES) continue // RAW etc. — shoot RAW+JPEG
                if (album.isNotEmpty() && !album.equals(c.getString(iBucket) ?: "", ignoreCase = true)) continue
                if (iPending >= 0 && c.getInt(iPending) == 1) { waiting++; continue } // still being saved
                if (inEvent.contains("$name|$size")) {
                    uploadedIds.add(id.toString()); skippedCount++; continue
                }
                val failure = failures[id]
                if (failure != null && (failure.attempts >= MAX_ATTEMPTS || now < failure.nextTry)) continue
                if (size > MAX_SIZE) {
                    failures[id] = Failure(MAX_ATTEMPTS, Long.MAX_VALUE); continue
                }
                val modified = c.getLong(iMod)
                val seen = lastSeen[id]
                if (seen != null && seen.first == size && seen.second == modified && size > 0) {
                    lastSeen.remove(id)
                    ready += Candidate(id, name, size, mime, ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id))
                } else {
                    lastSeen[id] = size to modified
                    waiting++
                }
            }
        }
        prefs.saveUploadedIds(eventId, uploadedIds)

        // Photos added to the event meanwhile (dashboard, another device) aren't uploaded again.
        if (ready.isNotEmpty()) {
            try {
                inEvent.addAll(api.photoKeys(eventId))
            } catch (e: Exception) {
                // Offline / expired session — the upload below handles it.
            }
            val already = ready.filter { inEvent.contains("${it.name}|${it.size}") }
            for (c in already) {
                uploadedIds.add(c.id.toString()); skippedCount++
            }
            ready.removeAll(already.toSet())
            if (already.isNotEmpty()) prefs.saveUploadedIds(eventId, uploadedIds)
        }

        if (ready.isEmpty()) {
            publish(if (waiting > 0) "New photos arriving…" else "Watching for new photos", waiting)
            return
        }

        var i = 0
        while (i < ready.size && !stopped) {
            val batch = ArrayList<Candidate>()
            var bytes = 0L
            while (i < ready.size && batch.size < BATCH_MAX_FILES && (batch.isEmpty() || bytes + ready[i].size <= BATCH_MAX_BYTES)) {
                bytes += ready[i].size; batch += ready[i]; i++
            }
            publish("Uploading…", waiting + ready.size - i + batch.size)
            if (!send(batch)) {
                // One at a time so a single bad photo only fails itself.
                if (batch.size > 1) batch.forEach { if (!stopped) send(listOf(it)) }
            }
        }
        publish("Watching for new photos", waiting, null)
    }

    /** Uploads one batch; true on success. Records failures for retry/backoff. */
    private fun send(batch: List<Candidate>, retried: Boolean = false): Boolean {
        try {
            val photos = batch.map { c ->
                val bytes = contentResolver.openInputStream(c.uri)?.use { it.readBytes() }
                    ?: throw IOException("can't read ${c.name}")
                PhotoUpload(c.name, c.mime, bytes)
            }
            api.upload(eventId, photos)
            for (c in batch) {
                uploadedIds.add(c.id.toString())
                inEvent.add("${c.name}|${c.size}")
                failures.remove(c.id)
            }
            uploadedCount += batch.size
            prefs.saveUploadedIds(eventId, uploadedIds)
            publish("Uploading…", 0, batch.last().name)
            return true
        } catch (e: ApiException) {
            when {
                e.status == 401 && !retried -> {
                    return try {
                        signIn(); send(batch, retried = true)
                    } catch (x: Exception) {
                        fatal("Sign in failed — open the app and sign in again."); false
                    }
                }
                e.status == 404 -> { fatal("The event no longer exists."); return false }
                e.status == 400 && batch.size == 1 -> batch.forEach { failures[it.id] = Failure(MAX_ATTEMPTS, Long.MAX_VALUE) }
                else -> backoff(batch)
            }
        } catch (e: IOException) {
            backoff(batch) // offline / timeout — retried later
        }
        return false
    }

    private fun backoff(batch: List<Candidate>) {
        val now = System.currentTimeMillis()
        for (c in batch) {
            val attempts = (failures[c.id]?.attempts ?: 0) + 1
            failures[c.id] = Failure(attempts, now + 30_000L * attempts)
        }
    }

    private fun fatal(message: String) {
        Status.update { it.copy(error = message) }
        prefs.running = false
        main.post { stopSelf() }
    }
}
