// QR Code types and interfaces for CryptoPay

export interface PaymentQRData {
  type: 'cryptopay';
  merchant: string; // Wallet address
  amount: string; // Amount in PAY tokens
  name: string; // Merchant/recipient name
  note?: string; // Optional payment note
}

/**
 * Generate QR code data for payment request
 */
export function generatePaymentQR(
  merchantAddress: string,
  amount: string,
  merchantName: string,
  note?: string
): string {
  const qrData: PaymentQRData = {
    type: 'cryptopay',
    merchant: merchantAddress,
    amount: amount,
    name: merchantName,
    note: note,
  };
  return JSON.stringify(qrData);
}

/**
 * Parse scanned QR code data
 */
export function parsePaymentQR(qrString: string): PaymentQRData | null {
  try {
    const data = JSON.parse(qrString);
    
    // Validate required fields
    if (
      data.type === 'cryptopay' &&
      data.merchant &&
      data.amount &&
      data.name
    ) {
      return data as PaymentQRData;
    }
    
    return null;
  } catch (error) {
    console.error('Invalid QR code format:', error);
    return null;
  }
}

/**
 * Validate payment QR data
 */
export function validatePaymentQR(data: PaymentQRData): {
  valid: boolean;
  error?: string;
} {
  // Validate merchant address (Ethereum address format)
  if (!data.merchant || !data.merchant.match(/^0x[a-fA-F0-9]{40}$/)) {
    return { valid: false, error: 'Invalid merchant address' };
  }

  // Validate amount
  const amount = parseFloat(data.amount);
  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'Invalid amount' };
  }

  // Validate name
  if (!data.name || data.name.trim().length === 0) {
    return { valid: false, error: 'Merchant name required' };
  }

  return { valid: true };
}
