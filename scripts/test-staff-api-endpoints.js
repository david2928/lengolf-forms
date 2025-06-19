// Test Script for Staff Management API Endpoints
// Story: STAFF-002 - Staff Management API Endpoints
// This script tests all the staff management endpoints

const BASE_URL = 'http://localhost:3000'; // Change this to your development URL

// Test configuration
const TEST_CONFIG = {
  ADMIN_EMAIL: 'admin@lengolf.com', // Replace with your admin email
  TEST_STAFF_NAME: 'Test Staff Member',
  TEST_STAFF_ID: 'TEST001',
  TEST_PIN: '123456',
  NEW_PIN: '654321'
};

// Helper function to make API requests
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}/api${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const requestOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  console.log(`\n🔗 ${requestOptions.method || 'GET'} ${url}`);
  if (requestOptions.body) {
    console.log('📤 Request Body:', JSON.parse(requestOptions.body));
  }

  try {
    const response = await fetch(url, requestOptions);
    const data = await response.json();
    
    console.log(`📥 Response Status: ${response.status}`);
    console.log('📥 Response Data:', data);
    
    return { response, data };
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return { error };
  }
}

// Test functions
async function testGetAllStaff() {
  console.log('\n🧪 Testing GET /api/staff - List all staff members');
  return await makeRequest('/staff');
}

async function testGetAllStaffWithInactive() {
  console.log('\n🧪 Testing GET /api/staff?includeInactive=true - List all staff including inactive');
  return await makeRequest('/staff?includeInactive=true');
}

async function testCreateStaff() {
  console.log('\n🧪 Testing POST /api/staff - Create new staff member');
  return await makeRequest('/staff', {
    method: 'POST',
    body: JSON.stringify({
      staff_name: TEST_CONFIG.TEST_STAFF_NAME,
      staff_id: TEST_CONFIG.TEST_STAFF_ID,
      pin: TEST_CONFIG.TEST_PIN
    })
  });
}

async function testCreateStaffWithoutStaffId() {
  console.log('\n🧪 Testing POST /api/staff - Create staff without staff_id');
  return await makeRequest('/staff', {
    method: 'POST',
    body: JSON.stringify({
      staff_name: 'Staff Without ID',
      pin: '111111'
    })
  });
}

async function testCreateStaffInvalidPin() {
  console.log('\n🧪 Testing POST /api/staff - Create staff with invalid PIN');
  return await makeRequest('/staff', {
    method: 'POST',
    body: JSON.stringify({
      staff_name: 'Invalid PIN Staff',
      pin: '12345' // Too short
    })
  });
}

async function testGetStaffById(staffId) {
  console.log(`\n🧪 Testing GET /api/staff/${staffId} - Get individual staff details`);
  return await makeRequest(`/staff/${staffId}`);
}

async function testUpdateStaff(staffId) {
  console.log(`\n🧪 Testing PUT /api/staff/${staffId} - Update staff information`);
  return await makeRequest(`/staff/${staffId}`, {
    method: 'PUT',
    body: JSON.stringify({
      staff_name: 'Updated Staff Name',
      staff_id: 'UPDATED001'
    })
  });
}

async function testDeactivateStaff(staffId) {
  console.log(`\n🧪 Testing DELETE /api/staff/${staffId} - Deactivate staff member`);
  return await makeRequest(`/staff/${staffId}`, {
    method: 'DELETE'
  });
}

async function testResetPin(staffId) {
  console.log('\n🧪 Testing POST /api/staff/reset-pin - Reset staff PIN');
  return await makeRequest('/staff/reset-pin', {
    method: 'POST',
    body: JSON.stringify({
      staff_id: staffId,
      new_pin: TEST_CONFIG.NEW_PIN
    })
  });
}

async function testGetStaffStatus() {
  console.log('\n🧪 Testing GET /api/staff/status - Get staff status overview');
  return await makeRequest('/staff/status');
}

async function testUnlockStaff(staffId) {
  console.log('\n🧪 Testing POST /api/staff/unlock - Unlock staff account');
  return await makeRequest('/staff/unlock', {
    method: 'POST',
    body: JSON.stringify({
      staff_id: staffId
    })
  });
}

// Validation tests
async function testValidationErrors() {
  console.log('\n🧪 Testing validation errors');
  
  // Test missing required fields
  console.log('\n📝 Testing missing staff name');
  await makeRequest('/staff', {
    method: 'POST',
    body: JSON.stringify({
      pin: '123456'
    })
  });

  // Test duplicate staff ID
  console.log('\n📝 Testing duplicate staff ID');
  await makeRequest('/staff', {
    method: 'POST',
    body: JSON.stringify({
      staff_name: 'Duplicate Staff',
      staff_id: TEST_CONFIG.TEST_STAFF_ID, // Same as first test staff
      pin: '123456'
    })
  });

  // Test invalid staff ID format
  console.log('\n📝 Testing invalid staff ID in GET');
  await makeRequest('/staff/invalid');

  // Test non-existent staff member
  console.log('\n📝 Testing non-existent staff member');
  await makeRequest('/staff/99999');
}

// Authentication tests
async function testAuthenticationErrors() {
  console.log('\n🧪 Testing authentication errors (these should fail)');
  
  // Note: These tests will fail without proper authentication
  // In a real test environment, you would need to handle authentication properly
  
  console.log('\n🔒 Testing unauthenticated request');
  await makeRequest('/staff');
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Staff Management API Tests');
  console.log('=' .repeat(50));

  let createdStaffId = null;

  try {
    // Basic CRUD tests
    const createResult = await testCreateStaff();
    if (createResult.data?.success && createResult.data?.data?.id) {
      createdStaffId = createResult.data.data.id;
      console.log(`✅ Created staff member with ID: ${createdStaffId}`);
    }

    await testCreateStaffWithoutStaffId();
    await testGetAllStaff();
    await testGetAllStaffWithInactive();

    if (createdStaffId) {
      await testGetStaffById(createdStaffId);
      await testUpdateStaff(createdStaffId);
      await testResetPin(createdStaffId);
      await testUnlockStaff(createdStaffId);
      await testGetStaffStatus();
      
      // Deactivate at the end for cleanup
      await testDeactivateStaff(createdStaffId);
    }

    // Validation tests
    await testCreateStaffInvalidPin();
    await testValidationErrors();

    console.log('\n🎉 All tests completed!');
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('💥 Test suite failed:', error);
  }
}

// Error handling helper
function handleTestError(error, testName) {
  console.error(`❌ ${testName} failed:`, error.message);
}

// Run the tests if this script is executed directly
if (require.main === module) {
  console.log('⚠️  Note: These tests require proper authentication setup');
  console.log('⚠️  Make sure you have admin access and the server is running');
  console.log('⚠️  Update TEST_CONFIG with your admin email\n');
  
  runTests().catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testGetAllStaff,
  testCreateStaff,
  testGetStaffById,
  testUpdateStaff,
  testDeactivateStaff,
  testResetPin,
  testGetStaffStatus,
  testUnlockStaff
}; 