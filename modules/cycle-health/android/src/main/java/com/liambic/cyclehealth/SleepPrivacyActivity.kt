package com.liambic.cyclehealth

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

// Public rationale shows static policy only, including when the journal is locked.
class SleepPrivacyActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    title = "Cycle Tracker · sleep data"
    val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(32,48,32,48) }
    layout.addView(TextView(this).apply {
      textSize = 18f
      text = "Cycle Tracker sleep privacy\n\nUpdated October 16, 2026\n\nSleep access is optional. We read sleep sessions, stages, source identifiers, available device labels and time-zone offsets from Android Health Connect when you load sessions, or automatically after unlocking if you enable Import when I unlock for a chosen source. Automatic checks read up to 30 recent days only while the app is active and unlocked. There are no locked-app or background reads. Older sleep history requires a separate optional permission on supported phones. We do not read other health types or write records to Health Connect.\n\nManual imports are reviewed first. Optional import on unlock saves new non-overlapping sessions from your chosen source; changes and overlaps need review. Imported copies are encrypted in your local journal. Manual sleep entries are kept separately. Unselected previews are temporary and cleared when you leave or background the import screen.\n\nThere is no Cycle Tracker server, account, advertising or analytics. Fitbit, Google and other source apps have their own data practices. This app does not receive your Fitbit password.\n\nEncrypted backups include imported copies. Journal CSV and a doctor PDF with Sleep selected contain readable imported observations and source details. You choose whether to export and where to share them.\n\nYou can revoke access in Health Connect, or use Disconnect in Cycle Tracker. Revocation stops future reads; copies already imported remain in your journal. Remove copies from a daily entry, or delete the journal, to remove them locally. Removed source records are excluded from automatic import until you manually reimport them. Restoring a backup turns automatic import off. Backups and exports saved elsewhere remain separate. Source corrections and deletions do not silently replace or erase your copies; review updates or remove old copies yourself.\n\nThis is a development preview. Questions or data requests: contact the project owner through github.com/liambic82/cycle-tracker."
    })
    layout.addView(Button(this).apply { text = "Close"; setOnClickListener { finish() } })
    setContentView(ScrollView(this).apply { addView(layout) })
  }
}
