package com.fitpulse.app

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationCompat
import java.text.SimpleDateFormat
import java.util.*

class StepTrackerService : Service(), SensorEventListener {

    private lateinit var sensorManager: SensorManager
    private var stepSensor: Sensor? = null
    private var accelSensor: Sensor? = null
    private lateinit var prefs: SharedPreferences
    
    private var usageHandler: Handler? = null
    private val usageRunnable = object : Runnable {
        override fun run() {
            checkAppBoundariesLimits()
            usageHandler?.postDelayed(this, 60000)
        }
    }
    
    private var lastStepTime: Long = 0
    private var isPeak = false
    private var lastStepCounterEventTime: Long = 0
    private var lastSensorSteps = -1

    companion object {
        const val CHANNEL_ID = "StepTrackerChannel"
        const val NOTIFICATION_ID = 101
    }

    override fun onCreate() {
        super.onCreate()
        prefs = getSharedPreferences("StepTrackerPrefs", Context.MODE_PRIVATE)
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        accelSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

        createNotificationChannel()
        
        // Start foreground service with health service type for Android 14+ compatibility
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID, 
                buildNotification(getTodaySteps()), 
                ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH
            )
        } else {
            startForeground(NOTIFICATION_ID, buildNotification(getTodaySteps()))
        }

        // Register hardware step counter (highly accurate, batch updates)
        stepSensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
        }
        
        // ALWAYS register accelerometer peak detection as real-time/silent fallback
        accelSensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }

        // Start usage stats monitoring loop
        startUsageMonitoringLoop()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null) return
        
        val now = System.currentTimeMillis()

        if (event.sensor.type == Sensor.TYPE_STEP_COUNTER) {
            val totalSensorSteps = event.values[0].toInt()
            lastStepCounterEventTime = now
            
            // If it's not the first reading, calculate delta
            if (lastSensorSteps != -1) {
                val delta = totalSensorSteps - lastSensorSteps
                if (delta > 0) {
                    incrementTodaySteps(delta)
                }
            }
            lastSensorSteps = totalSensorSteps
        } else if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]
            
            val magnitude = Math.sqrt((x * x + y * y + z * z).toDouble())
            
            // Peak detection: acceleration magnitude > 12.8 m/s^2 (~1.3g) with a 350ms spacing
            if (magnitude > 12.8 && !isPeak && (now - lastStepTime > 350)) {
                isPeak = true
                lastStepTime = now
                
                // If the hardware step counter has NOT sent any event in the last 8 seconds,
                // we use the accelerometer to count steps. This is the perfect self-healing fallback!
                if (now - lastStepCounterEventTime > 8000) {
                    incrementTodaySteps(1)
                }
            }
            
            if (magnitude < 9.5) {
                isPeak = false
            }
        }
    }

    private fun incrementTodaySteps(amount: Int) {
        val today = SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(Date())
        val savedDate = prefs.getString("last_date", "")
        
        var todaySteps = prefs.getInt("today_steps", 0)
        
        if (savedDate != today) {
            todaySteps = 0
            prefs.edit()
                .putString("last_date", today)
                .putInt("initial_steps", -1)
                .putBoolean("steps_goal_notified_$today", false)
                .apply()
        }
        
        todaySteps += amount
        prefs.edit().putInt("today_steps", todaySteps).apply()

        // Verify if steps goal is reached to trigger automatic ringtone/vibration
        val goal = prefs.getInt("daily_step_goal", 10000)
        val hasNotified = prefs.getBoolean("steps_goal_notified_$today", false)
        if (todaySteps >= goal && !hasNotified) {
            prefs.edit().putBoolean("steps_goal_notified_$today", true).apply()
            triggerStepsGoalNotification()
        }

        // Update notification
        val notification = buildNotification(todaySteps)
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun triggerStepsGoalNotification() {
        val channelId = "FitPulseGoalCelebrationChannel"
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Goal Achievements",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Plays ringtone when daily targets are met"
                enableLights(true)
                enableVibration(true)
            }
            manager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Steps Goal Achieved! 🏆🚶")
            .setContentText("Awesome! You reached your daily target steps!")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(Notification.DEFAULT_ALL) // Plays default system ringtone & vibrates
            .build()

        manager.notify(102, notification)
     }

    private fun getTodaySteps(): Int {
        return prefs.getInt("today_steps", 0)
    }

    private fun buildNotification(steps: Int): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("FitPulse Active Tracker")
            .setContentText("Today: $steps steps")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Step Tracker Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps tracking steps in background"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        usageHandler?.removeCallbacks(usageRunnable)
    }

    private fun startUsageMonitoringLoop() {
        usageHandler = Handler(Looper.getMainLooper())
        usageHandler?.post(usageRunnable)
    }

    private fun checkAppBoundariesLimits() {
        if (!hasUsageStatsPermission()) return
        
        val apps = mapOf(
            "com.instagram.android" to "Instagram",
            "com.google.android.youtube" to "YouTube",
            "com.zhiliaoapp.musically" to "TikTok",
            "com.ss.android.ugc.trill" to "TikTok",
            "com.facebook.katana" to "Facebook"
        )
        
        val today = SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(Date())
        
        for ((pkg, name) in apps) {
            val limitEnabled = prefs.getBoolean("limit_enabled_$pkg", false)
            val limitMins = prefs.getInt("limit_mins_$pkg", -1)
            
            if (limitEnabled && limitMins > 0) {
                val usageMins = (getAppUsageTime(pkg) / (1000 * 60)).toInt()
                if (usageMins >= limitMins) {
                    val alreadyNotified = prefs.getBoolean("boundary_notified_${pkg}_$today", false)
                    if (!alreadyNotified) {
                        prefs.edit().putBoolean("boundary_notified_${pkg}_$today", true).apply()
                        triggerBoundaryNotification(name, limitMins)
                    }
                }
            }
        }
    }

    private fun getAppUsageTime(packageName: String): Long {
        val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
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
        
        if (stats != null) {
            for (usageStats in stats) {
                if (usageStats.packageName == packageName) {
                    return usageStats.totalTimeInForeground
                }
            }
        }
        return 0L
    }

    private fun hasUsageStatsPermission(): Boolean {
        val appOps = getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    private fun triggerBoundaryNotification(appName: String, limitMins: Int) {
        val channelId = "FitPulseBoundaryChannel"
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "App Limits",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Plays alert when app screen time limits are exceeded"
                enableLights(true)
                enableVibration(true)
            }
            manager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Screen Limit Reached! 📱")
            .setContentText("You have reached your daily limit of $limitMins mins for $appName.")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(Notification.DEFAULT_ALL) // plays standard ringtone and vibrates
            .build()

        manager.notify(202, notification)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    override fun onBind(intent: Intent?): IBinder? = null
}
