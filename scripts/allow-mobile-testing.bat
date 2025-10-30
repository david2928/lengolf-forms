@echo off
REM This script creates a Windows Firewall rule to allow mobile testing
REM Run this as Administrator

echo Creating Windows Firewall rule for mobile testing...
echo.

netsh advfirewall firewall add rule name="Node.js Dev Server (Port 3000)" dir=in action=allow protocol=TCP localport=3000

echo.
echo ✓ Firewall rule created successfully!
echo.
echo You can now access your dev server from mobile devices on the same WiFi.
echo Mobile URL: http://192.168.1.196:3000
echo.
pause
