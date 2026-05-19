1. Android Studio + NDK

Buka Android Studio → Settings → Languages & Frameworks → Android SDK:

SDK Platforms: Android SDK Platform (API 34 atau 35)
SDK Tools (centang Show Package Details jika perlu):
Android SDK Build-Tools
Android SDK Platform-Tools
Android SDK Command-line Tools
NDK (Side by side)


2. Environment variables (tambahkan ke ~/.zshrc):

export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 "$ANDROID_HOME/ndk" | tail -1)"
export PATH="$PATH:$ANDROID_HOME/platform-tools"


3. Rust targets untuk Android:

rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
Untuk tablet modern, biasanya cukup aarch64 (ARM 64-bit).


Dari folder proyek:

cd ~./EasyBook
bun tauri android init
Ini membuat folder src-tauri/gen/android/ (Gradle/Android Studio project). Tanpa ini, build akan gagal
Opsional non-interaktif: bun tauri android init --ci


Uji di emulator / tablet (development)
# Pastikan tablet/emulator terhubung
adb devices
# Jalankan app di device
bun tauri android dev
Perintah ini build + install + hot-reload (mirip tauri dev di desktop).


Build untuk dipasang di tablet
APK (langsung install ke tablet, tanpa Play Store):
bun tauri android build -- --apk

AAB (untuk Google Play):
bun tauri android build -- --aab

Hanya ARM 64 (lebih cepat, cocok untuk tablet):
bun tauri android build -- --apk --target aarch64
