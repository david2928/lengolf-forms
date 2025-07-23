// PromptPay QR Code Generation Service
// Generates QR codes for PromptPay payments using Thai banking standards

import promptpayQr from 'promptpay-qr';
import QRCode from 'qrcode';
import { PromptPayQRRequest, PromptPayQRResponse, PaymentError } from '@/types/payment';
import { getPromptPayConfig, QR_CODE_CONFIG, validatePromptPayConfig, formatPhoneForPromptPay } from '@/lib/promptpay-config';

export class PromptPayQRGenerator {
  private config = getPromptPayConfig();
  
  constructor() {
    // Validate configuration on initialization
    const validation = validatePromptPayConfig();
    if (!validation.isValid) {
      console.warn('PromptPay configuration issues:', validation.errors);
    }
  }
  
  /**
   * Generate PromptPay QR code for payment
   */
  async generateQR(request: PromptPayQRRequest): Promise<PromptPayQRResponse> {
    try {
      // Validate amount
      this.validateAmount(request.amount);
      
      // Get the primary identifier for PromptPay
      const identifier = this.getPrimaryIdentifier();
      
      // Generate PromptPay payload
      const payload = promptpayQr(identifier, { amount: request.amount });
      
      // Generate QR code image
      const qrCodeDataURL = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: QR_CODE_CONFIG.errorCorrectionLevel,
        width: QR_CODE_CONFIG.width,
        margin: QR_CODE_CONFIG.margin,
        color: QR_CODE_CONFIG.color
      });
      
      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + QR_CODE_CONFIG.expirationMinutes);
      
      return {
        qrCodeDataURL,
        payload,
        amount: request.amount,
        expiresAt
      };
      
    } catch (error) {
      console.error('PromptPay QR generation failed:', error);
      throw new PaymentError(
        `Failed to generate PromptPay QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROMPTPAY_QR_GENERATION_FAILED'
      );
    }
  }
  
  /**
   * Generate QR code with automatic reference numbers
   */
  async generateQRWithReference(amount: number, transactionId?: string): Promise<PromptPayQRResponse> {
    // Generate reference numbers for tracking
    const ref1 = transactionId ? transactionId.slice(-8) : this.generateRef1();
    const ref2 = this.generateRef2();
    
    return this.generateQR({
      amount,
      ref1,
      ref2
    });
  }
  
  /**
   * Validate QR code payload
   */
  validateQRPayload(payload: string): { isValid: boolean; amount?: number; error?: string } {
    try {
      // Basic validation - check if it's a valid PromptPay payload
      if (!payload.startsWith('00020101021129')) {
        return { isValid: false, error: 'Invalid PromptPay QR payload format' };
      }
      
      // Extract amount from payload (simplified)
      // In a real implementation, you'd parse the full EMV QR format
      return { isValid: true };
      
    } catch (error) {
      return { 
        isValid: false, 
        error: `Payload validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  /**
   * Check if QR code has expired
   */
  isQRExpired(generatedAt: Date): boolean {
    const now = new Date();
    const expirationTime = new Date(generatedAt);
    expirationTime.setMinutes(expirationTime.getMinutes() + QR_CODE_CONFIG.expirationMinutes);
    
    return now > expirationTime;
  }
  
  /**
   * Get configuration status for debugging
   */
  getConfigStatus(): { configured: boolean; identifier?: string; errors: string[] } {
    const validation = validatePromptPayConfig();
    
    return {
      configured: validation.isValid,
      identifier: validation.isValid ? this.getPrimaryIdentifier() : undefined,
      errors: validation.errors
    };
  }
  
  // Private methods
  
  private validateAmount(amount: number): void {
    if (amount < QR_CODE_CONFIG.minAmount) {
      throw new PaymentError(
        `Amount must be at least ฿${QR_CODE_CONFIG.minAmount}`,
        'INVALID_AMOUNT'
      );
    }
    
    if (amount > QR_CODE_CONFIG.maxAmount) {
      throw new PaymentError(
        `Amount cannot exceed ฿${QR_CODE_CONFIG.maxAmount}`,
        'INVALID_AMOUNT'
      );
    }
    
    // Check for reasonable decimal places (no more than 2)
    if (Number(amount.toFixed(2)) !== amount) {
      throw new PaymentError(
        'Amount cannot have more than 2 decimal places',
        'INVALID_AMOUNT'
      );
    }
  }
  
  private getPrimaryIdentifier(): string {
    // Priority order: national ID (corporate tax ID), phone number, e-wallet ID
    if (this.config.nationalId) {
      const cleanId = this.config.nationalId.replace(/[^0-9]/g, '');
      // For 12-digit corporate tax IDs, pad to 13 digits with leading zero
      if (cleanId.length === 12) {
        return '0' + cleanId;
      }
      return cleanId;
    }
    
    if (this.config.phoneNumber) {
      return formatPhoneForPromptPay(this.config.phoneNumber);
    }
    
    if (this.config.eWalletId) {
      return this.config.eWalletId;
    }
    
    throw new PaymentError(
      'No valid PromptPay identifier configured',
      'MISSING_PROMPTPAY_CONFIG'
    );
  }
  
  private generateRef1(): string {
    // Generate 8-character reference (combination of date and random)
    const date = new Date().toISOString().slice(2, 10).replace('-', ''); // YYMMDD
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    return date + random;
  }
  
  private generateRef2(): string {
    // Generate 4-character reference
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  }
}

// Singleton instance for easy use
export const promptPayQRGenerator = new PromptPayQRGenerator();

// Utility functions for common use cases
export async function generatePromptPayQR(amount: number, transactionId?: string): Promise<PromptPayQRResponse> {
  return promptPayQRGenerator.generateQRWithReference(amount, transactionId);
}

export function isPromptPayConfigured(): boolean {
  return promptPayQRGenerator.getConfigStatus().configured;
}

export function getPromptPayConfigErrors(): string[] {
  return promptPayQRGenerator.getConfigStatus().errors;
}