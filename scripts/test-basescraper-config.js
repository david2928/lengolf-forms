const { chromium } = require('playwright');

async function testBasescraperConfig() {
  console.log('🔍 Testing BaseScraper configuration...');
  
  // Simulate the exact same configuration as BaseScraper
  const getRandomUserAgent = () => {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  };
  
  const getRandomViewport = () => {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 1440, height: 900 },
      { width: 1280, height: 720 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
  };
  
  const testConfigs = [
    {
      name: 'Our Working Config',
      config: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
      }
    },
    {
      name: 'BaseScraper Config (with Thai locale)',
      config: {
        userAgent: getRandomUserAgent(),
        viewport: getRandomViewport(),
        locale: 'th-TH',
        timezoneId: 'Asia/Bangkok'
      }
    },
    {
      name: 'BaseScraper Config (no locale)',
      config: {
        userAgent: getRandomUserAgent(),
        viewport: getRandomViewport()
      }
    }
  ];
  
  for (const testConfig of testConfigs) {
    console.log(`\n🧪 Testing: ${testConfig.name}`);
    console.log('Config:', testConfig.config);
    
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext(testConfig.config);
    const page = await context.newPage();

    try {
      await page.goto('https://www.instagram.com/fairwaygolfandcityclub/', { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
      
      // Wait for profile header
      await page.waitForSelector('header section', { timeout: 10000 });
      
      // Wait for stats to load
      await page.waitForFunction(() => {
        const headerStats = document.querySelectorAll('header section ul li');
        return headerStats.length >= 3;
      }, { timeout: 10000 }).catch(() => {
        console.log('⚠️  Could not find complete header stats');
      });
      
      // Additional wait
      await page.waitForTimeout(3000);
      
      // Extract stats
      const results = await page.evaluate(() => {
        const headerStats = Array.from(document.querySelectorAll('header section ul li'));
        
        let followersText = null;
        let followingText = null;
        let postsText = null;
        
        headerStats.forEach((stat, index) => {
          const text = stat.textContent?.trim() || '';
          
          if (text.includes('posts') || text.includes('โพสต์')) {
            const match = text.match(/^([\d,]+\.?\d*[KMk]?)/);
            if (match) postsText = match[1];
          } else if (text.includes('followers') || text.includes('ผู้ติดตาม')) {
            const match = text.match(/^([\d,]+\.?\d*[KMk]?)/);
            if (match) followersText = match[1];
          } else if (text.includes('following') || text.includes('กำลังติดตาม')) {
            const match = text.match(/^([\d,]+\.?\d*[KMk]?)/);
            if (match) followingText = match[1];
          }
        });
        
        return {
          statsCount: headerStats.length,
          extractedMetrics: {
            followersText,
            followingText,
            postsText
          },
          rawStats: headerStats.map(stat => stat.textContent?.trim())
        };
      });
      
      console.log(`📊 Results:`);
      console.log(`  - Stats found: ${results.statsCount}`);
      console.log(`  - Followers: ${results.extractedMetrics.followersText || 'NOT FOUND'}`);
      console.log(`  - Following: ${results.extractedMetrics.followingText || 'NOT FOUND'}`);
      console.log(`  - Posts: ${results.extractedMetrics.postsText || 'NOT FOUND'}`);
      console.log(`  - Raw stats: ${JSON.stringify(results.rawStats)}`);
      
      if (results.extractedMetrics.followersText && results.extractedMetrics.followingText) {
        console.log('✅ SUCCESS: Found followers and following data!');
      } else {
        console.log('❌ FAILED: Missing followers or following data');
      }
      
    } catch (error) {
      console.error(`❌ Test failed:`, error.message);
    } finally {
      await browser.close();
    }
  }
}

// Test the exact scraper timing
async function testScraperTiming() {
  console.log('\n⏱️  Testing scraper timing...');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log('📍 Navigating to Instagram...');
    await page.goto('https://www.instagram.com/fairwaygolfandcityclub/', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    console.log('⏳ Waiting for header section...');
    await page.waitForSelector('header section', { timeout: 10000 });
    
    console.log('⏳ Waiting for stats to load...');
    await page.waitForFunction(() => {
      const headerStats = document.querySelectorAll('header section ul li');
      return headerStats.length >= 3;
    }, { timeout: 10000 }).catch(() => {
      console.log('⚠️  Could not find complete header stats');
    });
    
    console.log('⏳ Additional 2 second wait...');
    await page.waitForTimeout(2000);
    
    console.log('🔍 Extracting metrics...');
    const results = await page.evaluate(() => {
      const headerStats = Array.from(document.querySelectorAll('header section ul li'));
      
      console.log('Instagram scraper - found', headerStats.length, 'header stats');
      
      let followersText = null;
      let followingText = null;
      let postsText = null;
      
      headerStats.forEach((stat, index) => {
        const text = stat.textContent?.trim() || '';
        console.log(`Stat ${index}: "${text}"`);
        
        if (text.includes('posts') || text.includes('โพสต์')) {
          const match = text.match(/^([\d,]+\.?\d*[KMk]?)/);
          if (match) {
            postsText = match[1];
            console.log(`Posts matched: "${text}" -> "${match[1]}"`);
          }
        } else if (text.includes('followers') || text.includes('ผู้ติดตาม')) {
          const match = text.match(/^([\d,]+\.?\d*[KMk]?)/);
          if (match) {
            followersText = match[1];
            console.log(`Followers matched: "${text}" -> "${match[1]}"`);
          }
        } else if (text.includes('following') || text.includes('กำลังติดตาม')) {
          const match = text.match(/^([\d,]+\.?\d*[KMk]?)/);
          if (match) {
            followingText = match[1];
            console.log(`Following matched: "${text}" -> "${match[1]}"`);
          }
        }
      });
      
      return {
        followersText,
        followingText,
        postsText
      };
    });
    
    console.log('📊 Final results:');
    console.log(`  - Followers: ${results.followersText || 'NOT FOUND'}`);
    console.log(`  - Following: ${results.followingText || 'NOT FOUND'}`);
    console.log(`  - Posts: ${results.postsText || 'NOT FOUND'}`);
    
  } catch (error) {
    console.error('❌ Timing test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run both tests
testBasescraperConfig()
  .then(() => testScraperTiming())
  .catch(console.error);