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

// Test 14: Text operations (grep)
test('grep operation finds matching lines', () => {
  const text = 'line1\nError: test\nline3\nError: fail';
  const result = pipeOperations.execute('grep', text, ['^Error'], {});
  assertEquals(result, ['Error: test', 'Error: fail']);
});

test('grep operation with case-insensitive flag', () => {
  const text = 'Hello\nWORLD\nhello world';
  const result = pipeOperations.execute('grep', text, ['hello', 'i'], {});
  assertEquals(result, ['Hello', 'hello world']);
});

test('grep operation with invert match', () => {
  const text = 'line1\nError: test\nline3';
  const result = pipeOperations.execute('grep', text, ['Error', '', 'v'], {});
  assertEquals(result, ['line1', 'line3']);
});

test('grepCount operation counts matching lines', () => {
  const text = 'line1\nline2\ntest\nline4';
  const result = pipeOperations.execute('grepCount', text, ['line'], {});
  assertEquals(result, 3);
});

test('grepFirst operation gets first match', () => {
  const text = 'line1\nError: test\nError: fail';
  const result = pipeOperations.execute('grepFirst', text, ['^Error'], {});
  assertEquals(result, 'Error: test');
});

// Test 15: JSON query operations (jq-like)
test('jqSelect operation selects nested value', () => {
  const obj = { user: { name: 'John', age: 30 } };
  const result = pipeOperations.execute('jqSelect', obj, ['user', 'name'], {});
  assertEquals(result, 'John');
});

test('jqSelect operation selects array element', () => {
  const obj = { items: [1, 2, 3] };
  const result = pipeOperations.execute('jqSelect', obj, ['items', '1'], {});
  assertEquals(result, 2);
});

test('jqKeys operation gets object keys', () => {
  const obj = { a: 1, b: 2, c: 3 };
  const result = pipeOperations.execute('jqKeys', obj, [], {});
  assertEquals(result, ['a', 'b', 'c']);
});

test('jqValues operation gets object values', () => {
  const obj = { a: 1, b: 2 };
  const result = pipeOperations.execute('jqValues', obj, [], {});
  assertEquals(result, [1, 2]);
});

test('jqValues operation gets array values', () => {
  const arr = [1, 2, 3];
  const result = pipeOperations.execute('jqValues', arr, [], {});
  assertEquals(result, [1, 2, 3]);
});

test('jqFilter operation filters by equality', () => {
  const arr = [{ status: 'active' }, { status: 'inactive' }, { status: 'active' }];
  const result = pipeOperations.execute('jqFilter', arr, ['status', '==', 'active'], {});
  assertEquals(result, [{ status: 'active' }, { status: 'active' }]);
});

test('jqFilter operation filters by comparison', () => {
  const arr = [{ age: 25 }, { age: 30 }, { age: 35 }];
  const result = pipeOperations.execute('jqFilter', arr, ['age', '>', '28'], {});
  assertEquals(result, [{ age: 30 }, { age: 35 }]);
});

test('jqFilter operation filters with contains', () => {
  const arr = ['apple', 'banana', 'cherry'];
  const result = pipeOperations.execute('jqFilter', arr, ['', 'contains', 'a'], {});
  assertEquals(result, ['apple', 'banana']);
});

test('jqMap operation extracts property', () => {
  const arr = [{ name: 'Alice' }, { name: 'Bob' }];
  const result = pipeOperations.execute('jqMap', arr, ['name'], {});
  assertEquals(result, ['Alice', 'Bob']);
});

test('jqLength operation gets array length', () => {
  const arr = [1, 2, 3, 4];
  const result = pipeOperations.execute('jqLength', arr, [], {});
  assertEquals(result, 4);
});

test('jqLength operation gets object length', () => {
  const obj = { a: 1, b: 2, c: 3 };
  const result = pipeOperations.execute('jqLength', obj, [], {});
  assertEquals(result, 3);
});

