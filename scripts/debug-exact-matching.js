const { chromium } = require('playwright');

async function debugExactMatching() {
  console.log('🔍 Debug exact matching logic...');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    await page.goto('https://www.instagram.com/fairwaygolfandcityclub/', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    await page.waitForSelector('header section', { timeout: 10000 });
    
    // Test the exact logic from our scraper
    const results = await page.evaluate(() => {
      const headerStats = Array.from(document.querySelectorAll('header section ul li'));
      
      let followersText = null;
      let followingText = null;
      let postsText = null;
      
      const debugInfo = [];
      
      headerStats.forEach((stat, index) => {
        const text = stat.textContent?.trim() || '';
        
        const info = {
          index,
          text,
          includesFollowers: text.includes('followers'),
          includesFollowing: text.includes('following'),
          includesPosts: text.includes('posts')
        };
        
        debugInfo.push(info);
        
        // Match by keyword rather than position, as Instagram order is consistent
        if (text.includes('posts') || text.includes('โพสต์')) {
          const match = text.match(/^([\d,]+\.?\d*[KMk]?)/);
          if (match) {
            postsText = match[1];
            info.postsMatch = match[1];
          }
        } else if (text.includes('followers') || text.includes('ผู้ติดตาม')) {
          const match = text.match(/^([\d,]+\.?\d*[KMk]?)/);
          if (match) {
            followersText = match[1];
            info.followersMatch = match[1];
          }
        } else if (text.includes('following') || text.includes('กำลังติดตาม')) {
          const match = text.match(/^([\d,]+\.?\d*[KMk]?)/);
          if (match) {
            followingText = match[1];
            info.followingMatch = match[1];
          }
        }
      });
      
      return {
        debugInfo,
        extractedValues: {
          followersText,
          followingText,
          postsText
        }
      };
    });
    
    console.log('📊 Debug Results:');
    console.log('Stats Analysis:', JSON.stringify(results.debugInfo, null, 2));
    console.log('Final Extracted Values:', JSON.stringify(results.extractedValues, null, 2));
    
    // Test the parsing function
    const parseCount = (text) => {
      if (!text) return 0;
      
      const cleanText = text.trim();
      const match = cleanText.match(/^([\d,]+\.?\d*)([KMk]?)$/);
      if (!match) return 0;
      
      let num = parseFloat(match[1].replace(/,/g, ''));
      const suffix = match[2]?.toUpperCase();
      
      if (suffix === 'K') num *= 1000;
      if (suffix === 'M') num *= 1000000;
      
      return Math.round(num);
    };
    
    console.log('\n🔢 Final Parsed Values:');
    console.log('Followers:', parseCount(results.extractedValues.followersText));
    console.log('Following:', parseCount(results.extractedValues.followingText));
    console.log('Posts:', parseCount(results.extractedValues.postsText));
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugExactMatching().catch(console.error);