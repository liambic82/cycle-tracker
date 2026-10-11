package com.liambic.cyclewidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

// Static launcher shortcut only. No vault access, records, keys, dates or background reads.
class JournalWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    for (id in ids) {
      val intent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: continue
      intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      val action = PendingIntent.getActivity(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      val view = RemoteViews(context.packageName, R.layout.cycle_journal_widget)
      view.setOnClickPendingIntent(R.id.cycle_widget_root, action)
      manager.updateAppWidget(id, view)
    }
  }
}
