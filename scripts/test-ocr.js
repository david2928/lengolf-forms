const { createWorker } = require('tesseract.js');
const fs = require('fs');
const path = require('path');

async function testOCR() {
  console.log('🔍 Testing OCR functionality...');
  
  // Create a simple test image with text
  const testText = `
    246
    posts
    
    1,234
    followers
    
    567
    following
  `;
  
  console.log('📝 Testing with text:', testText);
  
  try {
    const worker = await createWorker('eng');
    console.log('✅ OCR worker created successfully');
    
    // Test OCR on a text string (this is just to test the library)
    const { data: { text } } = await worker.recognize(Buffer.from(testText));
    console.log('📄 OCR extracted text:', text);
    
    // Test parsing logic
    const parseCount = (text) => {
      if (!text) return 0;
      const cleanText = text.replace(/,/g, '');
      const match = cleanText.match(/^(\d+(?:\.\d+)?)\s*([KMk]?)$/);
      if (!match) return 0;
      
      let num = parseFloat(match[1]);
      const suffix = match[2]?.toUpperCase();
      
      if (suffix === 'K') num *= 1000;
      if (suffix === 'M') num *= 1000000;
      
      return Math.round(num);
    };
    
    const parseOCRText = (text) => {
      const metrics = {};
      const cleanText = text.replace(/\n/g, ' ').trim();
      
      // Parse follower count
      const followerMatch = cleanText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMk]?)\s*followers/i);
      if (followerMatch) {
        metrics.followers_count = parseCount(followerMatch[1]);
      }
      
      // Parse following count
      const followingMatch = cleanText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMk]?)\s*following/i);
      if (followingMatch) {
        metrics.following_count = parseCount(followingMatch[1]);
      }
      
      // Parse posts count
      const postsMatch = cleanText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMk]?)\s*posts/i);
      if (postsMatch) {
        metrics.posts_count = parseCount(postsMatch[1]);
      }
      
      return metrics;
    };
    
    const parsedMetrics = parseOCRText(text);
    console.log('🔢 Parsed metrics:', parsedMetrics);
    
    await worker.terminate();
    console.log('✅ OCR test completed successfully');
    
  } catch (error) {
    console.error('❌ OCR test failed:', error);
  }
}

// Test OCR with a real Instagram-like scenario
async function testWithMockInstagramData() {
  console.log('\n🎯 Testing with mock Instagram data...');
  
  const mockInstagramText = `
    fairwaygolfandcityclub
    
    246 posts    1.2K followers    890 following
    
    Fairway Golf And City Club
    Bangkok's premier golf facility
  `;
  
  console.log('📱 Mock Instagram text:', mockInstagramText);
  
  try {
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(Buffer.from(mockInstagramText));
    
    console.log('📄 OCR result:', text);
    
    // Test number extraction
    const numbers = text.match(/\d+(?:,\d+)*(?:\.\d+)?[KMk]?/g);
    console.log('🔢 Found numbers:', numbers);
    
    await worker.terminate();
    
  } catch (error) {
    console.error('❌ Mock test failed:', error);
  }
}

// Run tests
testOCR().then(() => testWithMockInstagramData()).catch(console.error);