package com.liambic.cyclehealth

import android.app.Activity
import android.content.Intent
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatterBuilder

class CycleHealthModule : Module() {
  private val permission = "android.permission.health.READ_SLEEP"
  private var pending: Promise? = null
  private val requestCode = 49371
  private val formatter = DateTimeFormatterBuilder().appendInstant(3).toFormatter()
  private fun context() = requireNotNull(appContext.reactContext) { "Reopen the app to use Health Connect." }
  private fun client(): HealthConnectClient {
    check(HealthConnectClient.getSdkStatus(context()) == HealthConnectClient.SDK_AVAILABLE) { "Health Connect is unavailable. Install or update it and retry." }
    return HealthConnectClient.getOrCreate(context())
  }
  override fun definition() = ModuleDefinition {
    Name("CycleHealthConnect")
    AsyncFunction("status") Coroutine { ->
      withContext(Dispatchers.IO) { withTimeout(15000) {
        when (HealthConnectClient.getSdkStatus(context())) {
          HealthConnectClient.SDK_UNAVAILABLE -> "unavailable"
          HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update-required"
          else -> if (client().permissionController.getGrantedPermissions().contains(permission)) "granted" else "not-granted"
        }
      } }
    }
    AsyncFunction("requestPermission") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null || pending != null) { promise.reject("SLEEP_BUSY","Return to the app and retry after closing any permission screen.",null) }
      else {
        pending = promise
        activity.runOnUiThread {
          try { activity.startActivityForResult(Intent(activity, SleepPermissionActivity::class.java),requestCode) }
          catch (_: Exception) { pending?.reject("SLEEP_PERMISSION","Could not open the sleep permission screen. Try Health Connect settings.",null); pending=null }
        }
      }
    }
    OnActivityResult { _, result ->
      if (result.requestCode == requestCode) { pending?.resolve(result.resultCode == Activity.RESULT_OK); pending=null }
    }
    OnDestroy { pending?.reject("SLEEP_CLOSED","The app closed. Reopen Health Connect settings to check access.",null); pending=null }
    AsyncFunction("disconnect") Coroutine { ->
      withContext(Dispatchers.IO) { withTimeout(15000) { client().permissionController.revokeAllPermissions() } }
    }
    AsyncFunction("openSettings") {
      context().startActivity(HealthConnectClient.getHealthConnectManageDataIntent(context()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    AsyncFunction("openPrivacy") {
      context().startActivity(Intent(context(),SleepPrivacyActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    AsyncFunction("readRecent") Coroutine { days: Int ->
      require(days == 7 || days == 30)
      withContext(Dispatchers.IO) { withTimeout(30000) {
        val health = client()
        check(health.permissionController.getGrantedPermissions().contains(permission)) { "Sleep permission is not granted. Review access in Health Connect." }
        val end = Instant.now()
        val start = end.minusSeconds(days.toLong()*86400)
        val imported = formatter.format(end)
        val result = mutableListOf<Map<String,Any?>>()
        var token: String? = null
        var pages = 0
        var stageCount = 0
        do {
          val page = health.readRecords(ReadRecordsRequest(SleepSessionRecord::class,TimeRangeFilter.between(start,end),pageSize=100,pageToken=token))
          for (record in page.records) {
            if (record.endTime.isAfter(end) || record.endTime.isBefore(start)) continue
            check(record.stages.size <= 3000 && result.size < 500) { "Too many sleep records. Choose 7 days or reduce overlapping source records." }
            stageCount += record.stages.size
            check(stageCount <= 20000) { "Too many sleep stages. Choose 7 days and retry." }
            val source = record.metadata.dataOrigin.packageName
            val name = try { val info=context().packageManager.getApplicationInfo(source,0); context().packageManager.getApplicationLabel(info).toString().take(256) } catch (_: Exception) { source }
            val device = record.metadata.device?.let { listOfNotNull(it.manufacturer,it.model).filter { label -> label.isNotBlank() }.joinToString(" ").take(256).ifBlank { null } }
            result.add(mapOf(
              "id" to record.metadata.id, "sourcePackage" to source, "sourceName" to name, "device" to device,
              "start" to formatter.format(record.startTime), "end" to formatter.format(record.endTime),
              "startOffset" to record.startZoneOffset?.totalSeconds?.div(60), "endOffset" to record.endZoneOffset?.totalSeconds?.div(60),
              "fallbackOffset" to ZoneId.systemDefault().rules.getOffset(record.endTime).totalSeconds/60,
              "modified" to formatter.format(record.metadata.lastModifiedTime), "imported" to imported,
              "stages" to record.stages.map { mapOf("start" to formatter.format(it.startTime), "end" to formatter.format(it.endTime), "type" to (if (it.stage in 0..7) it.stage else 0)) }
            ))
          }
          token=page.pageToken
          pages++
          check(pages <= 10 && (result.size < 500 || token == null)) { "Too many sleep records. Choose 7 days." }
        } while (token != null)
        check(health.permissionController.getGrantedPermissions().contains(permission)) { "Sleep access changed. Nothing was imported. Review permissions and retry." }
        result
      } }
    }
  }
}
