# 📱 Mobile Testing Quick Reference

## Your Configuration

**PC IP Address:** `192.168.1.196`
**Mobile URL:** `http://192.168.1.196:3000`

---

## Quick Start

**IMPORTANT: First-time setup requires allowing port 3000 through Windows Firewall!**

### Step 1: Allow Firewall Access (One-time setup)

**Option A: PowerShell (Recommended)**
```powershell
# Right-click PowerShell and select "Run as Administrator"
cd C:\vs_code\lengolf-forms-feature\lengolf-forms
.\scripts\allow-mobile-testing.ps1
```

**Option B: Batch File**
```bash
# Right-click and select "Run as Administrator"
scripts\allow-mobile-testing.bat
```

**Option C: Manual Firewall Rule**
1. Open Windows Defender Firewall with Advanced Security
2. Click "Inbound Rules" → "New Rule"
3. Select "Port" → Next
4. TCP, Specific port: 3000 → Next
5. Allow the connection → Next
6. Check all profiles (Domain, Private, Public) → Next
7. Name: "Node.js Dev Server (Port 3000)" → Finish

### Step 2: Start Dev Server

```bash
# Recommended: Shows IP and instructions
npm run dev:mobile

# Alternative: Standard dev server
npm run dev
```

---

## Step-by-Step Instructions

1. **On Your PC:**
   ```bash
   npm run dev:mobile
   ```

2. **On Your Phone:**
   - Connect to the SAME WiFi network as your PC
   - Open Safari (iOS) or Chrome (Android)
   - Navigate to: `http://192.168.1.196:3000`
   - Bookmark this URL for future use!

3. **Start Testing:**
   - Tap input fields
   - See real keyboard behavior
   - Test viewport resize
   - Watch layout adjustments
   - All changes hot-reload instantly! ⚡

---

## Features

- ✅ **Real Device Testing** - Test on actual phone with real keyboard
- ✅ **Instant Hot Reload** - Changes appear immediately on mobile
- ✅ **Completely Free** - No cloud services, no subscriptions
- ✅ **No Deployment** - Test before pushing to production
- ✅ **Fast Iteration** - Make changes and see results in seconds

---

## Troubleshooting

### Can't Connect to Mobile URL?

**Check 1: Windows Firewall (MOST COMMON ISSUE)**
- This is usually the problem!
- Run the firewall setup script as Administrator:
  ```powershell
  # Right-click PowerShell → "Run as Administrator"
  .\scripts\allow-mobile-testing.ps1
  ```
- Or manually allow port 3000 through Windows Firewall

**Check 2: Same WiFi Network**
- Verify PC and phone on same WiFi
- Not just "WiFi" - must be the EXACT same network
- Check WiFi name on both devices

**Check 3: Dev Server Running**
```bash
# Make sure server is running:
npm run dev:mobile

# You should see: "Ready on http://0.0.0.0:3000"
```

**Check 4: Test on PC First**
- Open browser on PC
- Try: `http://192.168.1.196:3000`
- If this doesn't work, firewall is blocking it

**Check 4: IP Address Changed**
- WiFi IP can change when you move networks
- Re-run `ipconfig` to get new IP:
  ```bash
  ipconfig
  # Look for "IPv4 Address" under WiFi adapter
  ```

### Page Loads but Auth Issues?

Make sure `SKIP_AUTH=true` in `.env.local`:
```bash
# Check .env.local file contains:
SKIP_AUTH=true
```

---

## Testing Checklist

When testing mobile keyboard behavior:

- [ ] Input field visible when keyboard appears?
- [ ] Submit button accessible with keyboard open?
- [ ] Page scrolls to keep focused input visible?
- [ ] Layout doesn't break with keyboard overlay?
- [ ] Fixed position elements stay in correct position?
- [ ] Viewport height adjusts properly?
- [ ] Can close keyboard and UI returns to normal?
- [ ] Multiple inputs on same page work correctly?

---

## Advanced: Chrome Remote Debugging

For even better mobile debugging (Android only):

1. **Enable USB Debugging on Android:**
   - Settings → About Phone → Tap "Build number" 7 times
   - Settings → Developer Options → USB Debugging ON

2. **Connect Phone via USB**

3. **On PC Chrome:**
   - Navigate to: `chrome://inspect#devices`
   - Click "Inspect" next to your mobile browser tab

4. **Result:**
   - Full DevTools on PC
   - Real keyboard on phone
   - Best of both worlds!

---

## Current Chat Fix Testing

The recent chat interface fix should now show:
- ✅ Input box fixed to bottom of screen
- ✅ No excessive spacing above keyboard
- ✅ Proper padding for messages above input
- ✅ iOS safe area handled correctly

**Test URL:** `http://192.168.1.196:3000/staff/line-chat`

---

## Tips

1. **Bookmark on Phone:** Add the URL to your home screen for instant access
2. **Keep Server Running:** Leave `npm run dev:mobile` running while testing
3. **Check Console:** Look for errors in browser DevTools
4. **Test Portrait & Landscape:** Rotate phone to test both orientations
5. **Test Different Keyboards:** Try different input types (text, email, number)

---

## Need Help?

- **IP Address Changed:** Run `ipconfig` on PC to find new IP
- **Port Already in Use:** Stop other dev servers or use different port
- **Still Not Working:** Try restarting both PC and phone WiFi

---

**Last Updated:** January 2025
**Your PC IP:** 192.168.1.196
**Port:** 3000
