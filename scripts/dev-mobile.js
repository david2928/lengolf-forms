#!/usr/bin/env node

/**
 * Mobile Development Helper Script
 *
 * This script:
 * 1. Finds your PC's IP address
 * 2. Displays the mobile URL
 * 3. Generates a QR code for easy mobile access
 * 4. Starts the Next.js dev server
 */

const { exec } = require('child_process');
const os = require('os');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

/**
 * Get the local IP address
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();

  // Look for WiFi or Ethernet IPv4 address
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return 'localhost';
}

/**
 * Generate a simple ASCII QR-like code
 * (Real QR code requires external library, this is a simplified version)
 */
function generateQRBox(url) {
  const boxWidth = 60;
  const padding = 2;

  const horizontalLine = '═'.repeat(boxWidth);
  const emptyLine = '║' + ' '.repeat(boxWidth) + '║';

  console.log(`${colors.cyan}╔${horizontalLine}╗${colors.reset}`);

  // Add padding
  for (let i = 0; i < padding; i++) {
    console.log(`${colors.cyan}${emptyLine}${colors.reset}`);
  }

  // Center the URL
  const urlPadding = Math.floor((boxWidth - url.length) / 2);
  const urlLine = '║' + ' '.repeat(urlPadding) + url + ' '.repeat(boxWidth - urlPadding - url.length) + '║';
  console.log(`${colors.cyan}${urlLine}${colors.reset}`);

  // Add padding
  for (let i = 0; i < padding; i++) {
    console.log(`${colors.cyan}${emptyLine}${colors.reset}`);
  }

  console.log(`${colors.cyan}╚${horizontalLine}╝${colors.reset}`);
}

/**
 * Display instructions
 */
function displayInstructions(ip, port) {
  const url = `http://${ip}:${port}`;

  console.log('\n');
  console.log(`${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}${colors.green}   📱 Mobile Testing Setup Complete!${colors.reset}`);
  console.log(`${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log('\n');

  console.log(`${colors.bright}Your PC IP Address:${colors.reset} ${colors.yellow}${ip}${colors.reset}`);
  console.log(`${colors.bright}Port:${colors.reset} ${colors.yellow}${port}${colors.reset}`);
  console.log('\n');

  console.log(`${colors.bright}${colors.magenta}📱 To test on your mobile device:${colors.reset}`);
  console.log(`${colors.cyan}   1. Connect your phone to the SAME WiFi network as this PC${colors.reset}`);
  console.log(`${colors.cyan}   2. Open your mobile browser (Safari/Chrome)${colors.reset}`);
  console.log(`${colors.cyan}   3. Navigate to:${colors.reset}`);
  console.log('\n');

  generateQRBox(url);

  console.log('\n');
  console.log(`${colors.bright}${colors.blue}   ${url}${colors.reset}`);
  console.log('\n');

  console.log(`${colors.yellow}💡 Tip: Bookmark this URL on your phone for quick access!${colors.reset}`);
  console.log('\n');

  console.log(`${colors.bright}${colors.green}✨ Features:${colors.reset}`);
  console.log(`   ${colors.green}✓${colors.reset} Hot reload works instantly on mobile`);
  console.log(`   ${colors.green}✓${colors.reset} Test real keyboard behavior`);
  console.log(`   ${colors.green}✓${colors.reset} No deployment needed`);
  console.log(`   ${colors.green}✓${colors.reset} Completely free`);
  console.log('\n');

  console.log(`${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}${colors.green}   Starting Next.js development server...${colors.reset}`);
  console.log(`${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log('\n');
}

/**
 * Main function
 */
function main() {
  const port = process.env.PORT || 3000;
  const ip = getLocalIP();

  if (ip === 'localhost') {
    console.log(`${colors.yellow}⚠️  Warning: Could not find network IP address.${colors.reset}`);
    console.log(`${colors.yellow}   Make sure you're connected to WiFi.${colors.reset}\n`);
  }

  displayInstructions(ip, port);

  // Start Next.js dev server
  const nextDev = exec('next dev -H 0.0.0.0', {
    cwd: process.cwd(),
    env: { ...process.env }
  });

  // Pipe output
  nextDev.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  nextDev.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  nextDev.on('exit', (code) => {
    process.exit(code);
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log(`\n${colors.yellow}Shutting down dev server...${colors.reset}`);
    nextDev.kill();
    process.exit(0);
  });
}

// Run the script
main();
