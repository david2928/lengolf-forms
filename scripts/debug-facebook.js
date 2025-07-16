const { chromium } = require('playwright');

async function debugFacebookScraping() {
  console.log('🔍 Starting Facebook scraping debug session...');
  
  const browser = await chromium.launch({
    headless: false, // Visual debugging
    slowMo: 500,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok'
  });

  const page = await context.newPage();

  try {
    const url = 'https://www.facebook.com/Front9indoorgolf/';
    console.log(`📍 Navigating to: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for page to load
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(5000);
    
    // Try to find the main content area
    try {
      await page.waitForSelector('[role="main"]', { timeout: 10000 });
      console.log('✅ Main content found');
    } catch (e) {
      console.log('❌ Main content not found, trying alternative selectors');
    }
    
    // Take screenshot for debugging
    const screenshotPath = `C:\\vs_code\\lengolf-forms\\debug-screenshots\\facebook-debug.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved to: ${screenshotPath}`);
    
    // Extract all text content for analysis
    console.log('📝 Extracting all text content...');
    const pageText = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('span, div, a'));
      const textElements = [];
      
      for (const el of elements) {
        const text = el.textContent?.trim() || '';
        if (text.length > 0 && text.length < 200) {
          textElements.push({
            text,
            tagName: el.tagName.toLowerCase(),
            className: el.className,
            hasNumbers: /\d/.test(text),
            likeText: /like/i.test(text),
            followText: /follow/i.test(text)
          });
        }
      }
      
      return textElements;
    });
    
    // Filter for potential metrics
    const potentialMetrics = pageText.filter(el => 
      el.hasNumbers && (el.likeText || el.followText || /\d+[KMk]?/.test(el.text))
    );
    
    console.log('🔢 Potential metrics found:', potentialMetrics.length);
    potentialMetrics.forEach((el, i) => {
      console.log(`${i + 1}. ${el.tagName}.${el.className} - "${el.text}"`);
    });
    
    // Look for specific patterns
    console.log('\n🎯 Looking for specific patterns...');
    
    const patterns = [
      { name: 'likes', regex: /(\d+[KMk]?)\s*(people\s+)?like\s+this/i },
      { name: 'followers', regex: /(\d+[KMk]?)\s*(people\s+)?follow\s+this/i },
      { name: 'followers_alt', regex: /(\d+[KMk]?)\s+followers/i },
      { name: 'check-ins', regex: /(\d+[KMk]?)\s+check-?ins/i }
    ];
    
    patterns.forEach(pattern => {
      const matches = pageText.filter(el => pattern.regex.test(el.text));
      console.log(`  ${pattern.name}: ${matches.length} matches`);
      matches.forEach(match => console.log(`    - "${match.text}"`));
    });
    
    // Check for login requirement
    const loginRequired = await page.evaluate(() => {
      const loginIndicators = [
        'Log In',
        'Sign Up',
        'Create Account',
        'Login',
        'You must log in'
      ];
      
      const bodyText = document.body.textContent || '';
      return loginIndicators.some(indicator => bodyText.includes(indicator));
    });
    
    console.log(`\n🔐 Login required: ${loginRequired ? 'YES' : 'NO'}`);
    
    // Check for age restriction or other blocks
    const restricted = await page.evaluate(() => {
      const restrictionIndicators = [
        'Age Restriction',
        'Content Not Available',
        'This content isn\'t available',
        'Page not found'
      ];
      
      const bodyText = document.body.textContent || '';
      return restrictionIndicators.some(indicator => bodyText.includes(indicator));
    });
    
    console.log(`🚫 Content restricted: ${restricted ? 'YES' : 'NO'}`);
    
    console.log('\n✅ Facebook debug session complete');
    
  } catch (error) {
    console.error('❌ Debug session failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the debug session
debugFacebookScraping().catch(console.error);