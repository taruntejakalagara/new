package com.valet.driver;

import android.app.PendingIntent;
import android.content.Intent;
import android.content.IntentFilter;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.Ndef;
import android.nfc.tech.NdefFormatable;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "ValetNFC";
    private NfcAdapter nfcAdapter;
    private PendingIntent pendingIntent;
    private IntentFilter[] intentFiltersArray;
    private String[][] techListsArray;
    
    // Static reference for plugin access
    private static MainActivity instance;
    private static Tag currentTag;
    
    public static MainActivity getInstance() {
        return instance;
    }
    
    public static Tag getCurrentTag() {
        return currentTag;
    }
    
    public static void clearCurrentTag() {
        currentTag = null;
    }
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d(TAG, "=== MainActivity onCreate ===");
        instance = this;
        
        // Register NFC plugin BEFORE super.onCreate()
        registerPlugin(com.valet.driver.nfc.NFCPlugin.class);
        
        super.onCreate(savedInstanceState);
        
        setupNFC();
    }
    
    private void setupNFC() {
        nfcAdapter = NfcAdapter.getDefaultAdapter(this);
        
        if (nfcAdapter == null) {
            Log.e(TAG, "❌ NFC is not available on this device");
            return;
        }
        
        if (!nfcAdapter.isEnabled()) {
            Log.w(TAG, "⚠️ NFC is disabled. Please enable it in settings.");
        }
        
        Log.d(TAG, "✅ NFC Adapter available and enabled");
        
        // Create PendingIntent for foreground dispatch
        Intent intent = new Intent(this, getClass()).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_MUTABLE);
        
        // Setup intent filters for all NFC tag types
        IntentFilter ndefFilter = new IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED);
        try {
            ndefFilter.addDataType("*/*");
        } catch (IntentFilter.MalformedMimeTypeException e) {
            Log.e(TAG, "Error setting MIME type", e);
        }
        
        IntentFilter tagFilter = new IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED);
        IntentFilter techFilter = new IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED);
        
        intentFiltersArray = new IntentFilter[] { ndefFilter, tagFilter, techFilter };
        
        // Tech list for tech discovered
        techListsArray = new String[][] {
            new String[] { Ndef.class.getName() },
            new String[] { NdefFormatable.class.getName() }
        };
        
        // Handle intent if app was launched by NFC
        handleIntent(getIntent());
    }
    
    @Override
    public void onResume() {
        super.onResume();
        
        if (nfcAdapter != null) {
            nfcAdapter.enableForegroundDispatch(this, pendingIntent, intentFiltersArray, techListsArray);
            Log.d(TAG, "✅ NFC Foreground dispatch ENABLED");
        }
    }
    
    @Override
    public void onPause() {
        super.onPause();
        
        if (nfcAdapter != null) {
            nfcAdapter.disableForegroundDispatch(this);
            Log.d(TAG, "NFC Foreground dispatch disabled");
        }
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Log.d(TAG, "📱 onNewIntent: " + intent.getAction());
        setIntent(intent);
        handleIntent(intent);
    }
    
    private void handleIntent(Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "📱 handleIntent action: " + action);
        
        if (NfcAdapter.ACTION_NDEF_DISCOVERED.equals(action) ||
            NfcAdapter.ACTION_TAG_DISCOVERED.equals(action) ||
            NfcAdapter.ACTION_TECH_DISCOVERED.equals(action)) {
            
            Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
            if (tag != null) {
                currentTag = tag;
                Log.d(TAG, "✅ NFC Tag detected and stored! ID: " + bytesToHex(tag.getId()));
                
                // Notify the WebView/JavaScript that a tag is available
                String js = "window.dispatchEvent(new CustomEvent('nfcTagDetected', { detail: { available: true } }));";
                getBridge().getWebView().post(() -> {
                    getBridge().getWebView().evaluateJavascript(js, null);
                });
            }
        }
    }
    
    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X", b));
        }
        return sb.toString();
    }
}