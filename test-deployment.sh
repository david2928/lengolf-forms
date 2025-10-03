#!/bin/bash

# Deployment Validation Test Script
# Run this after deploying to verify core functionality

set -e  # Exit on error

echo "================================================"
echo "🧪 DEPLOYMENT VALIDATION TEST SUITE"
echo "================================================"
echo ""

# Configuration
BASE_URL="${1:-http://localhost:3000}"
echo "Testing against: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test
run_test() {
    local test_name="$1"
    local command="$2"

    echo -n "Testing: $test_name... "

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "================================================"
echo "1. HEALTH CHECKS"
echo "================================================"

# Test 1: Homepage loads
run_test "Homepage loads" "curl -f -s $BASE_URL > /dev/null"

# Test 2: API route responds
run_test "Dev token endpoint responds" "curl -f -s $BASE_URL/api/dev-token > /dev/null"

echo ""
echo "================================================"
echo "2. NOTIFICATION SYSTEM"
echo "================================================"

# Test 3: Create notification
echo -n "Creating test notification... "
NOTIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/notify" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "DEPLOYMENT TEST - This is a test notification",
    "bookingType": "Test"
  }')

if echo "$NOTIFY_RESPONSE" | grep -q "notification_id"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))

    # Extract notification ID
    NOTIFICATION_ID=$(echo "$NOTIFY_RESPONSE" | grep -o '"notification_id":"[^"]*"' | cut -d'"' -f4)
    echo "  → Notification ID: $NOTIFICATION_ID"

    # Test 4: Acknowledge notification
    echo -n "Acknowledging notification... "
    ACK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/notifications/$NOTIFICATION_ID/acknowledge" \
      -H "Content-Type: application/json" \
      -d '{"staff_id": 1}')

    if echo "$ACK_RESPONSE" | grep -q "success"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
    fi

    # Test 5: Add notes
    echo -n "Adding internal notes... "
    NOTES_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/notifications/$NOTIFICATION_ID/notes" \
      -H "Content-Type: application/json" \
      -d '{
        "notes": "Deployment test note - verified working",
        "staff_id": 1
      }')

    if echo "$NOTES_RESPONSE" | grep -q "success"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
    fi

else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

# Test 6: Get notifications
run_test "Fetch notifications list" "curl -f -s '$BASE_URL/api/notifications?limit=10' | grep -q 'notifications'"

echo ""
echo "================================================"
echo "3. CRITICAL API ROUTES"
echo "================================================"

# Test critical endpoints
run_test "Customers API" "curl -f -s '$BASE_URL/api/customers?limit=1' > /dev/null"
run_test "Packages API" "curl -f -s '$BASE_URL/api/packages?limit=1' > /dev/null"
run_test "Dashboard API" "curl -f -s '$BASE_URL/api/dashboard/summary' > /dev/null"

echo ""
echo "================================================"
echo "4. BUILD VALIDATION"
echo "================================================"

# Check if this is a local test
if [[ "$BASE_URL" == *"localhost"* ]]; then
    echo -n "TypeScript compilation... "
    if npx tsc --noEmit 2>/dev/null; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
    fi

    echo -n "ESLint check... "
    if npm run lint 2>/dev/null | grep -q "No ESLint warnings"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}⊘ Skipped (remote deployment)${NC}"
fi

echo ""
echo "================================================"
echo "📊 TEST SUMMARY"
echo "================================================"
echo ""
echo "Total Tests Run: $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED - DEPLOYMENT SUCCESSFUL${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED - REVIEW REQUIRED${NC}"
    exit 1
fi
