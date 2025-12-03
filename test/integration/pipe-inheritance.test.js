#!/usr/bin/env node

/**
 * Pipe Operations Inheritance Integration Tests
 * Tests pipe operations inheritance across configuration levels
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk').default || require('chalk');
const GeeseParser = require('../../src/geese-parser');
const PipeOperations = require('../../src/pipe-operations');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let passCount = 0;
let failCount = 0;

const TEST_DIR = path.join(os.tmpdir(), 'geese-pipe-inheritance-test');

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

function assertContains(str, substring, message) {
  if (!str.includes(substring)) {
    throw new Error(`${message || 'String does not contain expected substring'}\n  Looking for: ${substring}`);
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

console.log(chalk.bold('\n🧪 Running Pipe Operations Inheritance Integration Tests\n'));

setup();

try {
  // Test 1: Basic pipe operation in .geese file
  test('Basic pipe operation in .geese file', () => {
    const geeseFile = path.join(TEST_DIR, 'basic-pipe.geese');
    const content = `---
$include:
  - "**/*.js"
title:   Code Review   ~> trim
---
# {{title}}
`;
    
    fs.writeFileSync(geeseFile, content);
    fs.writeFileSync(path.join(TEST_DIR, 'test.js'), '// test');
    
    const parser = new GeeseParser();
    const data = parser.parseGeeseFile(geeseFile);
    const context = parser.prepareContext(data, path.join(TEST_DIR, 'test.js'));
    
    assertEquals(context.title, 'Code Review', 'Pipe operation should trim spaces');
  });

  // Test 2: Chained pipe operations
  test('Chained pipe operations', () => {
    const geeseFile = path.join(TEST_DIR, 'chained-pipe.geese');
    const content = `---
$recipe: test
project: my project ~> toUpperCase ~> replace " " -
---
Project: {{project}}
`;
    
    fs.writeFileSync(geeseFile, content);
    fs.writeFileSync(path.join(TEST_DIR, 'test.js'), '// test');
    
    const parser = new GeeseParser();
    const data = parser.parseGeeseFile(geeseFile);
    const context = parser.prepareContext(data, path.join(TEST_DIR, 'test.js'));
    
    assertEquals(context.project, 'MY-PROJECT', 'Chained operations should work');
  });

  // Test 3: Multiple pipe operations on different properties
  test('Multiple pipe operations on different properties', () => {
    const geeseFile = path.join(TEST_DIR, 'multiple-pipes.geese');
    const content = `---
$recipe: test
title: code review ~> toUpperCase
author:   john doe   ~> trim
date: 2024-01-15 ~> default Not Set
---
Content
`;
    
    fs.writeFileSync(geeseFile, content);
    fs.writeFileSync(path.join(TEST_DIR, 'test.js'), '// test');
    
    const parser = new GeeseParser();
    const data = parser.parseGeeseFile(geeseFile);
    const context = parser.prepareContext(data, path.join(TEST_DIR, 'test.js'));
    
    assertEquals(context.title, 'CODE REVIEW', 'Title should be uppercase');
    assertEquals(context.author, 'john doe', 'Author should be trimmed');
    assertEquals(context.date, '2024-01-15', 'Date should use original value');
  });

  // Test 4: Pipe operations with list operations
  test('Pipe operations with list operations', () => {
    const geeseFile = path.join(TEST_DIR, 'list-pipes.geese');
    const content = `---
$recipe: test
file_types: js,jsx,ts,tsx ~> split , ~> join " | "
---
Types: {{file_types}}
`;
    
    fs.writeFileSync(geeseFile, content);
    fs.writeFileSync(path.join(TEST_DIR, 'test.js'), '// test');
    
    const parser = new GeeseParser();
    const data = parser.parseGeeseFile(geeseFile);
    const context = parser.prepareContext(data, path.join(TEST_DIR, 'test.js'));
    
    assertEquals(context.file_types, 'js | jsx | ts | tsx', 'List operations should work');
  });

  // Test 5: Pipe operations with numbers
  test('Pipe operations with numbers', () => {
    const geeseFile = path.join(TEST_DIR, 'number-pipes.geese');
    const content = `---
