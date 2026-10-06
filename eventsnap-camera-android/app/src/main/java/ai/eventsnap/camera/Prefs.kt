package ai.eventsnap.camera

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * App settings (private to this app). The password is stored only encrypted
 * with an AES key held in the Android Keystore, so the upload service can sign
 * in again when the 1-day session token expires.
 */
class Prefs(context: Context) {
    private val sp = context.getSharedPreferences("eventsnap_camera", Context.MODE_PRIVATE)

    var apiUrl: String
        get() = sp.getString("apiUrl", "") ?: ""
        set(v) = sp.edit().putString("apiUrl", v).apply()
    var email: String
        get() = sp.getString("email", "") ?: ""
        set(v) = sp.edit().putString("email", v).apply()
    var password: String
        get() = sp.getString("password", null)?.let { decrypt(it) } ?: ""
        set(v) = sp.edit().putString("password", encrypt(v)).apply()
    var token: String
        get() = sp.getString("token", "") ?: ""
        set(v) = sp.edit().putString("token", v).apply()

    var eventId: String
        get() = sp.getString("eventId", "") ?: ""
        set(v) = sp.edit().putString("eventId", v).apply()
    var eventName: String
        get() = sp.getString("eventName", "") ?: ""
        set(v) = sp.edit().putString("eventName", v).apply()

    /** Only photos in this gallery album (e.g. "Camera Connect"); blank = any. */
    var album: String
        get() = sp.getString("album", "") ?: ""
        set(v) = sp.edit().putString("album", v).apply()
    /** Also upload photos added to the phone earlier today. */
    var includeToday: Boolean
        get() = sp.getBoolean("includeToday", false)
        set(v) = sp.edit().putBoolean("includeToday", v).apply()
    /** Seconds since epoch when auto upload was started. */
    var startedAt: Long
        get() = sp.getLong("startedAt", 0)
        set(v) = sp.edit().putLong("startedAt", v).apply()
    /** The photographer wants auto upload on (restored if Android restarts the service). */
    var running: Boolean
        get() = sp.getBoolean("running", false)
        set(v) = sp.edit().putBoolean("running", v).apply()

    /** Gallery ids already uploaded to an event — never uploaded again. */
    fun uploadedIds(eventId: String): MutableSet<String> =
        HashSet(sp.getStringSet("uploaded_$eventId", emptySet()) ?: emptySet())

    fun saveUploadedIds(eventId: String, ids: Set<String>) =
        sp.edit().putStringSet("uploaded_$eventId", HashSet(ids)).apply()

    private fun key(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(
            KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build()
        )
        return gen.generateKey()
    }

    private fun encrypt(plain: String): String {
        val cipher = Cipher.getInstance(TRANSFORM)
        cipher.init(Cipher.ENCRYPT_MODE, key())
        return Base64.encodeToString(cipher.iv + cipher.doFinal(plain.toByteArray()), Base64.NO_WRAP)
    }

    private fun decrypt(stored: String): String? = try {
        val all = Base64.decode(stored, Base64.NO_WRAP)
        val cipher = Cipher.getInstance(TRANSFORM)
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, all, 0, IV_SIZE))
        String(cipher.doFinal(all, IV_SIZE, all.size - IV_SIZE))
    } catch (e: Exception) {
        null
    }

    private companion object {
        const val KEY_ALIAS = "eventsnap_camera_password"
        const val TRANSFORM = "AES/GCM/NoPadding"
        const val IV_SIZE = 12
    }
}
