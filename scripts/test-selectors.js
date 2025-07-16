const { chromium } = require('playwright');

async function testSelectors() {
  console.log('🧪 Testing Instagram selectors...');
  
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
    
    // Test the exact selectors from our debug
    const results = await page.evaluate(() => {
      const results = {
        headerStats: [],
        allHeaderText: [],
        linksFound: []
      };
      
      // Test header section ul li
      const headerStats = Array.from(document.querySelectorAll('header section ul li'));
      console.log('Found header stats:', headerStats.length);
      
      headerStats.forEach((stat, index) => {
        const text = stat.textContent?.trim() || '';
        console.log(`Stat ${index}:`, text);
        results.headerStats.push({
          index,
          text,
          hasFollowers: text.includes('followers'),
          hasFollowing: text.includes('following'),
          hasPosts: text.includes('posts')
        });
      });
      
      // Test all text in header
      const headerSections = Array.from(document.querySelectorAll('header section'));
      headerSections.forEach((section, sectionIndex) => {
        const text = section.textContent?.trim() || '';
        results.allHeaderText.push({
          sectionIndex,
          text: text.substring(0, 500) // First 500 chars
        });
      });
      
      // Test links
      const links = Array.from(document.querySelectorAll('a[href*="/followers/"], a[href*="/following/"]'));
      links.forEach((link, linkIndex) => {
        results.linksFound.push({
          linkIndex,
          href: link.getAttribute('href'),
          text: link.textContent?.trim() || ''
        });
      });
      
      return results;
    });
    
    console.log('📊 Test Results:');
    console.log('Header Stats:', JSON.stringify(results.headerStats, null, 2));
    console.log('All Header Text:', JSON.stringify(results.allHeaderText, null, 2));
    console.log('Links Found:', JSON.stringify(results.linksFound, null, 2));
    
    // Test the parsing logic
    console.log('\n🔍 Testing parsing logic:');
    results.headerStats.forEach(stat => {
      if (stat.text.includes('followers')) {
        const match = stat.text.match(/^([\d,]+\.?\d*[KMk]?)/);
        console.log(`Followers text: "${stat.text}" -> Match: ${match ? match[1] : 'NO MATCH'}`);
      }
      if (stat.text.includes('following')) {
        const match = stat.text.match(/^([\d,]+\.?\d*[KMk]?)/);
        console.log(`Following text: "${stat.text}" -> Match: ${match ? match[1] : 'NO MATCH'}`);
      }
      if (stat.text.includes('posts')) {
        const match = stat.text.match(/^([\d,]+\.?\d*[KMk]?)/);
        console.log(`Posts text: "${stat.text}" -> Match: ${match ? match[1] : 'NO MATCH'}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testSelectors().catch(console.error);