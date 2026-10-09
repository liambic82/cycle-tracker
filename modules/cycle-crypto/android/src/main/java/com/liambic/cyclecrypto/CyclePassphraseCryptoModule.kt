package com.liambic.cyclecrypto

import android.os.Build
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class CyclePassphraseCryptoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CyclePassphraseCrypto")
    Constants("supported" to (Build.VERSION.SDK_INT >= 26))

    AsyncFunction("derive") Coroutine { password: List<Int>, salt: List<Int> ->
      require(password.size <= 3072 && salt.size == 16)
      require(password.all { it in 0..255 } && salt.all { it in 0..255 })
      withContext(Dispatchers.Default) {
        val key = PassphraseKdf.derive(
          password.map { it.toByte() }.toByteArray(),
          salt.map { it.toByte() }.toByteArray()
        )
        try { key.map { it.toInt() and 0xff } }
        finally { key.fill(0) }
      }
    }
  }
}