$recipe: test
count: 42 ~> parseInt
---
Count: {{count}}
`;
    
    fs.writeFileSync(geeseFile, content);
    fs.writeFileSync(path.join(TEST_DIR, 'test.js'), '// test');
    
    const parser = new GeeseParser();
    const data = parser.parseGeeseFile(geeseFile);
    const context = parser.prepareContext(data, path.join(TEST_DIR, 'test.js'));
    
    assertEquals(context.count, 42, 'parseInt should convert to number');
  });

  // Test 6: Pipe operations inherit from base config
  test('Pipe operations work with base config', () => {
    const geeseFile = path.join(TEST_DIR, 'inherit-pipes.geese');
    const content = `---
$recipe: test
title: review ~> toUpperCase
---
Title: {{title}}
`;
    
    fs.writeFileSync(geeseFile, content);
    fs.writeFileSync(path.join(TEST_DIR, 'test.js'), '// test');
    
    const baseConfig = {
      recipe: 'base-recipe',
      model: 'gpt-4'
    };
    
    const parser = new GeeseParser();
    const data = parser.parseGeeseFile(geeseFile, baseConfig);
    const context = parser.prepareContext(data, path.join(TEST_DIR, 'test.js'));
    
    assertEquals(context.title, 'REVIEW', 'Pipe operations should work with base config');
    assertEquals(data.frontmatter.$recipe, 'test', '.geese file should override base config');
  });

  // Test 7: Pipe operations with substring
  test('Pipe operations with substring', () => {
    const geeseFile = path.join(TEST_DIR, 'substring-pipes.geese');
    const content = `---
$recipe: test
summary: This is a long summary ~> substring 0 10
---
Summary: {{summary}}
`;
    
    fs.writeFileSync(geeseFile, content);
    fs.writeFileSync(path.join(TEST_DIR, 'test.js'), '// test');
    
    const parser = new GeeseParser();
    const data = parser.parseGeeseFile(geeseFile);
    const context = parser.prepareContext(data, path.join(TEST_DIR, 'test.js'));
    
    assertEquals(context.summary, 'This is a ', 'Substring should work');
  });

  // Test 8: Pipe operations with default values
  test('Pipe operations with default values', () => {
    const geeseFile = path.join(TEST_DIR, 'default-pipes.geese');
    const content = `---
$recipe: test
optional1:  ~> default DefaultValue
optional2: ActualValue ~> default DefaultValue
---
Content
`;
    
    fs.writeFileSync(geeseFile, content);
    fs.writeFileSync(path.join(TEST_DIR, 'test.js'), '// test');
    
    const parser = new GeeseParser();
    const data = parser.parseGeeseFile(geeseFile);
    const context = parser.prepareContext(data, path.join(TEST_DIR, 'test.js'));
    
    assertEquals(context.optional1, 'DefaultValue', 'Empty string should use default');
    assertEquals(context.optional2, 'ActualValue', 'Non-empty should keep original');
  });

  // Test 9: Complex pipe operation chain
  test('Complex pipe operation chain', () => {
    const geeseFile = path.join(TEST_DIR, 'complex-pipes.geese');
    const content = `---
$recipe: test
formatted:   hello world   ~> trim ~> toUpperCase ~> replace " " - ~> substring 0 10
---
Formatted: {{formatted}}
`;
    
    fs.writeFileSync(geeseFile, content);
    fs.writeFileSync(path.join(TEST_DIR, 'test.js'), '// test');
    
    const parser = new GeeseParser();
    const data = parser.parseGeeseFile(geeseFile);
    const context = parser.prepareContext(data, path.join(TEST_DIR, 'test.js'));
    
    assertEquals(context.formatted, 'HELLO-WORL', 'Complex chain should work');
  });

  // Test 10: Pipe operations are available through PipeOperations class
  test('PipeOperations class executes operations', () => {
    const pipeOps = new PipeOperations();
    
    const result1 = pipeOps.execute('trim', '  hello  ', [], {});
    assertEquals(result1, 'hello', 'Trim should work');
    
    const result2 = pipeOps.execute('toUpperCase', 'hello', [], {});
    assertEquals(result2, 'HELLO', 'toUpperCase should work');
    
    const result3 = pipeOps.execute('replace', 'hello world', ['world', 'universe'], {});
    assertEquals(result3, 'hello universe', 'replace should work');
  });

  // Test 11: Pipe operations in template context
  test('Pipe operations work in parsed context', () => {
    const geeseFile = path.join(TEST_DIR, 'context-pipes.geese');
    const content = `---
