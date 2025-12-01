#!/usr/bin/env node

/**
 * Development Setup Script for Geese
 * 
 * This script helps set up the development environment
 * for the Geese CLI tool.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🦢 Geese Development Setup');
console.log('============================\n');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 16) {
  console.error(`❌ Node.js version ${nodeVersion} is not supported. Please use Node.js 16.0.0 or higher.`);
  process.exit(1);
}

console.log(`✅ Node.js version: ${nodeVersion}`);

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Create global symlink for development
console.log('\n🔗 Creating global symlink for development...');
try {
  execSync('npm link', { stdio: 'inherit' });
  console.log('✅ Global symlink created. You can now run "geese" from anywhere.');
} catch (error) {
  console.warn('⚠️  Failed to create global symlink:', error.message);
  console.log('   You may need to run with administrator privileges.');
  console.log('   Alternatively, you can run "node bin/geese.js" directly.');
}

// Create test environment
console.log('\n🧪 Setting up test environment...');
const testDir = path.join(process.cwd(), 'test-environment');

if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
  
  // Create test files
  fs.writeFileSync(
    path.join(testDir, 'test.js'),
    `function greet(name) {
  return 'Hello, ' + name + '!';
}

module.exports = { greet };
`
  );
  
  fs.writeFileSync(
    path.join(testDir, 'example.geese'),
    `---
include:
  - "*.js"
recipe: "code-review"
temperature: 0.3
project_name: "Test Project"
---

Please review the following file from {{project_name}}:

File: {{filename}}
Content:
{{content}}

Provide feedback on:
1. Code quality
2. Best practices
3. Security considerations
`
  );
  
  console.log('✅ Test environment created with sample files');
}

// Test the CLI
console.log('\n🚀 Testing the CLI...');
try {
  const result = execSync('geese --help', { encoding: 'utf8', stdio: 'pipe' });
  if (result.includes('AI-powered file processing tool')) {
    console.log('✅ CLI is working correctly');
  } else {
    console.warn('⚠️  CLI output unexpected, but no errors occurred');
  }
} catch (error) {
  console.warn('⚠️  CLI test failed:', error.message);
  console.log('   You may need to use "node bin/geese.js --help" instead of "geese --help"');
}

// Print usage instructions
console.log('\n📚 Development Setup Complete!');
console.log('=====================================\n');
console.log('Usage Examples:');
console.log('  geese --help                 # Show help');
console.log('  geese                         # Run in current directory');
console.log('  geese ./test-environment      # Run on test directory');
console.log('  geese --dry-run              # Preview without processing');
console.log('  node bin/geese.js            # Run directly (alternative)');
console.log('\nTest with the example files:');
console.log('  cd test-environment');
console.log('  geese --dry-run');

console.log('\n📖 For more information, see README.md');
console.log('🐛 If you encounter issues, check REQUIREMENTS.md');

console.log('\nHappy coding! 🎉');
