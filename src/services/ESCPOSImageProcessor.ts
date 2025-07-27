// ESC/POS Image Processing Service
// Converts images to ESC/POS bitmap commands for thermal printers

import * as fs from 'fs';
import * as path from 'path';

export class ESCPOSImageProcessor {
  
  /**
   * Convert image to ESC/POS bitmap commands
   * Uses GS v 0 command for raster format printing
   */
  static generateImageCommands(imagePath: string, maxWidth: number = 384): Buffer {
    // For now, return placeholder commands
    // In a full implementation, you would:
    // 1. Load the image file
    // 2. Convert to monochrome bitmap
    // 3. Resize to fit thermal printer width
    // 4. Convert to ESC/POS raster format
    
    const commands: number[] = [];
    const ESC = 0x1B;
    const GS = 0x1D;
    
    // Center alignment for image
    commands.push(ESC, 0x61, 0x01); // ESC a 1 - Center alignment
    
    // TODO: Implement actual image processing
    // For now, add placeholder text
    const logoText = 'LENGOLF';
    for (let i = 0; i < logoText.length; i++) {
      commands.push(logoText.charCodeAt(i));
    }
    commands.push(0x0A, 0x0A);
    
    // Reset alignment
    commands.push(ESC, 0x61, 0x00); // ESC a 0 - Left alignment
    
    return Buffer.from(commands);
  }

  /**
   * Generate ESC/POS raster bitmap command (GS v 0)
   * @param width Image width in pixels (must be divisible by 8)
   * @param height Image height in pixels
   * @param imageData Bitmap data as array of bytes
   */
  static generateRasterCommand(width: number, height: number, imageData: Uint8Array): Buffer {
    const commands: number[] = [];
    const GS = 0x1D;
    
    // GS v 0 command format: GS v 0 xL xH yL yH data
    const widthBytes = Math.ceil(width / 8);
    const xL = widthBytes & 0xFF;
    const xH = (widthBytes >> 8) & 0xFF;
    const yL = height & 0xFF;
    const yH = (height >> 8) & 0xFF;
    
    // Add GS v 0 command
    commands.push(GS, 0x76, 0x30, 0x00); // GS v 0 0
    commands.push(xL, xH, yL, yH);
    
    // Add image data
    for (let i = 0; i < imageData.length; i++) {
      commands.push(imageData[i]);
    }
    
    return Buffer.from(commands);
  }

  /**
   * Create a simple LENGOLF logo bitmap
   * This creates a basic text-based logo that can be printed
   */
  static createSimpleLogo(): Buffer {
    try {
      // Try to load the actual logo file from public directory
      const logoPath = path.join(process.cwd(), 'public', 'lengolf_logo_large.bin');
      
      if (fs.existsSync(logoPath)) {
        console.log('✅ Loading LENGOLF logo from:', logoPath);
        const logoData = fs.readFileSync(logoPath);
        console.log(`📊 Logo size: ${logoData.length} bytes`);
        // Log first few bytes for debugging
        const firstBytes = Array.from(logoData.slice(0, 10))
          .map(b => `0x${b.toString(16).padStart(2, '0')}`)
          .join(' ');
        console.log(`📊 Logo starts with: ${firstBytes}`);
        // The .bin file already contains complete ESC/POS commands, return as-is
        return logoData;
      } else {
        console.log('⚠️ Logo file not found at:', logoPath, '- using fallback');
      }
    } catch (error) {
      console.error('❌ Error loading logo file:', error);
    }
    
    // Fallback: Create a simple 48x16 pixel logo
    const width = 48; // pixels (6 bytes wide)
    const height = 16; // pixels
    const widthBytes = Math.ceil(width / 8);
    
    // Simple bitmap data for "LENGOLF" text
    const logoData = new Uint8Array([
      // Row 1
      0b11111000, 0b11111000, 0b11111100, 0b11111000, 0b11111000, 0b11111000,
      // Row 2  
      0b10000000, 0b10000000, 0b10000100, 0b10000000, 0b10000000, 0b10000000,
      // Row 3
      0b10000000, 0b11111000, 0b10000100, 0b10000000, 0b10000000, 0b10000000,
      // Row 4
      0b10000000, 0b10000000, 0b10000100, 0b10000000, 0b10000000, 0b10000000,
      // Row 5
      0b10000000, 0b10000000, 0b10000100, 0b10000000, 0b10000000, 0b10000000,
      // Row 6
      0b10000000, 0b10000000, 0b10000100, 0b10000000, 0b10000000, 0b10000000,
      // Row 7
      0b10000000, 0b10000000, 0b10000100, 0b10000000, 0b10000000, 0b10000000,
      // Row 8
      0b11111000, 0b11111000, 0b11111100, 0b11111000, 0b11111000, 0b11111000,
      // Repeat pattern for height of 16
      0b11111000, 0b11111000, 0b11111100, 0b11111000, 0b11111000, 0b11111000,
      0b10000000, 0b10000000, 0b10000100, 0b10000000, 0b10000000, 0b10000000,
      0b10000000, 0b11111000, 0b10000100, 0b10000000, 0b10000000, 0b10000000,
      0b10000000, 0b10000000, 0b10000100, 0b10000000, 0b10000000, 0b10000000,
      0b10000000, 0b10000000, 0b10000100, 0b10000000, 0b10000000, 0b10000000,
      0b10000000, 0b10000000, 0b10000100, 0b10000000, 0b10000000, 0b10000000,
      0b10000000, 0b10000000, 0b10000100, 0b10000000, 0b10000000, 0b10000000,
      0b11111000, 0b11111000, 0b11111100, 0b11111000, 0b11111000, 0b11111000
    ]);
    
    return this.generateRasterCommand(width, height, logoData);
  }

  /**
   * For future implementation: Convert PNG/JPG to thermal printer bitmap
   * This would require image processing libraries like Canvas or Sharp
   */
  static async convertImageToBitmap(imagePath: string, maxWidth: number = 384): Promise<Buffer> {
    // TODO: Implement actual image conversion
    // 1. Load image using Canvas or Sharp
    // 2. Convert to grayscale
    // 3. Apply dithering for better thermal printing
    // 4. Resize to fit thermal printer width
    // 5. Convert to monochrome bitmap
    // 6. Generate ESC/POS commands
    
    // For now, return simple logo
    return this.createSimpleLogo();
  }
}

export default ESCPOSImageProcessor;