package com.ritvik.jammusic.jarvis

import android.content.Context
import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import android.util.Log
import androidx.annotation.RequiresApi

/**
 * JarvisTileService — Android Quick Settings Tile for one-tap listening toggle.
 * Allows toggling Jarvis on/off directly from the notification shade without launching the app.
 */
@RequiresApi(Build.VERSION_CODES.N)
class JarvisTileService : TileService() {

    companion object {
        private const val TAG = "JarvisTileService"
    }

    override fun onStartListening() {
        super.onStartListening()
        updateTileState()
    }

    override fun onClick() {
        super.onClick()
        val isListening = JarvisListenerService.instance != null

        if (isListening) {
            Log.i(TAG, "Quick Settings Tile tapped: Stopping Jarvis listening")
            val stopIntent = Intent(this, JarvisListenerService::class.java).apply {
                action = JarvisListenerService.ACTION_STOP
            }
            startService(stopIntent)
            setTileInactive()
        } else {
            Log.i(TAG, "Quick Settings Tile tapped: Starting Jarvis listening")
            val startIntent = Intent(this, JarvisListenerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(startIntent)
            } else {
                startService(startIntent)
            }
            setTileActive()
        }
    }

    private fun updateTileState() {
        val isListening = JarvisListenerService.instance != null
        if (isListening) {
            setTileActive()
        } else {
            setTileInactive()
        }
    }

    private fun setTileActive() {
        val tile = qsTile ?: return
        tile.state = Tile.STATE_ACTIVE
        tile.label = "Jarvis"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            tile.subtitle = "Listening"
        }
        tile.updateTile()
    }

    private fun setTileInactive() {
        val tile = qsTile ?: return
        tile.state = Tile.STATE_INACTIVE
        tile.label = "Jarvis"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            tile.subtitle = "Off"
        }
        tile.updateTile()
    }
}
