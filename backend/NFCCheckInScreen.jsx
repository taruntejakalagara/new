import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView
} from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

// ⚠️ CHANGE THIS TO YOUR BACKEND IP ADDRESS
const API_URL = 'http://YOUR_COMPUTER_IP:4000/api';
// For testing: http://10.0.2.2:4000/api (Android Emulator)
// Or your actual IP: http://valet.localXXX:4000/api

const NFCCheckInScreen = ({ navigation }) => {
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  const [cardId, setCardId] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [assignedHook, setAssignedHook] = useState(null);

  useEffect(() => {
    initNFC();
    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    };
  }, []);

  const initNFC = async () => {
    try {
      const supported = await NfcManager.isSupported();
      setNfcSupported(supported);

      if (supported) {
        await NfcManager.start();
        const enabled = await NfcManager.isEnabled();
        setNfcEnabled(enabled);
      }
    } catch (error) {
      console.error('NFC Init Error:', error);
    }
  };

  const readNFC = async () => {
    if (!nfcSupported) {
      Alert.alert('NFC Not Supported', 'This device does not support NFC');
      return;
    }

    if (!nfcEnabled) {
      Alert.alert('NFC Disabled', 'Please enable NFC in settings', [
        { text: 'Cancel' },
        { text: 'Open Settings', onPress: () => NfcManager.goToNfcSetting() }
      ]);
      return;
    }

    try {
      setIsScanning(true);
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      let uniqueId = '';
      
      if (Platform.OS === 'android') {
        uniqueId = tag.id;
      } else if (Platform.OS === 'ios') {
        uniqueId = tag.id || tag.identifier;
      }

      if (tag.ndefMessage && tag.ndefMessage.length > 0) {
        try {
          const ndefRecord = tag.ndefMessage[0];
          const payload = Ndef.text.decodePayload(ndefRecord.payload);
          if (payload && payload.startsWith('CARD-')) {
            uniqueId = payload;
          }
        } catch (e) {
          console.log('Using tag ID');
        }
      }

      if (!uniqueId) {
        throw new Error('Could not read card ID');
      }

      setCardId(uniqueId);
      Alert.alert('✅ Card Detected', `Card ID: ${uniqueId}\n\nEnter vehicle details`);

    } catch (error) {
      console.error('NFC Read Error:', error);
      Alert.alert('Scan Failed', error.message || 'Could not read card');
    } finally {
      setIsScanning(false);
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  };

  const getNextAvailableHook = async () => {
    try {
      const response = await fetch(`${API_URL}/next-hook`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to get hook number');
      }
      
      return data.hookNumber;
    } catch (error) {
      console.error('Error getting hook:', error);
      throw error;
    }
  };

  const handleCheckIn = async () => {
    if (!cardId) {
      Alert.alert('❌ Missing Card', 'Please tap NFC card first');
      return;
    }

    if (!licensePlate.trim()) {
      Alert.alert('❌ Missing License', 'Please enter license plate');
      return;
    }

    try {
      setIsProcessing(true);

      const hookNumber = await getNextAvailableHook();
      setAssignedHook(hookNumber);

      const checkinData = {
        unique_card_id: cardId,
        license_plate: licensePlate.trim().toUpperCase(),
        make: make.trim() || 'Unknown',
        model: model.trim() || 'Unknown',
        color: color.trim() || 'Unknown',
        key_slot: hookNumber
      };

      console.log('Check-in:', checkinData);

      const response = await fetch(`${API_URL}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkinData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Check-in failed');
      }

      Alert.alert(
        '✅ Check-In Complete!',
        `Vehicle: ${licensePlate}\nHook: ${hookNumber}\n\n🔑 Place keys on Hook #${hookNumber}`,
        [{
          text: 'OK',
          onPress: () => {
            setCardId('');
            setLicensePlate('');
            setMake('');
            setModel('');
            setColor('');
            setAssignedHook(null);
            if (navigation.canGoBack()) navigation.goBack();
          }
        }]
      );

    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('❌ Failed', error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateTestCard = () => {
    const testId = 'TEST-' + Date.now();
    setCardId(testId);
    Alert.alert('Test Card', `ID: ${testId}`);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Vehicle Check-In</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Step 1: Tap NFC Card 📱</Text>
        
        <TouchableOpacity
          style={[styles.button, isScanning && styles.buttonScanning, cardId && styles.buttonSuccess]}
          onPress={readNFC}
          disabled={isScanning || !nfcEnabled}
        >
          {isScanning ? (
            <>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={styles.buttonText}>Scanning...</Text>
            </>
          ) : cardId ? (
            <>
              <Text style={styles.icon}>✓</Text>
              <Text style={styles.buttonText}>Card Scanned</Text>
            </>
          ) : (
            <>
              <Text style={styles.icon}>📱</Text>
              <Text style={styles.buttonText}>Tap to Scan</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.testBtn} onPress={generateTestCard}>
          <Text style={styles.testText}>🧪 Test Card (Dev)</Text>
        </TouchableOpacity>

        {cardId && (
          <View style={styles.cardBox}>
            <Text style={styles.cardLabel}>Card ID:</Text>
            <Text style={styles.cardValue}>{cardId}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Step 2: Vehicle Details 🚗</Text>

        <TextInput
          style={[styles.input, !cardId && styles.inputDisabled]}
          placeholder="License Plate *"
          value={licensePlate}
          onChangeText={setLicensePlate}
          autoCapitalize="characters"
          editable={!!cardId}
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.half, !cardId && styles.inputDisabled]}
            placeholder="Make"
            value={make}
            onChangeText={setMake}
            editable={!!cardId}
          />
          <TextInput
            style={[styles.input, styles.half, !cardId && styles.inputDisabled]}
            placeholder="Model"
            value={model}
            onChangeText={setModel}
            editable={!!cardId}
          />
        </View>

        <TextInput
          style={[styles.input, !cardId && styles.inputDisabled]}
          placeholder="Color"
          value={color}
          onChangeText={setColor}
          editable={!!cardId}
        />
      </View>

      <TouchableOpacity
        style={[styles.checkinBtn, (!cardId || !licensePlate || isProcessing) && styles.btnDisabled]}
        onPress={handleCheckIn}
        disabled={!cardId || !licensePlate || isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.checkinText}>Complete Check-In</Text>
        )}
      </TouchableOpacity>

      {assignedHook && (
        <View style={styles.hookBox}>
          <Text style={styles.hookText}>🔑 Hook #{assignedHook}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24, textAlign: 'center', color: '#333' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  label: { fontSize: 16, fontWeight: '600', color: '#666', marginBottom: 15 },
  button: { backgroundColor: '#4CAF50', padding: 24, borderRadius: 12, alignItems: 'center', minHeight: 120 },
  buttonScanning: { backgroundColor: '#2196F3' },
  buttonSuccess: { backgroundColor: '#4CAF50' },
  icon: { fontSize: 48, marginBottom: 8 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  testBtn: { marginTop: 12, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 8, alignItems: 'center' },
  testText: { color: '#666', fontSize: 14 },
  cardBox: { marginTop: 15, padding: 12, backgroundColor: '#e8f5e9', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  cardLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  cardValue: { fontSize: 14, fontWeight: '600', color: '#2e7d32', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  input: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 15, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: '#ddd' },
  inputDisabled: { backgroundColor: '#e9ecef', color: '#999' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },
  checkinBtn: { backgroundColor: '#2196F3', padding: 18, borderRadius: 12, alignItems: 'center', elevation: 3 },
  btnDisabled: { backgroundColor: '#ccc' },
  checkinText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  hookBox: { marginTop: 20, padding: 20, backgroundColor: '#fff3cd', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#ffc107', alignItems: 'center' },
  hookText: { fontSize: 24, fontWeight: 'bold', color: '#856404' },
});

export default NFCCheckInScreen;
