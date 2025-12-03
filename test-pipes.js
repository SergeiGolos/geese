#!/usr/bin/env node

/**
 * Pipe Operations Test Suite
 */

const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const chalk = require('chalk').default || require('chalk');
const PipeOperations = require('./src/pipe-operations');
const GeeseParser = require('./src/geese-parser');

// Create instances
const pipeOperations = new PipeOperations();

// Get cross-platform temp directory
const TEMP_DIR = os.tmpdir();

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(chalk.green('✓') + ` ${name}`);
    passed++;
  } catch (error) {
    console.log(chalk.red('✗') + ` ${name}`);
    console.log(chalk.red('  Error:'), error.message);
    failed++;
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

console.log(chalk.bold('\n🧪 Running Pipe Operations Tests\n'));

// Test 1: String operations
test('trim operation', () => {
  const result = pipeOperations.execute('trim', '  hello  ', [], {});
  assertEquals(result, 'hello');
});

test('substring operation', () => {
  const result = pipeOperations.execute('substring', 'hello world', ['0', '5'], {});
  assertEquals(result, 'hello');
});

test('toUpperCase operation', () => {
  const result = pipeOperations.execute('toUpperCase', 'hello', [], {});
  assertEquals(result, 'HELLO');
});

test('toLowerCase operation', () => {
  const result = pipeOperations.execute('toLowerCase', 'HELLO', [], {});
  assertEquals(result, 'hello');
});

test('replace operation', () => {
  const result = pipeOperations.execute('replace', 'hello world', ['world', 'universe'], {});
  assertEquals(result, 'hello universe');
});

test('split operation', () => {
  const result = pipeOperations.execute('split', 'a,b,c', [','], {});
  assertEquals(result, ['a', 'b', 'c']);
});

test('join operation', () => {
  const result = pipeOperations.execute('join', ['a', 'b', 'c'], [' | '], {});
  assertEquals(result, 'a | b | c');
});

// Test 2: List operations
test('filter operation', () => {
  const result = pipeOperations.execute('filter', ['apple', 'banana', 'apricot'], ['^a'], {});
  assertEquals(result, ['apple', 'apricot']);
});

test('map operation', () => {
  const result = pipeOperations.execute('map', [{ name: 'a' }, { name: 'b' }], ['name'], {});
  assertEquals(result, ['a', 'b']);
});

test('select operation', () => {
  const result = pipeOperations.execute('select', ['a', 'b', 'c'], ['1'], {});
  assertEquals(result, 'b');
});

test('first operation', () => {
  const result = pipeOperations.execute('first', ['a', 'b', 'c'], [], {});
  assertEquals(result, 'a');
});

test('last operation', () => {
  const result = pipeOperations.execute('last', ['a', 'b', 'c'], [], {});
  assertEquals(result, 'c');
});

test('length operation', () => {
  const result = pipeOperations.execute('length', ['a', 'b', 'c'], [], {});
  assertEquals(result, 3);
});

// Test 3: Type operations
test('parseJson operation', () => {
  const result = pipeOperations.execute('parseJson', '{"a":1}', [], {});
  assertEquals(result, { a: 1 });
});

test('stringify operation', () => {
  const result = pipeOperations.execute('stringify', { a: 1 }, ['0'], {});
  assertEquals(result, '{"a":1}');
});

test('parseInt operation', () => {
  const result = pipeOperations.execute('parseInt', '42', [], {});
  assertEquals(result, 42);
});

test('parseFloat operation', () => {
  const result = pipeOperations.execute('parseFloat', '3.14', [], {});
  assertEquals(result, 3.14);
});

// Test 4: Utility operations
test('default operation with empty value', () => {
  const result = pipeOperations.execute('default', '', ['fallback'], {});
  assertEquals(result, 'fallback');
});

test('default operation with non-empty value', () => {
  const result = pipeOperations.execute('default', 'value', ['fallback'], {});
  assertEquals(result, 'value');
});

// Test 5: Pipe chain execution
test('executePipeChain with single operation', () => {
  const result = pipeOperations.executePipeChain('  hello  ~> trim', {});
  assertEquals(result, 'hello');
});

test('executePipeChain with multiple operations', () => {
  const result = pipeOperations.executePipeChain('  hello world  ~> trim ~> toUpperCase', {});
  assertEquals(result, 'HELLO WORLD');
});

test('executePipeChain with operations and arguments', () => {
  const result = pipeOperations.executePipeChain('hello world ~> substring 0 5', {});
  assertEquals(result, 'hello');
});

test('executePipeChain with complex chain', () => {
  const result = pipeOperations.executePipeChain('  code review report  ~> trim ~> toUpperCase ~> replace " " "-"', {});
  assertEquals(result, 'CODE-REVIEW-REPORT');
});

test('executePipeChain without pipes', () => {
  const result = pipeOperations.executePipeChain('just a value', {});
  assertEquals(result, 'just a value');
});

// Test 6: File operations
test('readFile operation', () => {
  // Create a temp file
  const tempDir = path.join(TEMP_DIR, 'geese-pipe-test');
  fs.ensureDirSync(tempDir);
  const tempFile = path.join(tempDir, 'test.txt');
  fs.writeFileSync(tempFile, 'test content', 'utf8');
  
  const context = { _geeseFileDir: tempDir };
  const result = pipeOperations.execute('readFile', './test.txt', [], context);
  assertEquals(result, 'test content');
  
  // Cleanup
  fs.removeSync(tempDir);
});

// Test 7: Regex operations
test('match operation', () => {
  const result = pipeOperations.execute('match', 'hello123world456', ['\\d+', 'g'], {});
  assertEquals(result, ['123', '456']);
});

test('test operation', () => {
  const result = pipeOperations.execute('test', 'hello123', ['\\d+'], {});
  assertEquals(result, true);
});

// Test 8: GeeseParser integration with $ prefix
test('Parser handles $ prefix for system properties', () => {
  const tempDir = path.join(TEMP_DIR, 'geese-parser-test');
  fs.ensureDirSync(tempDir);
  const testFile = path.join(tempDir, 'test.geese');
  
  const content = `---
$include:
  - "*.js"
$exclude:
  - "*.test.js"
$recipe: "test"
user_prop: "value"
---
Test template`;
  
  fs.writeFileSync(testFile, content, 'utf8');
  
  const parser = new GeeseParser();
  const parsed = parser.parseGeeseFile(testFile);
  
  // Check that $include was parsed correctly
  if (!parsed.frontmatter.$include) {
    throw new Error('$include not found in frontmatter');
  }
  assertEquals(parsed.frontmatter.$include, ['*.js']);
  assertEquals(parsed.frontmatter.$exclude, ['*.test.js']);
  assertEquals(parsed.frontmatter.user_prop, 'value');
  
  // Cleanup
  fs.removeSync(tempDir);
});

// Test 9: Parser with @ prefix backward compatibility
test('Parser converts @ prefix to $ prefix', () => {
  const tempDir = path.join(TEMP_DIR, 'geese-parser-test2');
  fs.ensureDirSync(tempDir);
  const testFile = path.join(tempDir, 'test.geese');
  
  const content = `---
@include:
  - "*.js"
@recipe: "test"
user_prop: "value"
---
Test template`;
  
  fs.writeFileSync(testFile, content, 'utf8');
  
  const parser = new GeeseParser();
  const parsed = parser.parseGeeseFile(testFile);
  
  // Check that @include was converted to $include
  if (!parsed.frontmatter.$include) {
    throw new Error('@ prefix was not converted to $ prefix');
  }
  assertEquals(parsed.frontmatter.$include, ['*.js']);
  
  // Cleanup
  fs.removeSync(tempDir);
});

// Test 10: Parser processes pipe operations in context
test('Parser executes pipe operations in prepareContext', () => {
  const tempDir = path.join(TEMP_DIR, 'geese-parser-test3');
  fs.ensureDirSync(tempDir);
  
  const testGeese = path.join(tempDir, 'test.geese');
  const targetFile = path.join(tempDir, 'target.js');
  
  const geeseContent = `---
$include:
  - "*.js"
$recipe: "test"
my_value: '"  hello  " ~> trim ~> toUpperCase'
my_number: '"42" ~> parseInt'
---
Test template`;
  
  fs.writeFileSync(testGeese, geeseContent, 'utf8');
  fs.writeFileSync(targetFile, 'console.log("test");', 'utf8');
  
  const parser = new GeeseParser();
  const parsed = parser.parseGeeseFile(testGeese);
  const context = parser.prepareContext(parsed, targetFile);
  
  assertEquals(context.my_value, 'HELLO', 'Pipe operations not executed correctly');
  assertEquals(context.my_number, 42, 'parseInt pipe not executed correctly');
  
  // Cleanup
  fs.removeSync(tempDir);
});

// Test 11: Complex pipe chain in parser
test('Parser handles complex pipe chains', () => {
  const tempDir = path.join(TEMP_DIR, 'geese-parser-test4');
  fs.ensureDirSync(tempDir);
  
  const testGeese = path.join(tempDir, 'test.geese');
  const targetFile = path.join(tempDir, 'target.js');
  
  const geeseContent = `---
$include:
  - "*.js"
$recipe: "test"
formatted: '"code review report" ~> toUpperCase ~> replace " " "-"'
list_items: '"a,b,c" ~> split , ~> join " | "'
---
Test template`;
  
  fs.writeFileSync(testGeese, geeseContent, 'utf8');
  fs.writeFileSync(targetFile, 'test', 'utf8');
  
  const parser = new GeeseParser();
  const parsed = parser.parseGeeseFile(testGeese);
  const context = parser.prepareContext(parsed, targetFile);
  
  assertEquals(context.formatted, 'CODE-REVIEW-REPORT');
  assertEquals(context.list_items, 'a | b | c');
  
  // Cleanup
  fs.removeSync(tempDir);
});

// Test 12: Parser validation with $ prefix
test('Parser validates $include and $recipe', () => {
  const tempDir = path.join(TEMP_DIR, 'geese-parser-test5');
  fs.ensureDirSync(tempDir);
  const testFile = path.join(tempDir, 'test.geese');
  
  const content = `---
$include:
  - "*.js"
$recipe: "test"
---
Test template`;
  
  fs.writeFileSync(testFile, content, 'utf8');
  
  const parser = new GeeseParser();
  const parsed = parser.parseGeeseFile(testFile);
  
  // Should not throw
  const valid = parser.validateGeeseFile(parsed.frontmatter);
  assertEquals(valid, true);
  
  // Cleanup
  fs.removeSync(tempDir);
});

// Test 13: collectTargetFiles works with $ prefix
test('Parser collectTargetFiles works with $ prefix', () => {
  const tempDir = path.join(TEMP_DIR, 'geese-parser-test6');
  fs.ensureDirSync(tempDir);
  
  // Create test files
  fs.writeFileSync(path.join(tempDir, 'test1.js'), 'test', 'utf8');
  fs.writeFileSync(path.join(tempDir, 'test2.js'), 'test', 'utf8');
  fs.writeFileSync(path.join(tempDir, 'test.test.js'), 'test', 'utf8');
  
  const frontmatter = {
    $include: ['*.js'],
    $exclude: ['*.test.js']
  };
  
  const parser = new GeeseParser();
  const files = parser.collectTargetFiles(frontmatter, tempDir);
  
  // Should find test1.js and test2.js but not test.test.js
  const filenames = files.map(f => path.basename(f)).sort();
  assertEquals(filenames, ['test1.js', 'test2.js']);
  
  // Cleanup
  fs.removeSync(tempDir);
});

console.log(chalk.bold('\n=================================================='));
console.log(chalk.green('Passed:'), passed);
console.log(chalk.red('Failed:'), failed);
console.log(chalk.bold('==================================================\n'));

process.exit(failed > 0 ? 1 : 0);
