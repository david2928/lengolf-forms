#!/usr/bin/env node

/**
 * React 19 Compatibility Audit
 * Checks all dependencies for React 19 compatibility and suggests updates
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 React 19 Compatibility Audit\n');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const allDeps = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies
};

const reactDependentPackages = [
  '@radix-ui/react-select',
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-label',
  '@radix-ui/react-navigation-menu',
  '@radix-ui/react-popover',
  '@radix-ui/react-progress',
  '@radix-ui/react-radio-group',
  '@radix-ui/react-slider',
  '@radix-ui/react-switch',
  '@radix-ui/react-tabs',
  '@radix-ui/react-toast',
  '@radix-ui/react-tooltip',
  '@testing-library/react',
  '@testing-library/react-dom',
  'lucide-react',
  '@dnd-kit/core',
  '@dnd-kit/sortable',
  '@dnd-kit/utilities',
  'framer-motion',
  'react-hook-form',
  'react-big-calendar',
  'react-day-picker',
  'react-dropzone',
  'react-signature-canvas',
  '@tanstack/react-table'
];

const problematicPackages = [];
const updatesNeeded = [];

console.log('📦 Checking React-dependent packages...\n');

for (const pkg of reactDependentPackages) {
  if (allDeps[pkg]) {
    try {
      const currentVersion = allDeps[pkg];
      console.log(`Checking ${pkg}@${currentVersion}...`);
      
      // Get peer dependencies for current version
      const result = execSync(`npm view ${pkg}@${currentVersion} peerDependencies --json`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const peerDeps = JSON.parse(result);
      
      if (peerDeps.react && !peerDeps.react.includes('19')) {
        console.log(`❌ ${pkg}@${currentVersion} - React support: ${peerDeps.react}`);
        problematicPackages.push({ pkg, currentVersion, reactSupport: peerDeps.react });
        
        // Check latest version
        try {
          const latestResult = execSync(`npm view ${pkg} versions --json`, { 
            encoding: 'utf8',
            stdio: 'pipe'
          });
          const versions = JSON.parse(latestResult);
          const latestVersion = Array.isArray(versions) ? versions[versions.length - 1] : versions;
          
          const latestPeerResult = execSync(`npm view ${pkg}@${latestVersion} peerDependencies --json`, { 
            encoding: 'utf8',
            stdio: 'pipe'
          });
          const latestPeerDeps = JSON.parse(latestPeerResult);
          
          if (latestPeerDeps.react && latestPeerDeps.react.includes('19')) {
            console.log(`✅ ${pkg}@${latestVersion} - React support: ${latestPeerDeps.react}`);
            updatesNeeded.push({ pkg, currentVersion, latestVersion, currentReact: peerDeps.react, latestReact: latestPeerDeps.react });
          } else {
            console.log(`⚠️  ${pkg}@${latestVersion} - Still no React 19 support: ${latestPeerDeps.react}`);
          }
        } catch (error) {
          console.log(`⚠️  Could not check latest version of ${pkg}`);
        }
      } else if (peerDeps.react) {
        console.log(`✅ ${pkg}@${currentVersion} - React support: ${peerDeps.react}`);
      } else {
        console.log(`ℹ️  ${pkg}@${currentVersion} - No React peer dependency`);
      }
    } catch (error) {
      console.log(`⚠️  Could not check ${pkg} - might not have peer dependencies`);
    }
    console.log('');
  }
}

// Summary
console.log('\n📋 SUMMARY\n');

if (problematicPackages.length === 0) {
  console.log('🎉 All React-dependent packages support React 19!');
} else {
  console.log(`❌ Found ${problematicPackages.length} packages that don't support React 19:`);
  problematicPackages.forEach(({ pkg, currentVersion, reactSupport }) => {
    console.log(`   - ${pkg}@${currentVersion} (supports: ${reactSupport})`);
  });
}

if (updatesNeeded.length > 0) {
  console.log(`\n🔧 RECOMMENDED UPDATES:\n`);
  updatesNeeded.forEach(({ pkg, currentVersion, latestVersion, currentReact, latestReact }) => {
    console.log(`npm install ${pkg}@${latestVersion} --legacy-peer-deps`);
    console.log(`   Current: ${currentVersion} (${currentReact})`);
    console.log(`   Latest:  ${latestVersion} (${latestReact})\n`);
  });
}

console.log('\n🚀 Run these commands to fix React 19 compatibility issues.');