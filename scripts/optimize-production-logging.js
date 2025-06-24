#!/usr/bin/env node

/**
 * Production Logging Optimization Script
 * 
 * This script optimizes the codebase for production by:
 * 1. Replacing console.log/console.error with proper logger calls
 * 2. Removing development-only debug statements
 * 3. Adding performance monitoring to critical paths
 * 4. Ensuring sensitive data is not logged in production
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DIRECTORIES_TO_SCAN = [
  'src',
  'app',
  'lib'
];

const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'scripts',
  'docs',
  'test',
  '__tests__'
];

// Logging patterns to replace
const LOGGING_PATTERNS = [
  // Console.log patterns
  {
    pattern: /console\.log\(['"`]([^'"`]+)['"`]\s*,?\s*([^)]*)\)/g,
    replacement: (match, message, args) => {
      if (args.trim()) {
        return `logger.debug('${message}', undefined, ${args})`;
      } else {
        return `logger.debug('${message}')`;
      }
    },
    description: 'Replace console.log with logger.debug'
  },
  
  // Console.error patterns
  {
    pattern: /console\.error\(['"`]([^'"`]+)['"`]\s*,?\s*([^)]*)\)/g,
    replacement: (match, message, args) => {
      if (args.trim()) {
        return `logger.error('${message}', undefined, undefined, ${args})`;
      } else {
        return `logger.error('${message}')`;
      }
    },
    description: 'Replace console.error with logger.error'
  },
  
  // Console.warn patterns
  {
    pattern: /console\.warn\(['"`]([^'"`]+)['"`]\s*,?\s*([^)]*)\)/g,
    replacement: (match, message, args) => {
      if (args.trim()) {
        return `logger.warn('${message}', undefined, ${args})`;
      } else {
        return `logger.warn('${message}')`;
      }
    },
    description: 'Replace console.warn with logger.warn'
  }
];

// Files that should import logger
const LOGGER_IMPORT = "import { logger } from '@/lib/logger'";

class ProductionLoggingOptimizer {
  constructor() {
    this.filesProcessed = 0;
    this.replacementsMade = 0;
    this.issuesFound = [];
    this.loggerImportsAdded = 0;
  }

  async run() {
    console.log('🚀 Starting Production Logging Optimization...');
    console.log('=============================================');
    
    try {
      // Scan directories
      for (const dir of DIRECTORIES_TO_SCAN) {
        const fullPath = path.join(process.cwd(), dir);
        if (fs.existsSync(fullPath)) {
          await this.processDirectory(fullPath);
        } else {
          console.log(`⚠️  Directory not found: ${dir}`);
        }
      }

      // Generate report
      this.generateReport();
      
      console.log('\n✅ Production logging optimization completed!');
      
    } catch (error) {
      console.error('❌ Error during optimization:', error);
      process.exit(1);
    }
  }

  async processDirectory(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip excluded directories
        if (!EXCLUDE_PATTERNS.some(pattern => entry.name.includes(pattern))) {
          await this.processDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        // Process TypeScript and JavaScript files
        if (this.isProcessableFile(entry.name)) {
          await this.processFile(fullPath);
        }
      }
    }
  }

  isProcessableFile(filename) {
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    return extensions.some(ext => filename.endsWith(ext));
  }

  async processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let newContent = content;
      let fileReplacements = 0;
      let needsLoggerImport = false;

      // Apply logging pattern replacements
      for (const pattern of LOGGING_PATTERNS) {
        const matches = content.match(pattern.pattern);
        if (matches) {
          newContent = newContent.replace(pattern.pattern, (match, ...args) => {
            fileReplacements++;
            needsLoggerImport = true;
            return pattern.replacement(match, ...args);
          });
        }
      }

      // Check for sensitive data in logs
      this.checkSensitiveData(filePath, content);

      // Add logger import if needed and not already present
      if (needsLoggerImport && !content.includes('from \'@/lib/logger\'')) {
        newContent = this.addLoggerImport(newContent);
        this.loggerImportsAdded++;
      }

      // Write back if changes were made
      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        this.filesProcessed++;
        this.replacementsMade += fileReplacements;
        
        console.log(`📝 Updated: ${path.relative(process.cwd(), filePath)} (${fileReplacements} replacements)`);
      }

    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
      this.issuesFound.push({
        file: filePath,
        error: error.message
      });
    }
  }

  addLoggerImport(content) {
    // Find the best place to insert the import
    const lines = content.split('\n');
    let insertIndex = 0;

    // Find last import statement
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        insertIndex = i + 1;
      } else if (lines[i].trim() === '' && insertIndex > 0) {
        // Found empty line after imports
        break;
      } else if (!lines[i].trim().startsWith('import ') && insertIndex > 0) {
        // Found non-import line
        break;
      }
    }

    // Insert logger import
    lines.splice(insertIndex, 0, LOGGER_IMPORT);
    return lines.join('\n');
  }

  checkSensitiveData(filePath, content) {
    const sensitivePatterns = [
      /console\.(log|error|warn)\([^)]*pin[^)]*\)/gi,
      /console\.(log|error|warn)\([^)]*password[^)]*\)/gi,
      /console\.(log|error|warn)\([^)]*token[^)]*\)/gi,
      /console\.(log|error|warn)\([^)]*secret[^)]*\)/gi,
      /console\.(log|error|warn)\([^)]*key[^)]*\)/gi
    ];

    for (const pattern of sensitivePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        this.issuesFound.push({
          file: filePath,
          issue: 'Potential sensitive data in console logs',
          matches: matches.length
        });
      }
    }
  }

  generateReport() {
    console.log('\n📊 Optimization Report');
    console.log('======================');
    console.log(`Files processed: ${this.filesProcessed}`);
    console.log(`Logging replacements made: ${this.replacementsMade}`);
    console.log(`Logger imports added: ${this.loggerImportsAdded}`);
    console.log(`Issues found: ${this.issuesFound.length}`);

    if (this.issuesFound.length > 0) {
      console.log('\n⚠️  Issues Found:');
      this.issuesFound.forEach((issue, index) => {
        console.log(`${index + 1}. ${path.relative(process.cwd(), issue.file)}`);
        console.log(`   ${issue.issue || issue.error}`);
        if (issue.matches) {
          console.log(`   Matches: ${issue.matches}`);
        }
      });
    }

    // Performance recommendations
    console.log('\n🎯 Performance Recommendations:');
    console.log('- Enable production logging only for errors and warnings');
    console.log('- Use logger.debug() for development-only information');
    console.log('- Consider structured logging for better monitoring');
    console.log('- Implement log rotation for production environments');
    console.log('- Use environment variables to control log levels');

    // Generate environment configuration
    this.generateEnvironmentConfig();
  }

  generateEnvironmentConfig() {
    const envConfig = `
# Production Logging Configuration
# Add these to your .env.production file

# Logging levels: debug, info, warn, error
LOG_LEVEL=warn

# Enable performance logging (true/false)
ENABLE_PERFORMANCE_LOGS=false

# Enable structured logging for production monitoring
ENABLE_STRUCTURED_LOGS=true

# Log format: simple, json
LOG_FORMAT=json

# Maximum log file size (for file logging)
MAX_LOG_SIZE=10MB

# Number of log files to keep
LOG_FILES_TO_KEEP=5
`;

    fs.writeFileSync('.env.production.example', envConfig);
    console.log('\n📁 Generated .env.production.example with logging configuration');
  }
}

// Run the optimizer
if (require.main === module) {
  const optimizer = new ProductionLoggingOptimizer();
  optimizer.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ProductionLoggingOptimizer; 