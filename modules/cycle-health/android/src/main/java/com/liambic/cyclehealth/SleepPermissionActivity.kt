package com.liambic.cyclehealth

import android.app.Activity
import android.os.Bundle
import androidx.activity.ComponentActivity
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
      try { permission.launch(setOf("android.permission.health.READ_SLEEP")) }
      catch (_: Exception) { finish() }
    }
  }
}
