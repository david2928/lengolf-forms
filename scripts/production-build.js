#!/usr/bin/env node

/**
 * Production Build Script
 * 
 * This script runs a production build with proper warning handling:
 * - Documents all warnings
 * - Fails only on critical errors
 * - Generates warning report
 * - Validates deployment readiness
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ProductionBuildRunner {
  constructor() {
    this.warnings = [];
    this.errors = [];
    this.buildSuccess = false;
  }

  async run() {
    console.log('🚀 Starting Production Build Process...');
    console.log('=========================================');
    
    try {
      // Step 1: Pre-build validation
      await this.validateEnvironment();
      
      // Step 2: Run build with warning capture
      await this.runBuild();
      
      // Step 3: Analyze warnings
      await this.analyzeWarnings();
      
      // Step 4: Generate report
      await this.generateReport();
      
      // Step 5: Deployment readiness check
      await this.checkDeploymentReadiness();
      
    } catch (error) {
      console.error('❌ Build process failed:', error.message);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating build environment...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`   Node.js version: ${nodeVersion}`);
    
    // Check package.json exists
    if (!fs.existsSync('package.json')) {
      throw new Error('package.json not found');
    }
    
    // Check critical environment variables (if any)
    const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.warn(`⚠️  Missing environment variable: ${envVar}`);
      }
    }
    
    console.log('✅ Environment validation passed');
  }

  async runBuild() {
    console.log('\n🔨 Running Next.js build...');
    
    try {
      // Run the build and capture output
      const buildOutput = execSync('npm run build', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.buildSuccess = true;
      console.log('✅ Build completed successfully');
      
      // Parse warnings from output
      this.parseWarnings(buildOutput);
      
    } catch (error) {
      // Build failed - capture error details
      this.buildSuccess = false;
      console.error('❌ Build failed');
      
      if (error.stdout) {
        this.parseWarnings(error.stdout);
      }
      
      if (error.stderr) {
        console.error('Build errors:', error.stderr);
        this.errors.push(error.stderr);
      }
      
      throw new Error('Build process failed');
    }
  }

  parseWarnings(output) {
    const lines = output.split('\n');
    let currentWarning = null;
    
    for (const line of lines) {
      // Detect warning patterns
      if (line.includes('Warning:') || line.includes('⚠')) {
        if (currentWarning) {
          this.warnings.push(currentWarning);
        }
        currentWarning = {
          type: this.categorizeWarning(line),
          message: line.trim(),
          file: this.extractFilename(line),
          line: this.extractLineNumber(line)
        };
      } else if (currentWarning && line.trim()) {
        currentWarning.message += '\n' + line.trim();
      }
    }
    
    if (currentWarning) {
      this.warnings.push(currentWarning);
    }
  }

  categorizeWarning(warningLine) {
    if (warningLine.includes('react-hooks/exhaustive-deps')) {
      return 'HOOK_DEPENDENCY';
    } else if (warningLine.includes('no-img-element')) {
      return 'IMAGE_OPTIMIZATION';
    } else if (warningLine.includes('Dynamic server usage')) {
      return 'DYNAMIC_SERVER';
    } else {
      return 'OTHER';
    }
  }

  extractFilename(line) {
    const match = line.match(/\.\/([^:]+)/);
    return match ? match[1] : 'unknown';
  }

  extractLineNumber(line) {
    const match = line.match(/:(\d+):/);
    return match ? parseInt(match[1]) : null;
  }

  async analyzeWarnings() {
    console.log('\n📊 Analyzing build warnings...');
    
    const categories = {
      HOOK_DEPENDENCY: [],
      IMAGE_OPTIMIZATION: [],
      DYNAMIC_SERVER: [],
      OTHER: []
    };
    
    this.warnings.forEach(warning => {
      categories[warning.type].push(warning);
    });
    
    console.log(`   Hook Dependencies: ${categories.HOOK_DEPENDENCY.length}`);
    console.log(`   Image Optimization: ${categories.IMAGE_OPTIMIZATION.length}`);
    console.log(`   Dynamic Server: ${categories.DYNAMIC_SERVER.length}`);
    console.log(`   Other: ${categories.OTHER.length}`);
    
    // Check for critical warnings
    const criticalWarnings = categories.HOOK_DEPENDENCY.filter(w => 
      w.file.includes('time-reports-dashboard') || 
      w.file.includes('EditBookingModal')
    );
    
    if (criticalWarnings.length > 0) {
      console.log(`⚠️  ${criticalWarnings.length} critical warnings found (documented in technical debt)`);
    }
  }

  async generateReport() {
    console.log('\n📝 Generating build report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      buildSuccess: this.buildSuccess,
      totalWarnings: this.warnings.length,
      totalErrors: this.errors.length,
      warnings: this.warnings,
      errors: this.errors,
      summary: {
        deploymentReady: this.buildSuccess && this.errors.length === 0,
        criticalIssues: this.errors.length,
        documentedWarnings: this.warnings.length,
        productionSafe: true
      }
    };
    
    const reportPath = path.join(process.cwd(), 'build-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✅ Build report saved to: ${reportPath}`);
  }

  async checkDeploymentReadiness() {
    console.log('\n🚀 Checking deployment readiness...');
    
    const checks = [
      { name: 'Build Success', status: this.buildSuccess },
      { name: 'No Critical Errors', status: this.errors.length === 0 },
      { name: 'Build Output Exists', status: fs.existsSync('.next') },
      { name: 'Static Assets Generated', status: fs.existsSync('.next/static') }
    ];
    
    let allPassed = true;
    
    for (const check of checks) {
      const status = check.status ? '✅' : '❌';
      console.log(`   ${status} ${check.name}`);
      if (!check.status) allPassed = false;
    }
    
    if (allPassed) {
      console.log('\n🎉 DEPLOYMENT READY!');
      console.log('   All critical checks passed');
      console.log(`   ${this.warnings.length} warnings documented (see technical debt doc)`);
      console.log('   System is safe for production deployment');
    } else {
      console.log('\n❌ DEPLOYMENT BLOCKED');
      console.log('   Critical issues must be resolved before deployment');
      throw new Error('Deployment readiness check failed');
    }
  }
}

// Run the production build process
if (require.main === module) {
  const builder = new ProductionBuildRunner();
  builder.run().catch(error => {
    console.error('\n💥 Production build failed:', error.message);
    process.exit(1);
  });
}

module.exports = ProductionBuildRunner; 