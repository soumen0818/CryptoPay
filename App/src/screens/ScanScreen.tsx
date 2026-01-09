import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { parsePaymentQR, validatePaymentQR } from '../utils/qrCode';
import { getMerchantById, getMerchantByAddress } from '../services/merchant';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { Button } from '../components';

const { width } = Dimensions.get('window');
const SCANNER_SIZE = width * 0.7;

interface ScanScreenProps {
  navigation: any;
  route: any;
}

export const ScanScreen: React.FC<ScanScreenProps> = ({ navigation, route }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkCameraPermission();
  }, []);

  const checkCameraPermission = async () => {
    // First check if permission is already granted
    const { status: existingStatus } = await Camera.getCameraPermissionsAsync();
    
    if (existingStatus === 'granted') {
      setHasPermission(true);
      return;
    }
    
    // Only request if not already granted
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setLoading(true);

    try {
      // Check if it's a simple wallet address (from Profile QR code)
      if (data.startsWith('0x') && data.length === 42) {
        // Simple wallet address
        setLoading(false);
        
        // Replace current screen to avoid back button going to scan
        navigation.replace('SendMoney', { 
          recipientAddress: data,
          hideBalance: route?.params?.returnTo !== 'SendMoney'
        });
        return;
      }

      // Try to parse as payment QR code (old format with amount/merchant details)
      const paymentData = parsePaymentQR(data);

      if (!paymentData) {
        Alert.alert(
          'Invalid QR Code',
          'Please scan a valid wallet QR code or payment request.',
          [{ text: 'Scan Again', onPress: () => { setScanned(false); setLoading(false); } }]
        );
        return;
      }

      // Validate payment data
      const validation = validatePaymentQR(paymentData);
      if (!validation.valid) {
        Alert.alert('Invalid Payment', validation.error || 'Invalid payment data', [
          { text: 'Scan Again', onPress: () => { setScanned(false); setLoading(false); } },
        ]);
        return;
      }

      setLoading(false);

      // Replace current screen to avoid back button going to scan
      navigation.replace('SendMoney', { 
        recipientAddress: paymentData.merchant,
        amount: paymentData.amount && paymentData.amount !== '0' ? paymentData.amount : undefined,
        recipientName: paymentData.name,
        note: paymentData.note,
        hideBalance: route?.params?.returnTo !== 'SendMoney'
      });
    } catch (error) {
      console.error('Error processing QR code:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to process QR code. Please try again.', [
        { text: 'Scan Again', onPress: () => setScanned(false) },
      ]);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        // For now, show a message that QR scanning from image requires additional setup
        // In production, you'd use a library like jsQR to decode the QR from the image
        Alert.alert(
          'Gallery QR Scanning',
          'This feature requires QR code detection from images. Please use camera to scan QR codes.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>No access to camera</Text>
        <Text style={styles.submessage}>
          Please enable camera permissions in your device settings
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleCancel}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      
      {/* Header - Positioned absolutely over camera */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Scan QR Code to Pay</Text>
      </View>

      {/* Scanner Overlay - Positioned absolutely over camera */}
      <View style={styles.overlay}>
        <View style={styles.scannerContainer}>
          <View style={styles.scannerFrame}>
            {/* Corner borders */}
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
        </View>
      </View>

      {/* Instructions - Positioned absolutely over camera */}
      <View style={styles.footer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.instruction}>Loading merchant details...</Text>
          </View>
        ) : (
          <Text style={styles.instruction}>
            {scanned ? 'Processing...' : 'Align QR code within the frame'}
          </Text>
        )}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.galleryButton} onPress={handlePickImage}>
            <Text style={styles.galleryButtonText}>🖼️ Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 60 : SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1,
  },
  headerText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerContainer: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
  },
  scannerFrame: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: BORDER_RADIUS.md,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: BORDER_RADIUS.md,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: BORDER_RADIUS.md,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: BORDER_RADIUS.md,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 60 : SPACING.xl,
    paddingTop: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    zIndex: 1,
  },
  instruction: {
    fontSize: FONT_SIZES.md,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontWeight: '500',
    marginLeft: SPACING.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  galleryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    flex: 1,
  },
  galleryButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    flex: 1,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  message: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  submessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  buttonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
