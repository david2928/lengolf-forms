#!/usr/bin/env node

/**
 * Simple API Performance Test
 * Tests both dashboard endpoints for response time and caching effectiveness
 */

const BASE_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

async function testEndpoint(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  console.log(`\n🔍 Testing: ${endpoint}`);
  console.log(`URL: ${url}`);
  
  const results = [];
  
  // Test 3 times to check caching
  for (let i = 1; i <= 3; i++) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (!response.ok) {
        console.log(`❌ Request ${i} failed: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      
      results.push({
        request: i,
        duration,
        cached: data.cached || false,
        success: data.success,
        serverDuration: data.duration_ms || null
      });
      
      console.log(`✅ Request ${i}: ${duration}ms (server: ${data.duration_ms}ms) ${data.cached ? '🟡 CACHED' : '🟢 FRESH'}`);
      
    } catch (error) {
      console.log(`❌ Request ${i} error:`, error.message);
    }
    
    // Small delay between requests
    if (i < 3) await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

async function runPerformanceTests() {
  console.log('🚀 Starting API Performance Tests');
  console.log('=====================================');
  
  const testParams = {
    start_date: '2024-05-01',
    end_date: '2024-05-31'
  };
  
  try {
    // Test Summary Endpoint
    const summaryResults = await testEndpoint('/api/dashboard/summary', testParams);
    
    // Test Charts Endpoint  
    const chartsResults = await testEndpoint('/api/dashboard/charts', testParams);
    
    // Generate Report
    console.log('\n📊 Performance Report');
    console.log('=====================');
    
    function analyzeResults(results, endpointName) {
      if (results.length === 0) {
        console.log(`❌ ${endpointName}: No successful requests`);
        return;
      }
      
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const cachedRequests = results.filter(r => r.cached).length;
      const freshRequests = results.filter(r => !r.cached).length;
      
      console.log(`\n${endpointName}:`);
      console.log(`  Average Response Time: ${avgDuration.toFixed(0)}ms`);
      console.log(`  Fresh Requests: ${freshRequests}`);
      console.log(`  Cached Requests: ${cachedRequests}`);
      console.log(`  Cache Hit Rate: ${((cachedRequests / results.length) * 100).toFixed(1)}%`);
      
      if (freshRequests > 0) {
        const freshAvg = results.filter(r => !r.cached).reduce((sum, r) => sum + r.duration, 0) / freshRequests;
        console.log(`  Fresh Request Avg: ${freshAvg.toFixed(0)}ms`);
      }
      
      if (cachedRequests > 0) {
        const cachedAvg = results.filter(r => r.cached).reduce((sum, r) => sum + r.duration, 0) / cachedRequests;
        console.log(`  Cached Request Avg: ${cachedAvg.toFixed(0)}ms`);
      }
      
      // Performance Assessment
      const maxFreshTime = 2000; // 2 seconds
      const maxCachedTime = 100; // 100ms
      
      const freshOk = !freshRequests || results.filter(r => !r.cached).every(r => r.duration <= maxFreshTime);
      const cachedOk = !cachedRequests || results.filter(r => r.cached).every(r => r.duration <= maxCachedTime);
      
      if (freshOk && cachedOk) {
        console.log(`  ✅ Performance: GOOD`);
      } else {
        console.log(`  ⚠️  Performance: NEEDS IMPROVEMENT`);
        if (!freshOk) console.log(`     - Fresh requests too slow (>${maxFreshTime}ms)`);
        if (!cachedOk) console.log(`     - Cached requests too slow (>${maxCachedTime}ms)`);
      }
    }
    
    analyzeResults(summaryResults, '📈 Summary Endpoint');
    analyzeResults(chartsResults, '📊 Charts Endpoint');
    
    console.log('\n🎯 Performance Targets:');
    console.log('  Fresh Requests: < 2000ms');
    console.log('  Cached Requests: < 100ms');
    console.log('  Cache Hit Rate: > 50%');
    
  } catch (error) {
    console.error('❌ Test suite error:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runPerformanceTests()
    .then(() => {
      console.log('\n✅ Performance tests completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Performance tests failed:', error);
      process.exit(1);
    });
}

module.exports = { testEndpoint, runPerformanceTests }; 