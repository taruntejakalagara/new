package com.valet.driver.nfc;

import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.Tag;
import android.nfc.tech.Ndef;
import android.nfc.tech.NdefFormatable;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;
import com.valet.driver.MainActivity;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

@CapacitorPlugin(name = "NFCPlugin")
public class NFCPlugin extends Plugin {
    private static final String TAG = "NFCPlugin";

    @Override
    public void load() {
        Log.d(TAG, "✅ NFCPlugin loaded");
    }

    @PluginMethod
    public void isSupported(PluginCall call) {
        boolean supported = MainActivity.getInstance() != null;
        Log.d(TAG, "isSupported: " + supported);
        
        JSObject result = new JSObject();
        result.put("supported", supported);
        call.resolve(result);
    }

    @PluginMethod
    public void read(PluginCall call) {
        Log.d(TAG, "📖 Read requested");
        
        Tag tag = MainActivity.getCurrentTag();
        
        if (tag == null) {
            Log.e(TAG, "❌ No tag available");
            call.reject("No NFC tag detected. Please tap a card.");
            return;
        }

        try {
            String content = readNdefFromTag(tag);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("hasData", content != null && !content.isEmpty());
            result.put("content", content != null ? content : "");
            result.put("isSmartValetCard", content != null && content.contains("/v/"));
            
            if (content != null && content.contains("/v/")) {
                String cardId = content.substring(content.lastIndexOf("/v/") + 3);
                result.put("cardId", cardId);
                Log.d(TAG, "✅ Smart Valet Card detected: " + cardId);
            }
            
            Log.d(TAG, "✅ Read success: " + content);
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Read error", e);
            call.reject("Error reading NFC tag: " + e.getMessage());
        }
    }

    @PluginMethod
    public void write(PluginCall call) {
        String url = call.getString("url");
        String cardId = call.getString("cardId");
        
        Log.d(TAG, "✍️ Write requested - URL: " + url);
        
        if (url == null || url.isEmpty()) {
            call.reject("URL is required");
            return;
        }

        Tag tag = MainActivity.getCurrentTag();
        
        if (tag == null) {
            Log.e(TAG, "❌ No tag available for writing");
            call.reject("No NFC tag detected. Please tap a card.");
            return;
        }

        try {
            boolean success = writeNdefToTag(tag, url);
            
            JSObject result = new JSObject();
            result.put("success", success);
            
            if (success) {
                result.put("cardId", cardId);
                result.put("url", url);
                Log.d(TAG, "✅ Write success!");
                
                // Clear the tag after successful write so next operation needs fresh tap
                MainActivity.clearCurrentTag();
            }
            
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Write error", e);
            call.reject("Error writing NFC tag: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        Log.d(TAG, "🗑️ Clear requested");

        Tag tag = MainActivity.getCurrentTag();
        
        if (tag == null) {
            call.reject("No NFC tag detected. Please tap a card.");
            return;
        }

        try {
            boolean success = clearNdefFromTag(tag);
            
            JSObject result = new JSObject();
            result.put("success", success);
            
            if (success) {
                Log.d(TAG, "✅ Clear success!");
                MainActivity.clearCurrentTag();
            }
            
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Clear error", e);
            call.reject("Error clearing NFC tag: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void hasTag(PluginCall call) {
        boolean hasTag = MainActivity.getCurrentTag() != null;
        Log.d(TAG, "hasTag: " + hasTag);
        
        JSObject result = new JSObject();
        result.put("hasTag", hasTag);
        call.resolve(result);
    }

    private String readNdefFromTag(Tag tag) throws Exception {
        Ndef ndef = Ndef.get(tag);
        
        if (ndef == null) {
            Log.d(TAG, "Tag is not NDEF formatted (might be blank)");
            return null;
        }
        
        ndef.connect();
        NdefMessage message = ndef.getNdefMessage();
        ndef.close();
        
        if (message == null || message.getRecords().length == 0) {
            Log.d(TAG, "No NDEF message on tag");
            return null;
        }
        
        NdefRecord record = message.getRecords()[0];
        byte[] payload = record.getPayload();
        
        // Handle URI record (TNF_WELL_KNOWN with RTD_URI)
        if (record.getTnf() == NdefRecord.TNF_WELL_KNOWN &&
            Arrays.equals(record.getType(), NdefRecord.RTD_URI)) {
            
            byte prefixCode = payload[0];
            String prefix = getUriPrefix(prefixCode);
            String uri = prefix + new String(payload, 1, payload.length - 1, StandardCharsets.UTF_8);
            Log.d(TAG, "Read URI: " + uri);
            return uri;
        }
        
        // Handle text record
        if (record.getTnf() == NdefRecord.TNF_WELL_KNOWN &&
            Arrays.equals(record.getType(), NdefRecord.RTD_TEXT)) {
            
            // Text record format: [status byte][language code][text]
            int languageCodeLength = payload[0] & 0x3F;
            String text = new String(payload, 1 + languageCodeLength, 
                                     payload.length - 1 - languageCodeLength, StandardCharsets.UTF_8);
            Log.d(TAG, "Read text: " + text);
            return text;
        }
        
        // Fallback: try to read as plain bytes
        String content = new String(payload, StandardCharsets.UTF_8);
        Log.d(TAG, "Read raw content: " + content);
        return content;
    }

    private boolean writeNdefToTag(Tag tag, String url) throws Exception {
        NdefRecord uriRecord = NdefRecord.createUri(url);
        NdefMessage message = new NdefMessage(new NdefRecord[]{ uriRecord });
        
        Ndef ndef = Ndef.get(tag);
        
        if (ndef != null) {
            ndef.connect();
            
            if (!ndef.isWritable()) {
                ndef.close();
                throw new Exception("Tag is read-only");
            }
            
            int size = message.toByteArray().length;
            if (ndef.getMaxSize() < size) {
                ndef.close();
                throw new Exception("Tag capacity is " + ndef.getMaxSize() + " bytes, message is " + size + " bytes");
            }
            
            ndef.writeNdefMessage(message);
            ndef.close();
            Log.d(TAG, "✅ Written to NDEF tag");
            return true;
            
        } else {
            // Try to format the tag
            NdefFormatable formatable = NdefFormatable.get(tag);
            
            if (formatable != null) {
                formatable.connect();
                formatable.format(message);
                formatable.close();
                Log.d(TAG, "✅ Formatted and written to tag");
                return true;
            } else {
                throw new Exception("Tag doesn't support NDEF");
            }
        }
    }

    private boolean clearNdefFromTag(Tag tag) throws Exception {
        // Write an empty NDEF message
        NdefRecord emptyRecord = new NdefRecord(NdefRecord.TNF_EMPTY, new byte[0], new byte[0], new byte[0]);
        NdefMessage emptyMessage = new NdefMessage(new NdefRecord[]{ emptyRecord });
        
        Ndef ndef = Ndef.get(tag);
        
        if (ndef != null) {
            ndef.connect();
            ndef.writeNdefMessage(emptyMessage);
            ndef.close();
            return true;
        }
        
        return false;
    }

    private String getUriPrefix(byte code) {
        switch (code) {
            case 0x00: return "";
            case 0x01: return "http://www.";
            case 0x02: return "https://www.";
            case 0x03: return "http://";
            case 0x04: return "https://";
            case 0x05: return "tel:";
            case 0x06: return "mailto:";
            default: return "";
        }
    }
}
