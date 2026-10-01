# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ONNX Runtime keep rules (JNI native methods and environment)
-keep class ai.onnxruntime.** { *; }
-keepclassmembers class ai.onnxruntime.** { *; }
-dontwarn ai.onnxruntime.**

# openWakeWord Android Kotlin wrapper keep rules
-keep class xyz.rementia.openwakeword.** { *; }
-keepclassmembers class xyz.rementia.openwakeword.** { *; }
-dontwarn xyz.rementia.openwakeword.**

# Jarvis native module, service, models, handlers & receivers
-keep class com.ritvik.jammusic.jarvis.** { *; }
-keepclassmembers class com.ritvik.jammusic.jarvis.** { *; }
-dontwarn com.ritvik.jammusic.jarvis.**

# Expo modules core reflection
-keep class expo.modules.** { *; }

