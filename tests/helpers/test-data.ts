/**
 * Test Data Factory for POS System Testing
 * 
 * Provides consistent test data for various POS testing scenarios
 */

export interface TestStaff {
  id: number;
  name: string;
  pin: string;
  email: string;
  isActive: boolean;
}

export interface TestCustomer {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
}

export interface TestProduct {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  categoryName: string;
  sku: string;
  description: string;
  isActive: boolean;
}

export interface TestBooking {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  numberOfPeople: number;
  bookingType: string;
  bay: string;
  date: string;
  startTime: string;
  duration: number;
  status: string;
}

export interface TestTable {
  id: string;
  zoneId: string;
  tableNumber: string;
  displayName: string;
  maxPax: number;
  isActive: boolean;
}

/**
 * Test Staff Data
 */
export const TestStaffs: Record<string, TestStaff> = {
  MANAGER: {
    id: 15,
    name: 'Test Manager',
    pin: '133729', // Working test PIN with hash in database
    email: 'manager@test.com',
    isActive: true
  },
  STAFF1: {
    id: 15,
    name: 'Test Manager',
    pin: '133729', // Use same working PIN as manager for testing
    email: 'staff1@test.com',
    isActive: true
  },
  STAFF2: {
    id: 3,
    name: 'Test Staff 2', 
    pin: '345678',
    email: 'staff2@test.com',
    isActive: true
  },
  INACTIVE_STAFF: {
    id: 4,
    name: 'Inactive Staff',
    pin: '456789',
    email: 'inactive@test.com',
    isActive: false
  }
};

/**
 * Test Customer Data
 */
export const TestCustomers: Record<string, TestCustomer> = {
  REGULAR: {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@test.com',
    phoneNumber: '+66812345678'
  },
  VIP: {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@test.com',
    phoneNumber: '+66823456789'
  },
  WALK_IN: {
    id: 3,
    name: 'Walk-in Customer',
    email: '',
    phoneNumber: ''
  }
};

/**
 * Test Product Data
 */
export const TestProducts: Record<string, TestProduct> = {
  BEER: {
    id: '897598e7-d35e-4797-9144-497125e9bba1', // Free Flow Beer
    name: 'Free Flow Beer',
    price: 499,
    categoryId: '550e8400-e29b-41d4-a716-446655440101',
    categoryName: 'Beer',
    sku: '',
    description: 'Free Flow Beer',
    isActive: true
  },
  COFFEE: {
    id: '550e8400-e29b-41d4-a716-446655440002', // Keep as fake UUID - no coffee in DB
    name: 'Americano',
    price: 80,
    categoryId: '550e8400-e29b-41d4-a716-446655440102',
    categoryName: 'Coffee',
    sku: 'COFFEE-AMERICANO',
    description: 'Hot Americano Coffee',
    isActive: true
  },
  BURGER: {
    id: '418063fe-215e-4476-91eb-ff56a3147d4c', // Smith's Burger
    name: 'Smith\'s Burger',
    price: 330,
    categoryId: '550e8400-e29b-41d4-a716-446655440201',
    categoryName: 'Main Course',
    sku: 'lengolf-Smith\'s Burger',
    description: 'Smith\'s Burger',
    isActive: true
  },
  GOLF_BALLS: {
    id: '550e8400-e29b-41d4-a716-446655440004', // Keep as fake UUID - no golf balls in DB
    name: 'Golf Balls (Dozen)',
    price: 450,
    categoryId: '550e8400-e29b-41d4-a716-446655440301',
    categoryName: 'Golf Equipment',
    sku: 'GOLF-BALLS-DOZEN',
    description: 'Professional golf balls - 12 pieces',
    isActive: true
  },
  RANGE_PACKAGE: {
    id: 'aa704102-8cf4-4482-a5c4-e6119c5a3e65', // Small Package (S)
    name: 'Small Package (S)',
    price: 9999,
    categoryId: '550e8400-e29b-41d4-a716-446655440401',
    categoryName: 'Range Packages',
    sku: '',
    description: 'Small Package (S)',
    isActive: true
  }
};

/**
 * Test Booking Data
 */
export const TestBookings: Record<string, TestBooking> = {
  REGULAR_BOOKING: {
    id: 'BK25072500DB', // Use real existing booking
    name: 'Joe',
    email: 'pawis.joe@gmail.com',
    phoneNumber: '+66867763185',
    numberOfPeople: 4,
    bookingType: 'range',
    bay: 'A1',
    date: '2025-01-26',
    startTime: '14:00',
    duration: 60,
    status: 'confirmed'
  },
  GROUP_BOOKING: {
    id: 'booking-002',
    name: 'Corporate Event',
    email: 'events@company.com',
    phoneNumber: '+66856789012',
    numberOfPeople: 8,
    bookingType: 'event',
    bay: 'B1-B4',
    date: '2025-01-26',
    startTime: '10:00',
    duration: 180,
    status: 'confirmed'
  }
};

