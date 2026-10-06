package ai.eventsnap.camera

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

/** Sign in, choose the event, start/stop Camera Auto Upload and see its status. */
class MainActivity : Activity() {
    private lateinit var prefs: Prefs
    private lateinit var apiUrl: EditText
    private lateinit var email: EditText
    private lateinit var password: EditText
    private lateinit var eventLabel: TextView
    private lateinit var album: EditText
    private lateinit var includeToday: CheckBox
    private lateinit var toggle: Button
    private lateinit var statusText: TextView
    private val listener: (Status.State) -> Unit = { s -> runOnUiThread { render(s) } }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = Prefs(this)
        val pad = dp(16)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
        }
        fun heading(text: String) = TextView(this).apply {
            this.text = text
            setTypeface(typeface, Typeface.BOLD)
            setPadding(0, dp(14), 0, dp(4))
        }

        root.addView(TextView(this).apply {
            text = "EventSnap Camera Auto Upload"
            textSize = 20f
            setTypeface(typeface, Typeface.BOLD)
        })
        root.addView(TextView(this).apply {
            text = "Connect your camera with its app (Canon Camera Connect, Nikon SnapBridge, Sony Imaging Edge " +
                "Mobile, Fujifilm XApp…) over camera Wi-Fi, Bluetooth or USB so photos are saved to this phone. " +
                "New photos then upload to the chosen EventSnap event automatically — also in the background."
            setPadding(0, dp(6), 0, dp(4))
        })

        root.addView(heading("1. Sign in"))
        apiUrl = EditText(this).apply {
            hint = "EventSnap server, e.g. https://api.example.com"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            setText(prefs.apiUrl)
        }
        email = EditText(this).apply {
            hint = "Email"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
            setText(prefs.email)
        }
        password = EditText(this).apply {
            hint = "Password"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        root.addView(apiUrl)
        root.addView(email)
        root.addView(password)
        root.addView(Button(this).apply {
            text = "Sign in & choose event"
            setOnClickListener { signInAndChooseEvent() }
        })

        root.addView(heading("2. Event"))
        eventLabel = TextView(this)
        root.addView(eventLabel)

        root.addView(heading("3. Options"))
        album = EditText(this).apply {
            hint = "Only from album (optional), e.g. Camera Connect"
            setText(prefs.album)
        }
        includeToday = CheckBox(this).apply {
            text = "Also upload photos already on the phone from today"
            isChecked = prefs.includeToday
        }
        root.addView(album)
        root.addView(includeToday)

        toggle = Button(this).apply { setOnClickListener { if (Status.state.running) stopUpload() else startUpload() } }
        root.addView(toggle)
        statusText = TextView(this).apply { setPadding(0, dp(10), 0, 0) }
        root.addView(statusText)

        setContentView(ScrollView(this).apply { addView(root) })
        renderEvent()
        requestPermissionsIfNeeded()
    }

    override fun onResume() {
        super.onResume()
        Status.listen(listener)
        // Reopened (or tapped the "resume" notification after a restart) while
        // auto upload is meant to be on: carry on with the same event. The
        // original start time is kept, so photos taken meanwhile are included;
        // already-uploaded photos are remembered and never sent again.
        if (prefs.running && !Status.state.running && prefs.eventId.isNotEmpty() && hasPhotoAccess()) {
            UploadService.start(this)
        }
        render(Status.state)
    }

    override fun onPause() {
        Status.unlisten(listener)
        super.onPause()
    }

    private fun signInAndChooseEvent() {
        val url = apiUrl.text.toString().trim()
        val mail = email.text.toString().trim()
        val pw = password.text.toString().ifEmpty { prefs.password }
        if (url.isEmpty() || mail.isEmpty() || pw.isEmpty()) return toast("Enter the server, email and password")
        toast("Signing in…")
        Thread {
            try {
                val api = Api(url)
                val token = api.login(mail, pw)
                val events = api.events()
                runOnUiThread {
                    prefs.apiUrl = url
                    prefs.email = mail
                    prefs.password = pw
                    prefs.token = token
                    password.setText("")
                    if (events.isEmpty()) {
                        toast("No events yet — create one in the EventSnap dashboard")
                    } else {
                        AlertDialog.Builder(this)
                            .setTitle("Upload to which event?")
                            .setItems(events.map { "${it.name}  (${it.date})" }.toTypedArray()) { _, i ->
                                prefs.eventId = events[i].id
                                prefs.eventName = events[i].name
                                renderEvent()
                            }
                            .show()
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { toast("Couldn't sign in: ${e.message}") }
            }
        }.start()
    }

    private fun startUpload() {
        if (prefs.eventId.isEmpty()) return toast("Sign in and choose an event first")
        if (!hasPhotoAccess()) {
            requestPermissionsIfNeeded()
            return toast("Allow access to photos so new camera photos can be found")
        }
        prefs.album = album.text.toString().trim()
        prefs.includeToday = includeToday.isChecked
        prefs.startedAt = System.currentTimeMillis() / 1000
        prefs.running = true
        UploadService.start(this)
    }

    private fun stopUpload() {
        UploadService.stop(this)
    }

    private fun renderEvent() {
        eventLabel.text = if (prefs.eventId.isEmpty()) "No event chosen yet" else "Uploading to: ${prefs.eventName}"
    }

    private fun render(s: Status.State) {
        toggle.text = if (s.running) "Stop auto upload" else "Start auto upload"
        val partial = Build.VERSION.SDK_INT >= 34 && !hasPhotoAccess() &&
            checkSelfPermission("android.permission.READ_MEDIA_VISUAL_USER_SELECTED") == PackageManager.PERMISSION_GRANTED
        statusText.text = buildString {
            append(if (s.running) "● ${s.phase}" else "○ ${s.phase}")
            if (s.running || s.uploaded > 0) {
                append("\nUploaded ${s.uploaded} · Waiting ${s.waiting} · Failed ${s.failed}")
                if (s.skipped > 0) append(" · Already there ${s.skipped}")
            }
            if (s.last.isNotEmpty()) append("\nLast: ${s.last}")
            if (s.error.isNotEmpty()) append("\n⚠ ${s.error}")
            if (partial) append("\n⚠ Only selected photos are shared with this app — allow access to all photos so new ones are found.")
        }
    }

    private fun photoPermission() =
        if (Build.VERSION.SDK_INT >= 33) Manifest.permission.READ_MEDIA_IMAGES else Manifest.permission.READ_EXTERNAL_STORAGE

    private fun hasPhotoAccess() = checkSelfPermission(photoPermission()) == PackageManager.PERMISSION_GRANTED

    private fun requestPermissionsIfNeeded() {
        val needed = mutableListOf<String>()
        if (!hasPhotoAccess()) needed += photoPermission()
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) needed += Manifest.permission.POST_NOTIFICATIONS
        if (needed.isNotEmpty()) requestPermissions(needed.toTypedArray(), 1)
    }

    private fun toast(message: String) = Toast.makeText(this, message, Toast.LENGTH_LONG).show()

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}
