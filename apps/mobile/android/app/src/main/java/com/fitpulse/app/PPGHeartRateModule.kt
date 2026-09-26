package com.fitpulse.app

import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class PPGHeartRateModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "PPGHeartRateModule"
    }

    @ReactMethod
    fun measureHeartRate(promise: Promise) {
        val context = reactApplicationContext
        
        // Save the promise to be resolved by the activity when completed
        PPGHeartRateActivity.ppgPromise = promise
        
        try {
            val intent = Intent(context, PPGHeartRateActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            promise.reject("ACTIVITY_LAUNCH_FAILED", e.message)
        }
    }
}