/**
 * Test Table Data
 */
export const TestTables: Record<string, TestTable> = {
  BAR_TABLE_1: {
    id: '650e8400-e29b-41d4-a716-446655440001',
    zoneId: '750e8400-e29b-41d4-a716-446655440001',
    tableNumber: 'B1',
    displayName: 'Bar Table 1',
    maxPax: 4,
    isActive: true
  },
  BAR_TABLE_2: {
    id: '650e8400-e29b-41d4-a716-446655440002',
    zoneId: '750e8400-e29b-41d4-a716-446655440001',
    tableNumber: 'B2',
    displayName: 'Bar Table 2',
    maxPax: 6,
    isActive: true
  },
  BAY_TABLE_1: {
    id: '650e8400-e29b-41d4-a716-446655440003',
    zoneId: '750e8400-e29b-41d4-a716-446655440002',
    tableNumber: 'A1',
    displayName: 'Bay A1',
    maxPax: 8,
    isActive: true
  },
  BAY_TABLE_2: {
    id: '650e8400-e29b-41d4-a716-446655440004',
    zoneId: '750e8400-e29b-41d4-a716-446655440002',
    tableNumber: 'A2',
    displayName: 'Bay A2',
    maxPax: 6,
    isActive: true
  }
};

/**
 * Test Order Items
 */
export const TestOrderItems = {
  SIMPLE_ORDER: [
    {
      productId: TestProducts.BEER.id,
      quantity: 1,
      modifiers: [],
      notes: null
    },
    {
      productId: TestProducts.BURGER.id,
      quantity: 1,
      modifiers: [],
      notes: 'No pickles'
    }
  ],
  
  COMPLEX_ORDER: [
    {
      productId: TestProducts.BEER.id,
      quantity: 3,
      modifiers: ['Extra Cold'],
      notes: 'Different table delivery'
    },
    {
      productId: TestProducts.BURGER.id,
      quantity: 2,
      modifiers: [],
      notes: 'Extra sauce'
    },
    {
      productId: TestProducts.RANGE_PACKAGE.id,
      quantity: 1,
      modifiers: [],
      notes: 'Bay A1'
    }
  ]
};

/**
 * Test Payment Methods
 */
export const TestPaymentMethods = {
  CASH_ONLY: [
    { method: 'Cash', amount: 520 }
  ],
  
  CARD_ONLY: [
    { method: 'Visa', amount: 520 }
  ],
  
  SPLIT_PAYMENT: [
    { method: 'Cash', amount: 300 },
    { method: 'PromptPay', amount: 220 }
  ],
  
  MULTIPLE_CARDS: [
    { method: 'Visa', amount: 250 },
    { method: 'Mastercard', amount: 270 }
  ]
};

/**
 * Helper function to calculate order total
 */
export function calculateOrderTotal(orderItems: any[]): number {
  return orderItems.reduce((sum, item) => {
    // If item already has totalPrice, use it
    if (typeof item.totalPrice === 'number') {
      return sum + item.totalPrice;
    }
    
    // Otherwise, calculate from product price and quantity
    const product = Object.values(TestProducts).find(p => p.id === item.productId);
    if (product) {
      return sum + (product.price * (item.quantity || 1));
    }
    
    console.warn('Product not found for productId:', item.productId);
    return sum;
  }, 0);
}

/**
 * Helper function to calculate VAT amount (7%)
 */
export function calculateVAT(total: number): number {
  return Math.round(total * 0.07 * 100) / 100;
}

/**
 * Helper function to calculate subtotal (total - VAT)
 */
export function calculateSubtotal(total: number): number {
  return total - calculateVAT(total);
}

/**
 * Generate test receipt number
 */
export function generateTestReceiptNumber(): string {
  const timestamp = Date.now().toString().slice(-8);
  return `TEST-${timestamp}`;
}

/**
 * Generate random test data
 */
export function randomStaff(): TestStaff {
  const staffList = Object.values(TestStaffs).filter(s => s.isActive);
  return staffList[Math.floor(Math.random() * staffList.length)];
}

export function randomProduct(): TestProduct {
  const productList = Object.values(TestProducts).filter(p => p.isActive);
  return productList[Math.floor(Math.random() * productList.length)];
}

export function randomTable(): TestTable {
  const tableList = Object.values(TestTables).filter(t => t.isActive);
  return tableList[Math.floor(Math.random() * tableList.length)];
}

export function randomCustomer(): TestCustomer {
  const customerList = Object.values(TestCustomers);
  return customerList[Math.floor(Math.random() * customerList.length)];
}