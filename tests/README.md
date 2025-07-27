# POS System Test Suite

Simplified test suite focused on essential functionality for the Lengolf Forms POS system.

## Overview

This test suite has been streamlined to focus on three core areas:
- **API Tests**: Critical POS endpoints 
- **Database Tests**: Data integrity and transactions
- **E2E Tests**: True end-to-end workflows

## Test Structure

```
tests/
├── api/                    # API endpoint tests
│   ├── tables.test.ts     # Table management API
│   ├── products.test.ts   # Product catalog API  
│   ├── orders.test.ts     # Order management API
│   ├── payments.test.ts   # Payment processing API
│   └── staff.test.ts      # Staff authentication API
├── database/              # Database integrity tests
│   └── integrity.test.ts  # Constraints and transactions
├── e2e/                   # End-to-end workflow tests
│   ├── complete-pos-workflow.test.ts  # Full customer journey
│   └── mobile-workflow.test.ts        # Mobile-specific flows
└── helpers/               # Test utilities
    ├── api-client.ts      # Simplified API client
    ├── pos-helpers.ts     # POS workflow helpers
    └── test-data.ts       # Test data constants
```

## Running Tests

```bash
# All tests
npm test

# Specific test categories
npm test tests/api/        # API tests only
npm test tests/database/   # Database tests only  
npm test tests/e2e/        # E2E tests only

# Individual test files
npm test tests/api/tables.test.ts
npm test tests/e2e/complete-pos-workflow.test.ts
```

## Test Categories

### API Tests
Test core POS endpoints with focus on:
- **Tables**: Open/close table operations
- **Products**: Catalog browsing and search
- **Orders**: Order creation and modification
- **Payments**: Payment processing flow
- **Staff**: PIN authentication

### Database Tests
Verify data integrity with focus on:
- Transaction atomicity during failures
- Foreign key constraint enforcement
- Data consistency across related tables
- Concurrent operation handling
- Staff PIN validation

### E2E Tests
Test complete user workflows:
- **Complete Workflow**: Table → Order → Payment → Receipt
- **Mobile Workflow**: Touch interactions and responsive design
- **Error Recovery**: Graceful handling of edge cases

## Test Data

Uses predefined test data from `helpers/test-data.ts`:
- **Test Staff**: Manager and staff PINs for authentication
- **Test Products**: Beer, burger, etc. for order testing
- **Test Tables**: Available tables for workflow testing

## Authentication

Tests use development authentication bypass when `SKIP_AUTH=true`:
- Frontend tests work without Google login
- API tests use Bearer tokens from `/api/dev-token`
- All endpoints accessible in development mode

## Mobile Testing

Mobile tests use iPhone 13 device emulation to verify:
- Touch interactions (tap vs click)
- Responsive layout behavior
- Orientation change handling
- Performance on mobile devices

## Performance Expectations

- **Mobile Load Time**: < 15 seconds
- **Touch Response**: < 2 seconds  
- **API Response**: < 5 seconds
- **E2E Workflow**: < 60 seconds

## Debugging

Enable verbose logging with:
```bash
DEBUG=pw:api npm test
```

Console logs show test progress:
- 📋 Table operations
- 🛒 Product selection  
- 💳 Payment processing
- 📱 Mobile interactions
- ✅ Success indicators

## Key Features

- **Simplified**: Focused on essential POS functionality
- **Fast**: Streamlined test execution  
- **Reliable**: Robust error handling and fallbacks
- **Mobile-First**: Touch and responsive design testing
- **Real Workflows**: True end-to-end customer journeys

