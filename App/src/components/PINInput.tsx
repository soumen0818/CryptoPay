import React, { useState, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const FONT_SIZES = TYPOGRAPHY.sizes;

const { width } = Dimensions.get('window');
const PIN_LENGTH = 6;

interface PINInputProps {
  value: string;
  onChange: (pin: string) => void;
  error?: string;
  autoFocus?: boolean;
}

export const PINInput: React.FC<PINInputProps> = memo(({
  value,
  onChange,
  error,
  autoFocus = false,
}) => {
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = useCallback((text: string, index: number) => {
    // Only allow numbers
    if (text && !/^\d+$/.test(text)) return;

    const newPin = value.split('');
    
    // If text is empty, clear current digit
    if (text === '') {
      newPin[index] = '';
      onChange(newPin.join(''));
      return;
    }
    
    // Take only the last character if multiple characters are entered
    const lastChar = text.slice(-1);
    newPin[index] = lastChar;
    const updatedPin = newPin.join('');

    onChange(updatedPin);

    // Auto-focus next input
    if (lastChar && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [value, onChange]);

  const handleKeyPress = useCallback((e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      const newPin = value.split('');
      
      // If current box has a digit, clear it
      if (value[index]) {
        newPin[index] = '';
        onChange(newPin.join(''));
      } 
      // If current box is empty, move to previous box and clear it
      else if (index > 0) {
        newPin[index - 1] = '';
        onChange(newPin.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    }
  }, [value, onChange]);

  const handleBoxPress = useCallback((index: number) => {
    inputRefs.current[index]?.focus();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.pinContainer}>
        {Array.from({ length: PIN_LENGTH }).map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.pinBox,
              error && styles.pinBoxError,
              value[index] && styles.pinBoxFilled,
            ]}
            onPress={() => handleBoxPress(index)}
            activeOpacity={0.7}
          >
            <TextInput
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={styles.pinInput}
              value={value[index] || ''}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              secureTextEntry
              autoFocus={autoFocus && index === 0}
              selectTextOnFocus
            />
            {value[index] && <View style={styles.pinDot} />}
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width * 0.85,
    maxWidth: 400,
  },
  pinBox: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  pinBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  pinBoxError: {
    borderColor: COLORS.error,
  },
  pinInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  errorText: {
    marginTop: SPACING.md,
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
  },
});
