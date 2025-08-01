# POS Session Timeout Implementation

## ✅ **5-Minute Session Timeout Complete**

### **Features Implemented**

#### **1. Automatic Logout After 5 Minutes**
- **Timeout Duration**: 5 minutes (300,000ms) of inactivity
- **Automatic Logout**: Session automatically expires and returns to login screen
- **Clean Logout**: Clears all session data and localStorage

#### **2. Activity-Based Timeout Reset**
- **Activity Detection**: Monitors mouse clicks, movements, keyboard input, scrolling, and touch
- **Smart Reset**: Any user activity resets the 5-minute timer
- **Throttled Tracking**: Activity is throttled to once per 30 seconds to avoid excessive resets

#### **3. Session Persistence & Recovery**
- **Reload Protection**: Sessions survive page refreshes if still within 5-minute window
- **Expired Session Cleanup**: Automatically clears expired sessions on page load
- **Accurate Timing**: Uses precise timestamps to calculate remaining session time

### **Technical Implementation**

#### **Session Storage**
```typescript
// Stores both staff data and login timestamp
localStorage.setItem('pos_staff', JSON.stringify(staffData));
localStorage.setItem('pos_staff_login_time', Date.now().toString());
```

#### **Timeout Logic**
```typescript
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Auto-logout after 5 minutes
setTimeout(() => {
  console.log('Session timeout - logging out after 5 minutes of inactivity');
  logout();
}, SESSION_TIMEOUT);
```

#### **Activity Tracking**
```typescript
const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

const handleActivity = () => {
  const now = Date.now();
  // Throttle to once per 30 seconds
  if (now - lastActivityRef.current > 30000) {
    resetTimeout(); // Reset the 5-minute timer
  }
};
```

### **User Experience**

#### **Session Flow**
1. **Login**: Staff enters PIN → 5-minute timer starts
2. **Activity**: Any interaction resets timer back to 5 minutes
3. **Inactivity**: After 5 minutes of no activity → automatic logout
4. **Re-login**: Staff must enter PIN again to continue

#### **What Triggers Timer Reset**
- ✅ **Mouse clicks** (buttons, product selection, etc.)
- ✅ **Mouse movement** (moving cursor around screen)
- ✅ **Keyboard input** (typing in search, notes, etc.)
- ✅ **Scrolling** (browsing products, transactions)
- ✅ **Touch events** (tablet/mobile interactions)

#### **What Doesn't Reset Timer**
- ❌ Background API calls
- ❌ Automatic data refreshes  
- ❌ Server-side updates
- ❌ Network activity without user interaction

### **Security Features**

#### **Session Validation**
- **On Page Load**: Checks if stored session is still within 5-minute window
- **Expired Sessions**: Automatically clears and requires re-login
- **Corrupted Data**: Handles and cleans up invalid session data

#### **Clean Logout Process**
```typescript
const logout = () => {
  setStaff(null);
  localStorage.removeItem('pos_staff');
  localStorage.removeItem('pos_staff_login_time');
  clearTimeout(timeoutRef.current);
};
```

### **Testing**

#### **How to Test 5-Minute Timeout**
1. **Login** to POS with staff PIN
2. **Wait 5 minutes** without touching screen/keyboard/mouse
3. **Verify** automatic logout to login screen
4. **Confirm** need to re-enter PIN

#### **How to Test Activity Reset**
1. **Login** to POS 
2. **Wait 4 minutes** (almost timeout)
3. **Click anywhere** on screen
4. **Verify** timer resets (should not logout for another 5 minutes)

#### **How to Test Session Persistence**
1. **Login** to POS
2. **Refresh page** within 5 minutes
3. **Verify** still logged in (no re-login required)
4. **Wait for session to expire**
5. **Refresh page** 
6. **Verify** redirected to login screen

## 🚀 **Production Ready**

The POS session timeout system is now active and ready for production:

- ✅ **5-minute inactivity timeout**
- ✅ **Activity-based timer reset**
- ✅ **Automatic logout and cleanup**
- ✅ **Session persistence across page reloads**
- ✅ **Secure session validation**
- ✅ **Clean user experience**

### **Configuration**

To change the timeout duration, modify the `SESSION_TIMEOUT` constant in `src/hooks/use-staff-auth.tsx`:

```typescript
// Current: 5 minutes
const SESSION_TIMEOUT = 5 * 60 * 1000;

// Examples:
const SESSION_TIMEOUT = 3 * 60 * 1000;  // 3 minutes
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
```

The system will automatically adapt to any timeout duration while maintaining all security and UX features.