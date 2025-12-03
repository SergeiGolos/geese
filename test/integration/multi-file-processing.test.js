#!/usr/bin/env node

/**
 * Multi-File Processing Integration Tests
 * Tests processing multiple files with include/exclude patterns
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk').default || require('chalk');
const GeeseFileFinder = require('../../src/geese-file-finder');
const GeeseParser = require('../../src/geese-parser');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let passCount = 0;
let failCount = 0;

const TEST_DIR = path.join(os.tmpdir(), 'geese-multi-file-test');

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

function assertEquals(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message || 'Assertion failed'}\n` +
      `  Expected: ${JSON.stringify(expected)}\n` +
      `  Actual: ${JSON.stringify(actual)}`
    );
  }
}

function assertContains(array, item, message) {
  if (!array.includes(item)) {
    throw new Error(`${message || 'Array does not contain expected item'}\n  Looking for: ${item}`);
  }
}

function assertNotContains(array, item, message) {
  if (array.includes(item)) {
    throw new Error(`${message || 'Array should not contain item'}\n  Found: ${item}`);
  }
}

function setup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.removeSync(TEST_DIR);
  }
  fs.ensureDirSync(TEST_DIR);
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.removeSync(TEST_DIR);
  }
}

console.log(chalk.bold('\n🧪 Running Multi-File Processing Integration Tests\n'));

setup();

try {
  // Create test file structure
  const srcDir = path.join(TEST_DIR, 'src');
  const libDir = path.join(TEST_DIR, 'lib');
  const testDir = path.join(TEST_DIR, 'test');
  const distDir = path.join(TEST_DIR, 'dist');
  
  fs.ensureDirSync(srcDir);
  fs.ensureDirSync(libDir);
  fs.ensureDirSync(testDir);
  fs.ensureDirSync(distDir);
  
  // Create test files
  fs.writeFileSync(path.join(srcDir, 'index.js'), '// src/index.js');
  fs.writeFileSync(path.join(srcDir, 'utils.js'), '// src/utils.js');
  fs.writeFileSync(path.join(srcDir, 'helper.ts'), '// src/helper.ts');
  fs.writeFileSync(path.join(libDir, 'core.js'), '// lib/core.js');
  fs.writeFileSync(path.join(testDir, 'test.spec.js'), '// test/test.spec.js');
  fs.writeFileSync(path.join(testDir, 'test.test.js'), '// test/test.test.js');
  fs.writeFileSync(path.join(distDir, 'bundle.js'), '// dist/bundle.js');

  // Test 1: Include pattern matches files
  test('Include pattern matches expected files', () => {
    const parser = new GeeseParser();
    const files = parser.collectTargetFiles(
      { $include: ['src/**/*.js'], $exclude: [] },
      TEST_DIR
    );
    
    assertEquals(files.length, 2, 'Should find 2 JS files in src');
    assertContains(files.map(f => path.basename(f)), 'index.js', 'Should include index.js');
    assertContains(files.map(f => path.basename(f)), 'utils.js', 'Should include utils.js');
  });

  // Test 2: Exclude pattern filters files
  test('Exclude pattern filters out files', () => {
    const parser = new GeeseParser();
    const files = parser.collectTargetFiles(
      { $include: ['**/*.js'], $exclude: ['**/*.test.js', '**/*.spec.js'] },
      TEST_DIR
    );
    
    const basenames = files.map(f => path.basename(f));
    assertNotContains(basenames, 'test.spec.js', 'Should exclude spec files');
    assertNotContains(basenames, 'test.test.js', 'Should exclude test files');
    assertContains(basenames, 'index.js', 'Should include regular JS files');
  });

  // Test 3: Multiple include patterns
  test('Multiple include patterns work together', () => {
    const parser = new GeeseParser();
    const files = parser.collectTargetFiles(
      { $include: ['src/**/*.js', 'lib/**/*.js'], $exclude: [] },
      TEST_DIR
    );
    
    assertEquals(files.length, 3, 'Should find 3 files from src and lib');
    const basenames = files.map(f => path.basename(f));
    assertContains(basenames, 'index.js', 'Should include src files');
    assertContains(basenames, 'core.js', 'Should include lib files');
  });

  // Test 4: Multiple exclude patterns
  test('Multiple exclude patterns work together', () => {
    const parser = new GeeseParser();
    const files = parser.collectTargetFiles(
      {
        $include: ['**/*.js'],
        $exclude: ['**/*.test.js', '**/*.spec.js', 'dist/**']
      },
      TEST_DIR
    );
    
    const basenames = files.map(f => path.basename(f));
    assertNotContains(basenames, 'test.test.js', 'Should exclude .test.js');
    assertNotContains(basenames, 'test.spec.js', 'Should exclude .spec.js');
    assertNotContains(basenames, 'bundle.js', 'Should exclude dist directory');
  });

  // Test 5: TypeScript files can be included
  test('TypeScript files can be included', () => {
    const parser = new GeeseParser();
    const files = parser.collectTargetFiles(
      { $include: ['src/**/*.ts'], $exclude: [] },
      TEST_DIR
    );
    
    assertEquals(files.length, 1, 'Should find 1 TS file');
    assertContains(files.map(f => path.basename(f)), 'helper.ts', 'Should include TypeScript file');
  });

  // Test 6: Multiple file types in single pattern
  test('Multiple file types in single pattern', () => {
    const parser = new GeeseParser();
    const files = parser.collectTargetFiles(
      { $include: ['src/**/*.js', 'src/**/*.ts'], $exclude: [] },
      TEST_DIR
    );
    
    assertEquals(files.length >= 2, true, 'Should find JS and TS files');
  });

  // Test 7: .geese file with include/exclude patterns
  test('.geese file with include/exclude patterns', () => {
    const geeseFile = path.join(TEST_DIR, 'test.geese');
    const content = `---
$include:
  - "src/**/*.js"
  - "lib/**/*.js"
$exclude:
  - "**/*.test.js"
  - "dist/**"
$recipe: "review"
---
Review this file: {{filename}}
`;
    
    fs.writeFileSync(geeseFile, content);
    
    const parser = new GeeseParser();
    const data = parser.parseGeeseFile(geeseFile);
    
    assertEquals(Array.isArray(data.frontmatter.$include), true, '$include should be array');
    assertEquals(data.frontmatter.$include.length, 2, 'Should have 2 include patterns');
    assertEquals(Array.isArray(data.frontmatter.$exclude), true, '$exclude should be array');
  });

  // Test 8: Process multiple files in sequence
  test('Process multiple files in sequence', () => {
    const geeseFile = path.join(TEST_DIR, 'review.geese');
    const content = `---
$include:
  - "src/**/*.js"
$exclude:
  - "**/*.test.js"
$recipe: "review"
count: 0
---
Review: {{filename}}
`;
    
    fs.writeFileSync(geeseFile, content);
    
    const parser = new GeeseParser();
    
    const data = parser.parseGeeseFile(geeseFile);
    const files = parser.collectTargetFiles(data.frontmatter, TEST_DIR);
    
    assertEquals(files.length, 2, 'Should find 2 files to process');
    
    // Simulate processing each file
    const results = files.map(file => {
      const context = parser.prepareContext(data, file);
      return {
        file: path.basename(file),
        hasFilename: context.filename !== undefined,
        hasContent: context.content !== undefined
      };
    });
    
    assertEquals(results.length, 2, 'Should process 2 files');
    assertEquals(results[0].hasFilename, true, 'First file should have filename');
    assertEquals(results[1].hasFilename, true, 'Second file should have filename');
  });

  // Test 9: Empty include/exclude arrays
  test('Empty include/exclude arrays', () => {
    const parser = new GeeseParser();
    
    // Empty include should return empty
    const files1 = parser.collectTargetFiles({ $include: [], $exclude: [] }, TEST_DIR);
    assertEquals(files1.length, 0, 'Empty include should return no files');
  });

  // Test 10: Nested directory patterns
  test('Nested directory patterns work', () => {
    const deepDir = path.join(srcDir, 'components', 'ui');
    fs.ensureDirSync(deepDir);
    fs.writeFileSync(path.join(deepDir, 'button.js'), '// button component');
    
    const parser = new GeeseParser();
    const files = parser.collectTargetFiles(
      { $include: ['src/**/*.js'], $exclude: [] },
      TEST_DIR
    );
    
    const basenames = files.map(f => path.basename(f));
    assertContains(basenames, 'button.js', 'Should find deeply nested file');
  });

  // Test 11: Exclude directory excludes all contents
  test('Exclude directory excludes all contents', () => {
    const parser = new GeeseParser();
    const files = parser.collectTargetFiles(
      { $include: ['**/*.js'], $exclude: ['dist/**', 'test/**'] },
      TEST_DIR
    );
    
    const basenames = files.map(f => path.basename(f));
    assertNotContains(basenames, 'bundle.js', 'Should exclude dist files');
    assertNotContains(basenames, 'test.test.js', 'Should exclude test directory files');
  });

  // Test 12: Discover .geese files in hierarchy
  test('Discover .geese files in hierarchy', async () => {
    const geeseDir = path.join(TEST_DIR, '.geese');
    fs.ensureDirSync(geeseDir);
    fs.writeFileSync(path.join(geeseDir, 'local.geese'), '---\n$recipe: "test"\n---\nTest');
    fs.writeFileSync(path.join(TEST_DIR, 'root.geese'), '---\n$recipe: "test"\n---\nTest');
    
    const finder = new GeeseFileFinder();
    const geeseFiles = await finder.discoverGeeseFiles(TEST_DIR);
    
    if (geeseFiles.length === 0) {
      throw new Error('No .geese files discovered');
    }
    
    // Should find files with source and priority metadata
    const localFile = geeseFiles.find(f => f.source === 'local');
    const rootFile = geeseFiles.find(f => f.source === 'root');
    
    if (!localFile && !rootFile) {
      throw new Error('Should find at least one .geese file');
    }
  });

  // Test 13: Context prepared for each file
  test('Context prepared correctly for each file', () => {
    const geeseFile = path.join(TEST_DIR, 'multi.geese');
    const content = `---
$include:
  - "src/**/*.js"
project: "Test Project"
---
File: {{filename}}
Project: {{project}}
`;
    
    fs.writeFileSync(geeseFile, content);
    
    const parser = new GeeseParser();
    const data = parser.parseGeeseFile(geeseFile);
    
    const file1 = path.join(srcDir, 'index.js');
    const context1 = parser.prepareContext(data, file1);
    
    assertEquals(context1.filename, 'index.js', 'Should have correct filename');
    assertEquals(context1.project, 'Test Project', 'Should have user properties');
    assertContains(context1.content, 'src/index.js', 'Should have file content');
  });

  // Test 14: File processing respects patterns from config
  test('File processing respects patterns from config', () => {
    const geeseFile = path.join(TEST_DIR, 'config-patterns.geese');
    const content = `---
$include:
  - "src/**/*.js"
  - "lib/**/*.js"
$exclude:
  - "**/*.test.js"
  - "**/*.spec.js"
  - "dist/**"
  - "node_modules/**"
$recipe: "review"
---
Content
`;
    
    fs.writeFileSync(geeseFile, content);
    
    const parser = new GeeseParser();
    const data = parser.parseGeeseFile(geeseFile);
    
    const files = parser.collectTargetFiles(data.frontmatter, TEST_DIR);
    
    const basenames = files.map(f => path.basename(f));
    
    // Should include src and lib JS files
    assertContains(basenames, 'index.js', 'Should include src JS');
    assertContains(basenames, 'core.js', 'Should include lib JS');
    
    // Should exclude test files
    assertNotContains(basenames, 'test.test.js', 'Should exclude test files');
    assertNotContains(basenames, 'bundle.js', 'Should exclude dist files');
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
