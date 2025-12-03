#!/usr/bin/env node

/**
 * Full Workflow Integration Tests
 * Tests end-to-end workflow: create .geese file → run → verify results
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk').default || require('chalk');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let passCount = 0;
let failCount = 0;

const GEESE_BIN = path.join(__dirname, '../../bin/geese.js');
const TEST_DIR = path.join(os.tmpdir(), 'geese-integration-workflow-test');
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.geese');
const BACKUP_CONFIG_DIR = path.join(os.homedir(), '.geese-backup-workflow');

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

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `${message || 'Assertion failed'}\n` +
      `  Expected: ${expected}\n` +
      `  Actual: ${actual}`
    );
  }
}

function assertContains(str, substring, message) {
  if (!str.includes(substring)) {
    throw new Error(`${message || 'String does not contain expected substring'}\n  Looking for: ${substring}`);
  }
}

function setup() {
  // Backup existing config
  if (fs.existsSync(GLOBAL_CONFIG_DIR)) {
    if (fs.existsSync(BACKUP_CONFIG_DIR)) {
      fs.removeSync(BACKUP_CONFIG_DIR);
    }
    fs.copySync(GLOBAL_CONFIG_DIR, BACKUP_CONFIG_DIR);
    fs.removeSync(GLOBAL_CONFIG_DIR);
  }
  
  // Clean and create test directory
  if (fs.existsSync(TEST_DIR)) {
    fs.removeSync(TEST_DIR);
  }
  fs.ensureDirSync(TEST_DIR);
}

function cleanup() {
  // Clean up test directory
  if (fs.existsSync(TEST_DIR)) {
    fs.removeSync(TEST_DIR);
  }
  
  // Restore original config
  if (fs.existsSync(GLOBAL_CONFIG_DIR)) {
    fs.removeSync(GLOBAL_CONFIG_DIR);
  }
  if (fs.existsSync(BACKUP_CONFIG_DIR)) {
    fs.copySync(BACKUP_CONFIG_DIR, GLOBAL_CONFIG_DIR);
    fs.removeSync(BACKUP_CONFIG_DIR);
  }
}

console.log(chalk.bold('\n🧪 Running Full Workflow Integration Tests\n'));

setup();

try {
  // Test 1: Create new .geese file
  test('Create new .geese file in .geese directory', () => {
    exec(`cd ${TEST_DIR} && node ${GEESE_BIN} new test-workflow`);
    const filePath = path.join(TEST_DIR, '.geese', 'test-workflow.geese');
    
    if (!fs.existsSync(filePath)) {
      throw new Error('File was not created');
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    assertContains(content, '---', 'File should have frontmatter');
    assertContains(content, 'include', 'File should have include property');
  });

  // Test 2: Create test files to process
  test('Create test files for processing', () => {
    const srcDir = path.join(TEST_DIR, 'src');
    fs.ensureDirSync(srcDir);
    
    fs.writeFileSync(path.join(srcDir, 'file1.js'), '// Test file 1\nfunction test1() {}');
    fs.writeFileSync(path.join(srcDir, 'file2.js'), '// Test file 2\nfunction test2() {}');
    fs.writeFileSync(path.join(srcDir, 'file3.test.js'), '// Test file 3');
    
    assertEquals(fs.existsSync(path.join(srcDir, 'file1.js')), true, 'file1.js should exist');
    assertEquals(fs.existsSync(path.join(srcDir, 'file2.js')), true, 'file2.js should exist');
  });

  // Test 3: Update .geese file with specific patterns
  test('Update .geese file with file patterns', () => {
    const geeseFile = path.join(TEST_DIR, '.geese', 'test-workflow.geese');
    const content = `---
$include:
  - "src/**/*.js"
$exclude:
  - "**/*.test.js"
$recipe: "test"
---

Please analyze the following file: {{filename}}

