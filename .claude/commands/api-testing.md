# API Testing Commands

## Available API Endpoints

### Authentication
- `GET /api/auth/session` - Get current session
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out

### Bookings
- `POST /api/bookings/create` - Create booking
- `GET /api/bookings/list-by-date?date=YYYY-MM-DD` - List bookings by date
- `GET /api/bookings/availability` - Check availability
- `POST /api/bookings/calendar/events` - Get calendar events

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Refresh customer cache
- `GET /api/customers/with-packages` - Customers with packages

### Packages
- `GET /api/packages/monitor` - Package monitoring data
- `GET /api/packages/available` - Available packages
- `POST /api/packages/activate` - Activate package
- `GET /api/packages/by-customer/[id]` - Customer packages
- `POST /api/packages/usage` - Record usage

### Admin (requires admin role)
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/sales-dashboard` - Sales analytics

### Utility
- `GET /api/debug` - Debug information
- `GET /api/test-db` - Test database connection

## Test with Development Token

### Get Token
```bash
# Get development token
TOKEN=$(curl -s http://localhost:3000/api/dev-token | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: $TOKEN"
```

### Use Token for API Testing
```bash
# Test customers API
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/customers

# Test packages API
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/packages/monitor

# Test dashboard API
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/dashboard/summary?start_date=2025-07-01&end_date=2025-07-05"
```

## Test with Puppeteer

### Basic Testing
```javascript
// Open the application
await page.goto('http://localhost:3000');
await page.screenshot({ path: 'homepage.png' });

// Get development token
const tokenResponse = await page.evaluate(async () => {
  const response = await fetch('/api/dev-token');
  return response.json();
});
console.log('Token:', tokenResponse.token);
```

### API Testing via Browser
```javascript
// Test API endpoints through browser
const customersResponse = await page.evaluate(async () => {
  const tokenRes = await fetch('/api/dev-token');
  const { token } = await tokenRes.json();
  
  const customersRes = await fetch('/api/customers', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return customersRes.json();
});
console.log('Customers:', customersResponse.length);
```

### Form Interaction Testing
```javascript
// Test booking form
await page.goto('http://localhost:3000/create-booking');
await page.waitForSelector('form');

// Fill and submit form
await page.type('input[name="name"]', 'Test Customer');
await page.type('input[name="email"]', 'test@example.com');
await page.click('button[type="submit"]');
```

### Admin Page Testing
```javascript
// Navigate to admin section
await page.goto('http://localhost:3000/admin');
await page.waitForSelector('.admin-dashboard');

// Test sales dashboard
await page.click('a[href="/admin/sales-dashboard"]');
await page.waitForSelector('.sales-chart');
await page.screenshot({ path: 'admin-dashboard.png' });
```

## Test with cURL (Legacy)

```bash
# Set base URL
BASE_URL="http://localhost:3000"

# Test database connection (no auth required)
curl "$BASE_URL/api/test-db"

# Test debug endpoint (no auth required)
curl "$BASE_URL/api/debug"
```