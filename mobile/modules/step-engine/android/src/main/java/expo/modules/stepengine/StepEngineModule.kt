package expo.modules.stepengine

import android.Manifest
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * 걸음 엔진 — 캐시워크 방식.
 *
 * 폰의 하드웨어 걸음 칩(TYPE_STEP_COUNTER)은 앱과 무관하게 부팅 후부터 계속
 * 누적으로 걸음을 센다. 이 모듈은 그 값을 직접 읽어 삼성헬스/헬스커넥트
 * 의존 없이 걸음을 집계한다. 잠금화면 서비스(StepForegroundService)를 켜면
 * 앱이 꺼져 있어도 알림으로 오늘 걸음을 보여준다.
 */
class StepEngineModule : Module() {

  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("StepEngine")

    /** 걸음 칩이 있는 기기인지 (모든 최신 갤럭시는 true) */
    Function("hasStepSensor") {
      val sm = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
      sm?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null
    }

    /**
     * 부팅 이후 칩이 누적한 걸음 수.
     * 센서가 4초 안에 응답하지 않으면 서비스가 마지막으로 관측한 값, 그것도 없으면 null.
     */
    AsyncFunction("getCumulativeSteps") { promise: Promise ->
      val sm = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
      val sensor = sm?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
      if (sm == null || sensor == null) {
        promise.resolve(null)
        return@AsyncFunction
      }
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val handler = Handler(Looper.getMainLooper())
      var done = false
      val listener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent) {
          if (done) return
          done = true
          sm.unregisterListener(this)
          val cum = event.values[0]
          prefs.edit().putFloat(KEY_LAST_CUM, cum).apply()
          promise.resolve(cum.toDouble())
        }
        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
      }
      sm.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_UI)
      sm.flush(listener)
      handler.postDelayed({
        if (!done) {
          done = true
          sm.unregisterListener(listener)
          val cached = prefs.getFloat(KEY_LAST_CUM, -1f)
          if (cached >= 0f) promise.resolve(cached.toDouble()) else promise.resolve(null)
        }
      }, 4000)
    }

    /** 걸음(활동) + 알림 권한을 한 번에 요청 */
    AsyncFunction("requestPermissions") { promise: Promise ->
      val perms = mutableListOf<String>()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        perms.add(Manifest.permission.ACTIVITY_RECOGNITION)
      }
      if (Build.VERSION.SDK_INT >= 33) {
        perms.add(Manifest.permission.POST_NOTIFICATIONS)
      }
      if (perms.isEmpty()) {
        Permissions.askForPermissionsWithPermissionsManager(appContext.permissions, promise)
      } else {
        Permissions.askForPermissionsWithPermissionsManager(
          appContext.permissions, promise, *perms.toTypedArray()
        )
      }
    }

    /** 걸음(활동) 권한이 이미 허용돼 있는지 */
    AsyncFunction("getPermissions") { promise: Promise ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        Permissions.getPermissionsWithPermissionsManager(
          appContext.permissions, promise, Manifest.permission.ACTIVITY_RECOGNITION
        )
      } else {
        Permissions.getPermissionsWithPermissionsManager(appContext.permissions, promise)
      }
    }

    /** 잠금화면 걸음 서비스 시작 (앱이 포그라운드일 때 호출해야 함) */
    Function("startLockScreenService") {
      val intent = Intent(context, StepForegroundService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    Function("stopLockScreenService") {
      context.stopService(Intent(context, StepForegroundService::class.java))
    }

    Function("isServiceRunning") {
      StepForegroundService.running
    }

    /** 서비스가 세어 둔 잠금해제(기척) 횟수 — 읽는 순간 0으로 리셋 */
    Function("takeUnlockCount") {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val n = prefs.getInt(KEY_UNLOCKS, 0)
      if (n != 0) prefs.edit().putInt(KEY_UNLOCKS, 0).apply()
      n
    }
  }

  companion object {
    const val PREFS = "jjn_step_engine"
    const val KEY_UNLOCKS = "unlock_count"
    const val KEY_LAST_CUM = "last_cumulative"
    const val KEY_DAY = "day_stamp"
    const val KEY_DAY_BASE = "day_base"
  }
}
