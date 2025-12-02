#!/usr/bin/env node

/**
 * Simple integration tests for geese CLI
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let passCount = 0;
let failCount = 0;

// Dynamically determine the geese bin path
const GEESE_BIN = path.join(__dirname, 'bin', 'geese.js');

function test(description, fn) {
  try {
    fn();
    console.log(`${GREEN}✓${RESET} ${description}`);
    passCount++;
  } catch (error) {
    console.log(`${RED}✗${RESET} ${description}`);
    console.log(`  ${RED}${error.message}${RESET}`);
    failCount++;
  }
}

function exec(command) {
  return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
}

function cleanup() {
  // Clean up test config
  const configDir = path.join(os.homedir(), '.geese');
  const testDir = '/tmp/geese-cli-test';
  
  if (fs.existsSync(configDir)) {
    fs.removeSync(configDir);
  }
  
  if (fs.existsSync(testDir)) {
    fs.removeSync(testDir);
  }
}

console.log('\n🧪 Running Geese CLI Tests\n');

// Cleanup before tests
cleanup();

// Test 1: Help command
test('geese --help shows help', () => {
  const output = exec(`node ${GEESE_BIN} --help`);
  if (!output.includes('CLI tool for processing .geese files')) {
    throw new Error('Help text not found');
  }
});

// Test 2: Config command - set
test('geese config --set works', () => {
  const output = exec(`node ${GEESE_BIN} config --set test.key "test value"`);
  if (!output.includes('Set test.key')) {
    throw new Error('Config set failed');
  }
});

// Test 3: Config command - get
test('geese config --get works', () => {
  const output = exec(`node ${GEESE_BIN} config --get test.key`);
  if (!output.includes('test value')) {
    throw new Error('Config get failed');
  }
});

// Test 4: Config command - list
test('geese config --list works', () => {
  const output = exec(`node ${GEESE_BIN} config --list`);
  if (!output.includes('test')) {
    throw new Error('Config list failed');
  }
});

// Test 5: New command
test('geese new creates .geese file', () => {
  fs.ensureDirSync('/tmp/geese-cli-test');
  exec(`cd /tmp/geese-cli-test && node ${GEESE_BIN} new test-file -o .`);
  
  const filePath = '/tmp/geese-cli-test/test-file.geese';
  if (!fs.existsSync(filePath)) {
    throw new Error('File not created');
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('---') || !content.includes('include:')) {
    throw new Error('File content invalid');
  }
});

// Test 6: New command with .geese extension
test('geese new handles .geese extension', () => {
  exec(`cd /tmp/geese-cli-test && node ${GEESE_BIN} new another.geese -o .`);
  
  const filePath = '/tmp/geese-cli-test/another.geese';
  if (!fs.existsSync(filePath)) {
    throw new Error('File not created');
  }
});

// Test 7: Parser handles @ prefix (converts to $ prefix for backward compatibility)
test('Parser handles @ prefix in frontmatter', () => {
  const testFile = '/tmp/geese-cli-test/at-prefix.geese';
  const content = `---
@include:
  - "src/**/*.js"
@recipe: "test"
---
Test content`;
  
  fs.writeFileSync(testFile, content);
  
  const GeeseParser = require('./src/geese-parser');
  const parser = new GeeseParser();
  const data = parser.parseGeeseFile(testFile);
  
  // @ prefix should be converted to $ prefix
  if (!data.frontmatter.$include || !data.frontmatter.$recipe) {
    throw new Error('@ prefix not handled correctly');
  }
});

// Test 8: Config defaults applied to new files
test('Config defaults applied to new files', () => {
  exec(`node ${GEESE_BIN} config --set goose.model gpt-4-test`);
  exec(`cd /tmp/geese-cli-test && node ${GEESE_BIN} new with-config -o .`);
  
  const content = fs.readFileSync('/tmp/geese-cli-test/with-config.geese', 'utf8');
  if (!content.includes('gpt-4-test')) {
    throw new Error('Config defaults not applied');
  }
});

// Test 9: File glob patterns work
test('File glob patterns find files correctly', () => {
  fs.ensureDirSync('/tmp/geese-cli-test/src');
  fs.writeFileSync('/tmp/geese-cli-test/src/test1.js', 'test1');
  fs.writeFileSync('/tmp/geese-cli-test/src/test2.js', 'test2');
  
  const GeeseParser = require('./src/geese-parser');
  const parser = new GeeseParser();
  
  const files = parser.collectTargetFiles(
    { include: ['src/**/*.js'], exclude: [] },
    '/tmp/geese-cli-test'
  );
  
  if (files.length !== 2) {
    throw new Error(`Expected 2 files, got ${files.length}`);
  }
});

// Test 10: Exclude patterns work
test('Exclude patterns filter files correctly', () => {
  fs.writeFileSync('/tmp/geese-cli-test/src/test.test.js', 'test');
  
  const GeeseParser = require('./src/geese-parser');
  const parser = new GeeseParser();
  
  const files = parser.collectTargetFiles(
    { include: ['src/**/*.js'], exclude: ['**/*.test.js'] },
    '/tmp/geese-cli-test'
  );
  
  const hasTestFile = files.some(f => f.includes('test.test.js'));
  if (hasTestFile) {
    throw new Error('Exclude pattern did not filter test files');
  }
});

// Test 11: Prototype pollution protection
test('Config manager prevents prototype pollution', () => {
  const ConfigManager = require('./src/config-manager');
  const manager = new ConfigManager();
  
  // Try to pollute prototype
  let error = null;
  try {
    exec(`node ${GEESE_BIN} config --set __proto__.polluted "bad"`);
  } catch (e) {
    error = e;
  }
  
  if (!error || !error.message.includes('Invalid configuration key')) {
    throw new Error('Prototype pollution not prevented');
  }
});

// Cleanup after tests
cleanup();

console.log('\n' + '='.repeat(50));
console.log(`${GREEN}Passed: ${passCount}${RESET}`);
console.log(`${RED}Failed: ${failCount}${RESET}`);
console.log('='.repeat(50) + '\n');

process.exit(failCount > 0 ? 1 : 0);
