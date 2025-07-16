const { chromium } = require('playwright');
const { createWorker } = require('tesseract.js');
const fs = require('fs');
const path = require('path');

async function debugInstagramOCR() {
  console.log('🚀 Starting Instagram OCR debug session...');
  
  const browser = await chromium.launch({
    headless: false, // Visual debugging
    slowMo: 500,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    const url = 'https://www.instagram.com/fairwaygolfandcityclub/';
    console.log(`📍 Navigating to: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for page to load
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(5000);
    
    // Try to find the profile header
    try {
      await page.waitForSelector('header section', { timeout: 10000 });
      console.log('✅ Profile header found');
    } catch (e) {
      console.log('❌ Profile header not found');
      await browser.close();
      return;
    }
    
    // Take screenshot of the header for OCR
    console.log('📸 Taking header screenshot for OCR...');
    const headerElement = await page.locator('header section').first();
    const screenshotBuffer = await headerElement.screenshot({ type: 'png' });
    
    // Save screenshot for debugging
    const screenshotPath = path.join(__dirname, '..', 'debug-screenshots', 'instagram-header.png');
    await fs.promises.mkdir(path.dirname(screenshotPath), { recursive: true });
    await fs.promises.writeFile(screenshotPath, screenshotBuffer);
    console.log(`💾 Header screenshot saved to: ${screenshotPath}`);
    
    // Run OCR on the screenshot
    console.log('🔍 Running OCR on header screenshot...');
    const worker = await createWorker('eng');
    
    // Set OCR options for better number recognition
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789.,KMkfolwersignpatสติดตามโพ ',
      tessedit_pageseg_mode: '6' // Assume a single uniform block of text
    });
    
    const { data: { text } } = await worker.recognize(screenshotBuffer);
    await worker.terminate();
    
    console.log('📄 OCR extracted text:');
    console.log('---START OCR TEXT---');
    console.log(text);
    console.log('---END OCR TEXT---');
    
    // Parse the text
    const cleanText = text.replace(/\n/g, ' ').trim();
    console.log('🧹 Cleaned text:', cleanText);
    
    // Look for numbers
    const numbers = cleanText.match(/\d+(?:,\d+)*(?:\.\d+)?[KMk]?/g);
    console.log('🔢 Found numbers:', numbers);
    
    // Try specific patterns
    const patterns = [
      { name: 'followers', regex: /(\d+(?:,\d+)*(?:\.\d+)?[KMk]?)\s*followers/i },
      { name: 'following', regex: /(\d+(?:,\d+)*(?:\.\d+)?[KMk]?)\s*following/i },
      { name: 'posts', regex: /(\d+(?:,\d+)*(?:\.\d+)?[KMk]?)\s*posts/i },
      { name: 'thai_followers', regex: /(\d+(?:,\d+)*(?:\.\d+)?[KMk]?)\s*ผู้ติดตาม/i },
      { name: 'thai_following', regex: /(\d+(?:,\d+)*(?:\.\d+)?[KMk]?)\s*กำลังติดตาม/i },
      { name: 'thai_posts', regex: /(\d+(?:,\d+)*(?:\.\d+)?[KMk]?)\s*โพสต์/i }
    ];
    
    console.log('🎯 Pattern matching results:');
    patterns.forEach(pattern => {
      const match = cleanText.match(pattern.regex);
      if (match) {
        console.log(`  ${pattern.name}: ${match[1]}`);
      } else {
        console.log(`  ${pattern.name}: NOT FOUND`);
      }
    });
    
    // Also try HTML extraction for comparison
    console.log('\n🔍 Trying HTML extraction for comparison...');
    const htmlStats = await page.evaluate(() => {
      const stats = [];
      const headerStats = Array.from(document.querySelectorAll('header section ul li'));
      
      headerStats.forEach((stat, index) => {
        const text = stat.textContent?.trim();
        stats.push({
          index,
          text: text?.substring(0, 100) || ''
        });
      });
      
      return stats;
    });
    
    console.log('📊 HTML stats found:', htmlStats);
    
    console.log('\n✅ Debug session complete');
    console.log('💡 Compare OCR results with HTML stats to see which approach works better');
    
  } catch (error) {
    console.error('❌ Debug session failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the debug session
debugInstagramOCR().catch(console.error);