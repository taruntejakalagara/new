/**
 * NFC Plugin Wrapper
 * Compatible with Capacitor custom plugin
 */
import { registerPlugin, Capacitor } from '@capacitor/core';

// Define the interface for our custom plugin
const NFCPlugin = registerPlugin('NFCPlugin');

/**
 * NFCPluginWrapper - Abstraction layer for NFC operations
 * Works on both Android (native) and web (simulated)
 */
export const NFCPluginWrapper = {
  /**
   * Check if NFC is supported
   */
  isSupported: async () => {
    if (Capacitor.getPlatform() === 'web') {
      return { supported: false };
    }
    
    try {
      const result = await NFCPlugin.isSupported();
      return result;
    } catch (error) {
      console.error('NFC isSupported error:', error);
      return { supported: false };
    }
  },

  /**
   * Read NDEF data from NFC tag
   */
  readNdef: async () => {
    if (Capacitor.getPlatform() === 'web') {
      // Simulate for web testing
      console.log('📱 NFC: Web simulation - returning empty read');
      return {
        success: true,
        hasData: false,
        content: '',
        isSmartValetCard: false,
      };
    }

    try {
      const result = await NFCPlugin.read();
      console.log('📱 NFC read result:', result);
      return result;
    } catch (error) {
      console.error('NFC read error:', error);
      throw error;
    }
  },

  /**
   * Write NDEF data to NFC tag
   * @param {Object} options - { data: string } - URL or text to write
   */
  writeNdef: async (options) => {
    if (Capacitor.getPlatform() === 'web') {
      // Simulate for web testing
      console.log('📱 NFC: Web simulation - write success');
      return { success: true };
    }

    try {
      const result = await NFCPlugin.write({ url: options.data });
      console.log('📱 NFC write result:', result);
      return result;
    } catch (error) {
      console.error('NFC write error:', error);
      throw error;
    }
  },

  /**
   * Clear NDEF data from NFC tag
   */
  clearNdef: async () => {
    if (Capacitor.getPlatform() === 'web') {
      // Simulate for web testing
      console.log('📱 NFC: Web simulation - clear success');
      return { success: true };
    }

    try {
      const result = await NFCPlugin.clear();
      console.log('📱 NFC clear result:', result);
      return result;
    } catch (error) {
      console.error('NFC clear error:', error);
      throw error;
    }
  },

  /**
   * Start NFC listener (for compatibility)
   */
  startNFCListener: async () => {
    return NFCPluginWrapper.isSupported();
  },

  /**
   * Stop NFC listener (for compatibility)
   */
  stopNFCListener: async () => {
    return Promise.resolve();
  },
};

export { NFCPlugin };
export default NFCPluginWrapper;
