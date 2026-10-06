plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Plain Android SDK only — no AndroidX or third-party libraries.
android {
    namespace = "ai.eventsnap.camera"
    compileSdk = 35

    defaultConfig {
        applicationId = "ai.eventsnap.camera"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}
