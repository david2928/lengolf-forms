# Login to Local Application

## Quick Login Process

1. **Start the local server** (if not already running):
   ```bash
   cd /mnt/c/vs_code/lengolf-forms
   npm run dev
   ```

2. **Login via browser automation**:
   - Open http://localhost:3000 in Puppeteer
   - Click the "Sign In" button
   - Complete Google OAuth flow
   - Extract session cookies/tokens

3. **Alternative: Direct API authentication**:
   ```bash
   # Test if server is running
   curl -I http://localhost:3000/api/debug
   
   # Login endpoint (if available)
   curl -X POST http://localhost:3000/api/auth/signin \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@lengolf.com", "password": "admin123"}'
   ```

## Test Endpoints

### Health Check
```bash
curl http://localhost:3000/api/test-db
```

### Customer Data
```bash
curl http://localhost:3000/api/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Booking Data
```bash
curl "http://localhost:3000/api/bookings/list-by-date?date=2024-01-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Package Monitor
```bash
curl http://localhost:3000/api/packages/monitor \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Session Management

- Session cookies are stored in browser
- NextAuth.js handles JWT tokens
- Session duration: 30 days
- Check session: `curl http://localhost:3000/api/auth/session`

## Admin-Only Endpoints

These require admin role in the `allowed_users` table:

```bash
# Admin dashboard data
curl http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Sales dashboard
curl http://localhost:3000/api/admin/sales-dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```