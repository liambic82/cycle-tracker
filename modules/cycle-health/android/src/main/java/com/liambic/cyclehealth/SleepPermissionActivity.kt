package com.liambic.cyclehealth

import android.app.Activity
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController

class SleepPermissionActivity : ComponentActivity() {
  private val permission = registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { granted ->
    setResult(if (granted.contains("android.permission.health.READ_SLEEP")) Activity.RESULT_OK else Activity.RESULT_CANCELED)
    finish()
  }
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (HealthConnectClient.getSdkStatus(this) != HealthConnectClient.SDK_AVAILABLE) { finish(); return }
    if (savedInstanceState == null) {
      try {
        val requested = mutableSetOf("android.permission.health.READ_SLEEP")
        if (intent.getBooleanExtra("history",false)) {
          if (HealthConnectClient.getOrCreate(this).features.getFeatureStatus(HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_HISTORY) != HealthConnectFeatures.FEATURE_STATUS_AVAILABLE) { finish(); return }
          requested.add("android.permission.health.READ_HEALTH_DATA_HISTORY")
        }
        permission.launch(requested)
      }
      catch (_: Exception) { finish() }
    }
  }
}
