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
    title = "Trifelle · privacy"
    val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(32,48,32,48) }
    layout.addView(TextView(this).apply {
      textSize = 18f
      text = PrivacyPolicyText.TEXT
    })
    layout.addView(Button(this).apply { text = "Close"; setOnClickListener { finish() } })
    setContentView(ScrollView(this).apply { addView(layout) })
  }
}
