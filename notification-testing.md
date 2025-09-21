# Push Notification Testing Guide

## Quick Test Commands

### Manual API Test (This Works)
```bash
curl -X POST http://localhost:3000/api/push-notifications/send \
  -H "Content-Type: application/json" \
  -H "X-Internal-Request: true" \
  -d '{
    "title": "Manual Test Notification",
    "body": "This is a manual test",
    "conversationId": "manual-test",
    "lineUserId": "manual-test",
    "customerName": "Manual Test"
  }'
```

### Check Current Subscriptions
```bash
curl -X GET http://localhost:3000/api/push-notifications/subscribe \
  -H "Content-Type: application/json"
```

### Test Production API
```bash
curl -X POST https://lengolf-forms.vercel.app/api/push-notifications/send \
  -H "Content-Type: application/json" \
  -H "X-Internal-Request: true" \
  -d '{
    "title": "Production Test Notification",
    "body": "Testing production API",
    "conversationId": "prod-test",
    "lineUserId": "prod-test",
    "customerName": "Production Test"
  }'
```

## Current Status

### ✅ Working
- Webhook receives LINE messages successfully
- Messages stored in database correctly
- Webhook calls notification API successfully
- API reports "sent to 2 users"
- Google FCM accepts notifications (statusCode: 201)
- Manual API tests trigger notifications
- UI button notifications work

### ❌ Not Working
- Real LINE message notifications don't appear
- Webhook-triggered notifications are silent

## Key Findings

### Test13 Logs Show
```
✅ Successfully sent notification to dgeiermann@gmail.com: {
  statusCode: 201,
  body: '',
  headers: { /* FCM success headers */ }
}
```

**This proves**:
- Notifications are reaching Google FCM successfully
- The issue is between FCM and your device
- Not a server-side problem

## Troubleshooting Steps

### 1. Browser Console Test
```javascript
// Run in browser console on Staff LINE Chat page
new Notification("Direct Browser Test", {
  body: "Testing direct browser notification",
  icon: "/favicon.svg"
});
```

### 2. Service Worker Check
```javascript
// Check if service worker is registered
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('SW registrations:', registrations);
});

// Check notification permission
console.log('Notification permission:', Notification.permission);
```

### 3. Manual Push Event Test
```javascript
// Simulate a push event (run in browser console)
navigator.serviceWorker.ready.then(registration => {
  registration.showNotification("Test SW Notification", {
    body: "Testing service worker notification",
    icon: "/favicon.svg",
    tag: "test-sw"
  });
});
```

## Potential Issues

### 1. Browser Notification Suppression
- **Tab Focus**: Notifications suppressed when on the app page
- **Quiet Mode**: Chrome might be in notification quiet mode
- **Permission Issues**: Notification permission might have changed

### 2. Service Worker Issues
- **Event Handling**: SW might not be handling push events correctly
- **Registration**: SW might not be properly registered
- **Updates**: SW might need updating

### 3. Payload Differences
- **Tag Conflicts**: Notifications might be replacing each other
- **Payload Format**: FCM might expect different format
- **Timing Issues**: Rapid notifications might be throttled

### 4. System-Level Issues
- **Windows Focus Assist**: Might be blocking notifications
- **Chrome Settings**: Site-specific notification settings
- **Antivirus**: Security software blocking notifications

## Debug Steps

### Next Investigation
1. Test manual curl command while on different tab
2. Compare webhook payload vs manual payload exactly
3. Check service worker event listeners
4. Test with different notification tags
5. Check Chrome://flags for notification settings

### Log Analysis
The logs show FCM returns 201 (success) but notifications don't appear, suggesting:
- **FCM delivery issue**: FCM accepts but doesn't deliver
- **Service Worker issue**: SW receives but doesn't display
- **Browser suppression**: Browser receives but suppresses

## Comparison: Working vs Not Working

### Manual Test (Works)
- Triggered by curl/UI button
- User manually initiates
- Different timing/context

### Webhook Test (Doesn't Work)
- Triggered by LINE message
- Automatic background process
- Same payload, same API, same FCM response

**Conclusion**: The issue is likely environmental (browser state, timing, focus) rather than technical (code, API, FCM).