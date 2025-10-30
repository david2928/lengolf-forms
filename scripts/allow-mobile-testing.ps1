# PowerShell script to enable mobile testing by allowing port 3000 through Windows Firewall
# Run this as Administrator

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Mobile Testing Firewall Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To run as Administrator:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

# Check if rule already exists
$ruleName = "Node.js Dev Server (Port 3000)"
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "Firewall rule already exists!" -ForegroundColor Green
    Write-Host "Rule Name: $ruleName" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "Creating firewall rule..." -ForegroundColor Yellow

    # Create the firewall rule
    New-NetFirewallRule -DisplayName $ruleName `
                        -Direction Inbound `
                        -Action Allow `
                        -Protocol TCP `
                        -LocalPort 3000 `
                        -Profile Any `
                        -Description "Allows mobile devices on the same WiFi network to access the Next.js development server for testing"

    Write-Host "SUCCESS: Firewall rule created!" -ForegroundColor Green
    Write-Host ""
}

# Get current IP address
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" -ErrorAction SilentlyContinue).IPAddress

if ($ipAddress) {
    Write-Host "Your PC IP Address: $ipAddress" -ForegroundColor Cyan
    $mobileUrl = "http://" + $ipAddress + ":3000"
    Write-Host "Mobile URL: $mobileUrl" -ForegroundColor Green
} else {
    Write-Host "Could not detect WiFi IP address." -ForegroundColor Yellow
    Write-Host "Run 'ipconfig' to find your IP address manually." -ForegroundColor Yellow
    $ipAddress = "YOUR_IP_ADDRESS"
    $mobileUrl = "http://YOUR_IP_ADDRESS:3000"
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Make sure dev server is running: npm run dev:mobile" -ForegroundColor White
Write-Host "2. Connect your phone to the SAME WiFi network" -ForegroundColor White
Write-Host "3. Open mobile browser and go to: $mobileUrl" -ForegroundColor White
Write-Host ""

pause
