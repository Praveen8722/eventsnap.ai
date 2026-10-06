package ai.eventsnap.camera

import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

/** An API error with the backend's HTTP status and message. */
class ApiException(val status: Int, message: String) : Exception(message)

data class EventInfo(val id: String, val name: String, val date: String, val slug: String)

/** One photo to upload (read from the gallery). */
class PhotoUpload(val name: String, val mimeType: String, val bytes: ByteArray)

/**
 * The existing EventSnap backend API — the same routes the dashboard uses:
 * POST /api/auth/login, GET /api/create-events, GET /api/create-events/:id/photos,
 * POST /api/create-events/:id/photos (multipart "photos"). The owner is always
 * taken from the JWT by the backend.
 */
class Api(baseUrl: String) {
    private val base = baseUrl.trim().trimEnd('/')
    var token: String? = null

    fun login(email: String, password: String): String {
        val body = JSONObject().put("email", email).put("password", password).toString().toByteArray()
        val res = request("POST", "/api/auth/login", body, "application/json", auth = false)
        val t = res.optString("token")
        if (t.isEmpty()) throw ApiException(401, res.optString("message", "Sign in failed"))
        token = t
        return t
    }

    fun events(): List<EventInfo> {
        val arr = request("GET", "/api/create-events/").getJSONArray("events")
        return (0 until arr.length()).map {
            val e = arr.getJSONObject(it)
            EventInfo(e.getString("id"), e.getString("name"), e.optString("date"), e.optString("slug"))
        }
    }

    /** "originalName|size" of every photo already in the event. */
    fun photoKeys(eventId: String): MutableSet<String> {
        val arr = request("GET", "/api/create-events/$eventId/photos").getJSONArray("photos")
        return (0 until arr.length()).mapTo(HashSet()) {
            val p = arr.getJSONObject(it)
            "${p.optString("originalName")}|${p.optLong("size")}"
        }
    }

    fun upload(eventId: String, photos: List<PhotoUpload>) {
        val boundary = "----EventSnap${UUID.randomUUID()}"
        val out = ByteArrayOutputStream()
        for (p in photos) {
            val safeName = p.name.replace("\"", "_").replace("\r", "").replace("\n", "")
            out.write(
                ("--$boundary\r\n" +
                    "Content-Disposition: form-data; name=\"photos\"; filename=\"$safeName\"\r\n" +
                    "Content-Type: ${p.mimeType}\r\n\r\n").toByteArray()
            )
            out.write(p.bytes)
            out.write("\r\n".toByteArray())
        }
        out.write("--$boundary--\r\n".toByteArray())
        request("POST", "/api/create-events/$eventId/photos", out.toByteArray(), "multipart/form-data; boundary=$boundary")
    }

    private fun request(
        method: String,
        path: String,
        body: ByteArray? = null,
        contentType: String? = null,
        auth: Boolean = true,
    ): JSONObject {
        val conn = URL(base + path).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = method
            conn.connectTimeout = 15_000
            conn.readTimeout = 120_000
            if (auth) token?.let { conn.setRequestProperty("Authorization", "Bearer $it") }
            if (body != null) {
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", contentType)
                conn.setFixedLengthStreamingMode(body.size)
                conn.outputStream.use { it.write(body) }
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
            val json = try {
                JSONObject(text)
            } catch (e: Exception) {
                JSONObject()
            }
            if (code !in 200..299) throw ApiException(code, json.optString("message", "Request failed ($code)"))
            return json
        } finally {
            conn.disconnect()
        }
    }
}