$recipe: "test"
$include:
  - "**/*.js"
project_name: "my app" ~> toUpperCase
---
# {{project_name}}
File: {{filename}}
`;
    
    fs.writeFileSync(geeseFile, content);
    fs.writeFileSync(path.join(TEST_DIR, 'test.js'), '// test file');
    
    const parser = new GeeseParser();
    const data = parser.parseGeeseFile(geeseFile);
    const context = parser.prepareContext(data, path.join(TEST_DIR, 'test.js'));
    
    assertEquals(context.project_name, 'MY APP', 'Context should have processed pipe');
    assertEquals(context.filename, 'test.js', 'Context should have filename');
  });

  // Test 12: Backward compatibility with @ prefix converted to $ prefix
  test('Backward compatibility: @ prefix converted to $ prefix', () => {
    const geeseFile = path.join(TEST_DIR, 'at-prefix.geese');
    const content = `---
@include:
  - "**/*.js"
@recipe: test
title: review ~> toUpperCase
---
Title: {{title}}
`;
    
    fs.writeFileSync(geeseFile, content);
    fs.writeFileSync(path.join(TEST_DIR, 'test.js'), '// test');
    
    const parser = new GeeseParser();
    const data = parser.parseGeeseFile(geeseFile);
    const context = parser.prepareContext(data, path.join(TEST_DIR, 'test.js'));
    
    // @ prefix should be converted to $ prefix
    if (!data.frontmatter.$include || !data.frontmatter.$recipe) {
      throw new Error('@ prefix not converted to $ prefix');
    }
    
    assertEquals(context.title, 'REVIEW', 'Pipe operations should still work');
  });

  // Test 13: Pipe operations handle empty values
  test('Pipe operations handle empty values', () => {
    const geeseFile = path.join(TEST_DIR, 'empty-pipes.geese');
    const content = `---
$recipe: test
empty1:  ~> toUpperCase
empty2:  ~> trim
---
Content
`;
    
    fs.writeFileSync(geeseFile, content);
    fs.writeFileSync(path.join(TEST_DIR, 'test.js'), '// test');
    
    const parser = new GeeseParser();
    const data = parser.parseGeeseFile(geeseFile);
    const context = parser.prepareContext(data, path.join(TEST_DIR, 'test.js'));
    
    assertEquals(context.empty1, '', 'Empty string uppercase should be empty');
    assertEquals(context.empty2, '', 'Empty string trim should be empty');
  });

  // Test 14: Template rendering uses processed pipe values
  test('Template rendering uses processed pipe values', () => {
    const geeseFile = path.join(TEST_DIR, 'render-pipes.geese');
    const content = `---
$recipe: test
title: code review ~> toUpperCase
status:   completed   ~> trim
---
# {{title}}
Status: {{status}}
`;
    
    fs.writeFileSync(geeseFile, content);
    fs.writeFileSync(path.join(TEST_DIR, 'test.js'), '// test');
    
    const parser = new GeeseParser();
    const data = parser.parseGeeseFile(geeseFile);
    const context = parser.prepareContext(data, path.join(TEST_DIR, 'test.js'));
    const rendered = parser.renderTemplate(data.template, context);
    
    assertContains(rendered, 'CODE REVIEW', 'Rendered should use uppercase title');
    assertContains(rendered, 'completed', 'Rendered should use trimmed status');
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
