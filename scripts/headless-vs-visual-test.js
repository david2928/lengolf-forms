const { chromium } = require('playwright');

async function compareHeadlessVsVisual() {
  console.log('🔍 Testing headless vs visual browser differences...');
  
  const testConfigs = [
    {
      name: 'Visual Browser',
      headless: false,
      slowMo: 500
    },
    {
      name: 'Headless Browser (Same as Scraper)',
      headless: true,
      slowMo: 0
    }
  ];
  
  for (const config of testConfigs) {
    console.log(`\n🧪 Testing: ${config.name}`);
    
    const browser = await chromium.launch({
      headless: config.headless,
      slowMo: config.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    try {
      const url = 'https://www.instagram.com/fairwaygolfandcityclub/';
      
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
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
        
        const stats = headerStats.map((stat, index) => ({
          index,
          text: stat.textContent?.trim() || '',
          innerHTML: stat.innerHTML.substring(0, 200)
        }));
        
        // Check if we can find the pattern
        let followersText = null;
        let followingText = null;
        let postsText = null;
        
        headerStats.forEach(stat => {
          const text = stat.textContent?.trim() || '';
          
          if (text.includes('posts')) {
            const match = text.match(/^([\d,]+\.?\d*[KMk]?)/);
            if (match) postsText = match[1];
          } else if (text.includes('followers')) {
            const match = text.match(/^([\d,]+\.?\d*[KMk]?)/);
            if (match) followersText = match[1];
          } else if (text.includes('following')) {
            const match = text.match(/^([\d,]+\.?\d*[KMk]?)/);
            if (match) followingText = match[1];
          }
        });
        
        return {
          statsCount: headerStats.length,
          stats,
          extractedMetrics: {
            followersText,
            followingText,
            postsText
          }
        };
      });
      
      console.log(`📊 ${config.name} Results:`);
      console.log(`  - Stats found: ${results.statsCount}`);
      console.log(`  - Followers: ${results.extractedMetrics.followersText || 'NOT FOUND'}`);
      console.log(`  - Following: ${results.extractedMetrics.followingText || 'NOT FOUND'}`);
      console.log(`  - Posts: ${results.extractedMetrics.postsText || 'NOT FOUND'}`);
      
      if (results.statsCount > 0) {
        console.log('  - Raw stats:', results.stats);
      }
      
    } catch (error) {
      console.error(`❌ ${config.name} failed:`, error.message);
    } finally {
      await browser.close();
    }
  }
}

// Test different user agents
async function testUserAgents() {
  console.log('\n🌐 Testing different user agents...');
  
  const userAgents = [
    {
      name: 'Desktop Chrome',
      agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    {
      name: 'Mobile Chrome',
      agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    },
    {
      name: 'Instagram App',
      agent: 'Instagram 219.0.0.12.117 Android'
    }
  ];
  
  for (const ua of userAgents) {
    console.log(`\n📱 Testing: ${ua.name}`);
    
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: ua.agent,
      viewport: ua.name.includes('Mobile') ? { width: 375, height: 667 } : { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    try {
      await page.goto('https://www.instagram.com/fairwaygolfandcityclub/', { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
      
      await page.waitForTimeout(3000);
      
      const hasStats = await page.evaluate(() => {
        const headerStats = document.querySelectorAll('header section ul li');
        return headerStats.length;
      });
      
      console.log(`  - Found ${hasStats} stats elements`);
      
    } catch (error) {
      console.log(`  - Failed: ${error.message}`);
    } finally {
      await browser.close();
    }
  }
}

// Run tests
compareHeadlessVsVisual()
  .then(() => testUserAgents())
  .catch(console.error);