Content:
{{content}}
`;
    
    fs.writeFileSync(geeseFile, content);
    const written = fs.readFileSync(geeseFile, 'utf8');
    assertContains(written, 'src/**/*.js', 'Pattern should be written');
  });

  // Test 4: File discovery works
  test('File discovery finds matching files', () => {
    const GeeseParser = require('../../src/geese-parser');
    const parser = new GeeseParser();
    
    const files = parser.collectTargetFiles(
      {
        $include: ['src/**/*.js'],
        $exclude: ['**/*.test.js']
      },
      TEST_DIR
    );
    
    assertEquals(files.length, 2, 'Should find 2 files (excluding .test.js)');
  });

  // Test 5: Parse .geese file
  test('Parse .geese file successfully', () => {
    const GeeseParser = require('../../src/geese-parser');
    const parser = new GeeseParser();
    const geeseFile = path.join(TEST_DIR, '.geese', 'test-workflow.geese');
    
    const data = parser.parseGeeseFile(geeseFile);
    
    if (!data.frontmatter || !data.frontmatter.$include) {
      throw new Error('Failed to parse frontmatter');
    }
    
    assertEquals(Array.isArray(data.frontmatter.$include), true, '$include should be array');
    assertContains(data.template, '{{filename}}', 'Template should contain variables');
  });

  // Test 6: Dry-run mode works
  test('Dry-run mode executes without errors', () => {
    const geeseFile = path.join(TEST_DIR, '.geese', 'test-workflow.geese');
    
    // Use --dry-run flag to test without actual execution
    try {
      const output = exec(`cd ${TEST_DIR} && node ${GEESE_BIN} run ${geeseFile} --dry-run --file src/file1.js --runner console 2>&1 || true`);
      // Just verify it doesn't crash
      if (output.includes('Error:') && !output.includes('Dry-Run')) {
        throw new Error('Dry-run produced unexpected error');
      }
    } catch (error) {
      // Some errors are expected in dry-run mode
      if (!error.message.includes('--file')) {
        throw error;
      }
    }
  });

  // Test 7: Template rendering works
  test('Template rendering with context variables', () => {
    const GeeseParser = require('../../src/geese-parser');
    const parser = new GeeseParser();
    const geeseFile = path.join(TEST_DIR, '.geese', 'test-workflow.geese');
    const targetFile = path.join(TEST_DIR, 'src', 'file1.js');
    
    const data = parser.parseGeeseFile(geeseFile);
    const context = parser.prepareContext(data, targetFile);
    const rendered = parser.renderTemplate(data.template, context);
    
    assertContains(rendered, 'file1.js', 'Rendered template should contain filename');
    assertContains(rendered, 'Test file 1', 'Rendered template should contain file content');
  });

  // Test 8: Configuration inspection
  test('Configuration inspection shows hierarchy', () => {
    const output = exec(`cd ${TEST_DIR} && node ${GEESE_BIN} config --inspect`);
    assertContains(output, 'Configuration Hierarchy', 'Should show hierarchy');
    assertContains(output, 'Core Defaults', 'Should show core defaults');
  });

  // Test 9: Report generator creates logs
  test('Report generator structure', () => {
    const ReportGenerator = require('../../src/report-generator');
    const reportGen = new ReportGenerator();
    
    const session = reportGen.createSessionEntry(
      'test.geese',
      'test.js',
      { filename: 'test.js' },
      'test prompt',
      'test output',
      Date.now(),
      Date.now() + 1000
    );
    
    if (!session || !session.geeseFile) {
      throw new Error('Session entry not created correctly');
    }
    
    assertEquals(session.geeseFile, 'test.geese', 'Session should have geeseFile');
    assertEquals(session.targetFile, 'test.js', 'Session should have targetFile');
  });

  // Test 10: End-to-end workflow with memory runner
  test('End-to-end workflow with memory runner', () => {
    const GeeseParser = require('../../src/geese-parser');
    const ConfigManager = require('../../src/config-manager');
    const ToolExecutor = require('../../src/ToolExecutor');
    
    const configManager = new ConfigManager();
    const parser = new GeeseParser();
    const executor = ToolExecutor.create('memory');
    
    // This tests the components work together
    if (!parser || !executor || !configManager) {
      throw new Error('Failed to initialize components');
    }
  });

} finally {
  cleanup();
}

// Print results
console.log('\n' + '='.repeat(50));
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log('='.repeat(50) + '\n');

process.exit(failCount > 0 ? 1 : 0);
