package com.fitpulse.app

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*
import java.util.Calendar

class StepTrackerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "StepTrackerModule"
    }

    @ReactMethod
    fun startStepService() {
        val context = reactApplicationContext
        val intent = Intent(context, StepTrackerService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        } catch (e: Exception) {
            System.err.println("Failed to start StepTrackerService: " + e.message)
        }
    }

    @ReactMethod
    fun getTodaySteps(promise: Promise) {
        val prefs = reactApplicationContext.getSharedPreferences("StepTrackerPrefs", Context.MODE_PRIVATE)
        val todaySteps = prefs.getInt("today_steps", 0)
        promise.resolve(todaySteps)
    }

    @ReactMethod
    fun simulateSteps(amount: Int) {
        val prefs = reactApplicationContext.getSharedPreferences("StepTrackerPrefs", Context.MODE_PRIVATE)
        val todaySteps = prefs.getInt("today_steps", 0)
        
        prefs.edit()
            .putInt("today_steps", todaySteps + amount)
            .apply()

        // Restart/Refresh the service to show new count in the ongoing notification
        val context = reactApplicationContext
        val intent = Intent(context, StepTrackerService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        } catch (e: Exception) {
            System.err.println("Failed to refresh StepTrackerService after simulation: " + e.message)
        }
    }

    @ReactMethod
    fun resetSteps() {
        val prefs = reactApplicationContext.getSharedPreferences("StepTrackerPrefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putInt("today_steps", 0)
            .apply()

        // Restart/Refresh the service to show 0 steps in the ongoing notification
        val context = reactApplicationContext
        val intent = Intent(context, StepTrackerService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        } catch (e: Exception) {
            System.err.println("Failed to refresh StepTrackerService after reset: " + e.message)
        }
    }

    @ReactMethod
    fun setStepGoal(goal: Int) {
        val prefs = reactApplicationContext.getSharedPreferences("StepTrackerPrefs", Context.MODE_PRIVATE)
        prefs.edit().putInt("daily_step_goal", goal).apply()
    }

    @ReactMethod
    fun checkUsagePermission(promise: Promise) {
        val context = reactApplicationContext
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                context.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                context.packageName
            )
        }
        promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
    }

    @ReactMethod
    fun openUsageSettings() {
        val context = reactApplicationContext
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    }

    @ReactMethod
    fun getAppUsage(packageNames: ReadableArray, promise: Promise) {
        val context = reactApplicationContext
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        
        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val startTime = cal.timeInMillis
        val endTime = System.currentTimeMillis()
        
        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            startTime,
            endTime
        )
        
        val resultMap = Arguments.createMap()
        
        // Initialize all requested packages with 0 minutes
        for (i in 0 until packageNames.size()) {
            val pkg = packageNames.getString(i)
            if (pkg != null) {
                resultMap.putDouble(pkg, 0.0)
            }
        }
        
        if (stats != null) {
            for (usageStats in stats) {
                val pkgName = usageStats.packageName
                // Convert totalTimeInForeground from ms to minutes
                val usageMins = usageStats.totalTimeInForeground.toDouble() / (1000.0 * 60.0)
                
                // If it is one of the requested packages, update the map
                for (i in 0 until packageNames.size()) {
                    if (pkgName == packageNames.getString(i)) {
                        resultMap.putDouble(pkgName, usageMins)
                    }
                }
            }
        }
        
        promise.resolve(resultMap)
    }

    @ReactMethod
    fun saveAppLimit(packageName: String, limitMins: Int, isEnabled: Boolean) {
        val prefs = reactApplicationContext.getSharedPreferences("StepTrackerPrefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putInt("limit_mins_$packageName", limitMins)
            .putBoolean("limit_enabled_$packageName", isEnabled)
            .apply()
    }
}