test('jqHas operation checks key existence', () => {
  const obj = { a: 1, b: 2 };
  const result = pipeOperations.execute('jqHas', obj, ['a'], {});
  assertEquals(result, true);
});

test('jqHas operation returns false for missing key', () => {
  const obj = { a: 1, b: 2 };
  const result = pipeOperations.execute('jqHas', obj, ['c'], {});
  assertEquals(result, false);
});

// Test 16: Glob operations
test('globMatch operation matches pattern', () => {
  const result = pipeOperations.execute('globMatch', 'test.js', ['*.js'], {});
  assertEquals(result, true);
});

test('globMatch operation does not match wrong pattern', () => {
  const result = pipeOperations.execute('globMatch', 'test.ts', ['*.js'], {});
  assertEquals(result, false);
});

test('globMatch operation with nested path', () => {
  const result = pipeOperations.execute('globMatch', 'src/app.js', ['**/*.js'], {});
  assertEquals(result, true);
});

test('globMatch operation case-insensitive', () => {
  const result = pipeOperations.execute('globMatch', 'TEST.JS', ['*.js', 'i'], {});
  assertEquals(result, true);
});

test('globFilter operation includes matching items', () => {
  const files = ['test.js', 'app.ts', 'main.js'];
  const result = pipeOperations.execute('globFilter', files, ['*.js'], {});
  assertEquals(result, ['test.js', 'main.js']);
});

test('globFilter operation excludes matching items', () => {
  const files = ['test.js', 'app.ts', 'main.js'];
  const result = pipeOperations.execute('globFilter', files, ['*.js', 'exclude'], {});
  assertEquals(result, ['app.ts']);
});

test('globFilterMulti operation with include patterns', () => {
  const files = ['a.js', 'b.ts', 'c.js', 'd.txt'];
  const result = pipeOperations.execute('globFilterMulti', files, ['*.js,*.ts'], {});
  assertEquals(result, ['a.js', 'b.ts', 'c.js']);
});

test('globFilterMulti operation with include and exclude', () => {
  const files = ['app.js', 'app.test.js', 'main.js', 'test.spec.js'];
  const result = pipeOperations.execute('globFilterMulti', files, ['*.js', '*.test.js,*.spec.js'], {});
  assertEquals(result, ['app.js', 'main.js']);
});

test('globExtract operation returns match', () => {
  const result = pipeOperations.execute('globExtract', 'src/app.js', ['**/*.js'], {});
  assertEquals(result, 'src/app.js');
});

test('globExtract operation returns null on no match', () => {
  const result = pipeOperations.execute('globExtract', 'src/app.ts', ['**/*.js'], {});
  assertEquals(result, null);
});

// Test 17: Complex pipe chains with new operations
test('Complex chain: parse JSON and query with jqSelect', () => {
  const jsonStr = '{"user":{"name":"Alice","age":25}}';
  const result = pipeOperations.executePipeChain(jsonStr + ' ~> parseJson ~> jqSelect user name', {});
  assertEquals(result, 'Alice');
});

test('Complex chain: grep and count', () => {
  const text = 'Error: test\nInfo: data\nError: fail';
  const result = pipeOperations.executePipeChain(text + ' ~> grep ^Error ~> length', {});
  assertEquals(result, 2);
});

test('Complex chain: jqFilter and jqMap', () => {
  const data = [{ name: 'Alice', age: 25 }, { name: 'Bob', age: 30 }, { name: 'Charlie', age: 20 }];
  const chain = JSON.stringify(data) + ' ~> parseJson ~> jqFilter age > 22 ~> jqMap name';
  const result = pipeOperations.executePipeChain(chain, {});
  assertEquals(result, ['Alice', 'Bob']);
});

console.log(chalk.bold('\n=================================================='));
console.log(chalk.green('Passed:'), passed);
console.log(chalk.red('Failed:'), failed);
console.log(chalk.bold('==================================================\n'));

process.exit(failed > 0 ? 1 : 0);
