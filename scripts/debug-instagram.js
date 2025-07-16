const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Playwright codegen-style debugging for Instagram scraping
async function debugInstagramScraping() {
  console.log('🚀 Starting Instagram scraping debug session...');
  
  const browser = await chromium.launch({
    headless: false, // Visual debugging
    slowMo: 1000,    // Slow down actions
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Enhanced logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url()));

  try {
    const url = 'https://www.instagram.com/fairwaygolfandcityclub/';
    console.log(`📍 Navigating to: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for page to load
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(3000);
    
    // Try to find the profile header
    console.log('🔍 Looking for profile header...');
    try {
      await page.waitForSelector('header section', { timeout: 10000 });
      console.log('✅ Profile header found');
    } catch (e) {
      console.log('❌ Profile header not found');
    }
    
    // Take screenshot for debugging
    const screenshotPath = path.join(__dirname, '..', 'debug-screenshots', 'instagram-debug.png');
    await fs.promises.mkdir(path.dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved to: ${screenshotPath}`);
    
    // Extract all text content for analysis
    console.log('📝 Extracting all text content...');
    const allText = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.map(el => ({
        tagName: el.tagName.toLowerCase(),
        text: el.textContent?.trim().substring(0, 100) || '',
        className: el.className,
        id: el.id,
        href: el.href || ''
      })).filter(el => el.text.length > 0);
    });
    
    // Look for numbers that might be followers/following
    const potentialCounts = allText.filter(el => 
      /^\d+[KMk]?$/.test(el.text) || 
      /\d+[KMk]?\s*(followers|following|posts|โพสต์|ผู้ติดตาม|กำลังติดตาม)/.test(el.text)
    );
    
    console.log('🔢 Potential count elements found:', potentialCounts.length);
    potentialCounts.forEach((el, i) => {
      console.log(`${i + 1}. ${el.tagName}.${el.className} - "${el.text}"`);
    });
    
    // Try to find profile stats section
    console.log('📊 Looking for profile stats...');
    const profileStats = await page.evaluate(() => {
      const headerSection = document.querySelector('header section');
      if (!headerSection) return null;
      
      const lists = headerSection.querySelectorAll('ul');
      const stats = [];
      
      lists.forEach(ul => {
        const items = ul.querySelectorAll('li');
        items.forEach((item, index) => {
          const text = item.textContent?.trim();
          const links = item.querySelectorAll('a');
          stats.push({
            index,
            text,
            hasLink: links.length > 0,
            linkHref: links[0]?.href || '',
            innerHTML: item.innerHTML.substring(0, 200)
          });
        });
      });
      
      return stats;
    });
    
    console.log('📈 Profile stats found:', profileStats);
    
    // Try GraphQL endpoint approach
    console.log('🔗 Trying GraphQL endpoint approach...');
    try {
      const response = await page.evaluate(async () => {
        const username = window.location.pathname.split('/')[1];
        const response = await fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
          headers: {
            'x-ig-app-id': '936619743392459'
          }
        });
        return response.text();
      });
      
      console.log('📡 GraphQL response (first 500 chars):', response.substring(0, 500));
      
      // Try to parse JSON
      try {
        const data = JSON.parse(response);
        if (data.data?.user) {
          console.log('✅ Found user data in GraphQL response');
          const user = data.data.user;
          console.log('👤 User stats:', {
            followers: user.edge_followed_by?.count,
            following: user.edge_follow?.count,
            posts: user.edge_owner_to_timeline_media?.count
          });
        }
      } catch (e) {
        console.log('❌ Could not parse GraphQL response as JSON');
      }
    } catch (e) {
      console.log('❌ GraphQL endpoint failed:', e.message);
    }
    
    // Check for embedded JSON data
    console.log('📋 Looking for embedded JSON data...');
    const embeddedData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const content = script.textContent || '';
        if (content.includes('window._sharedData') || content.includes('edge_followed_by')) {
          return content.substring(0, 1000);
        }
      }
      return null;
    });
    
    if (embeddedData) {
      console.log('📊 Found embedded data:', embeddedData);
    } else {
      console.log('❌ No embedded data found');
    }
    
    console.log('🎯 Debug session complete. Check the screenshot and logs above.');
    console.log('💡 To run Playwright codegen: npx playwright codegen https://www.instagram.com/fairwaygolfandcityclub/');
    
  } catch (error) {
    console.error('❌ Debug session failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the debug session
debugInstagramScraping().catch(console.error);