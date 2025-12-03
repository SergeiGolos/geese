/**
 * Tests for GeminiRunner and GeminiProvider
 */

const GeminiRunner = require('./src/gemini-runner');
const GeminiProvider = require('./src/providers/GeminiProvider');
const ToolExecutor = require('./src/ToolExecutor');

console.log('\n🧪 Running Gemini Runner Tests\n');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${description}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
}

function assertArrayIncludes(array, value, message) {
  if (!array.includes(value)) {
    throw new Error(message || `Expected array to include ${value}`);
  }
}

// GeminiProvider tests
test('GeminiProvider extends IAIToolProvider', () => {
  const provider = new GeminiProvider();
  assert(typeof provider.getDefaultPath === 'function');
  assert(typeof provider.getFrontmatterSchema === 'function');
  assert(typeof provider.getDefaultFrontmatter === 'function');
  assert(typeof provider.getDefaultTemplate === 'function');
  assert(typeof provider.buildArgs === 'function');
});

test('GeminiProvider.getDefaultPath() returns "gemini"', () => {
  const provider = new GeminiProvider();
  assertEquals(provider.getDefaultPath(), 'gemini');
});

test('GeminiProvider schema includes "include" as required', () => {
  const provider = new GeminiProvider();
  const schema = provider.getFrontmatterSchema();
  assertArrayIncludes(schema.required, 'include');
});

test('GeminiProvider schema includes "model" as optional', () => {
  const provider = new GeminiProvider();
  const schema = provider.getFrontmatterSchema();
  assertArrayIncludes(schema.optional, 'model');
});

test('GeminiProvider schema includes "temperature" as optional', () => {
  const provider = new GeminiProvider();
  const schema = provider.getFrontmatterSchema();
  assertArrayIncludes(schema.optional, 'temperature');
});

test('GeminiProvider schema includes "max_tokens" as optional', () => {
  const provider = new GeminiProvider();
  const schema = provider.getFrontmatterSchema();
  assertArrayIncludes(schema.optional, 'max_tokens');
});

test('GeminiProvider schema includes "output_format" as optional', () => {
  const provider = new GeminiProvider();
  const schema = provider.getFrontmatterSchema();
  assertArrayIncludes(schema.optional, 'output_format');
});

test('GeminiProvider schema includes "stream" as optional', () => {
  const provider = new GeminiProvider();
  const schema = provider.getFrontmatterSchema();
  assertArrayIncludes(schema.optional, 'stream');
});

test('GeminiProvider schema includes "safe_mode" as optional', () => {
  const provider = new GeminiProvider();
  const schema = provider.getFrontmatterSchema();
  assertArrayIncludes(schema.optional, 'safe_mode');
});

test('GeminiProvider default frontmatter has include array', () => {
  const provider = new GeminiProvider();
  const frontmatter = provider.getDefaultFrontmatter();
  assert(Array.isArray(frontmatter.include));
  assert(frontmatter.include.length > 0);
});

test('GeminiProvider default frontmatter has model', () => {
  const provider = new GeminiProvider();
  const frontmatter = provider.getDefaultFrontmatter();
  assertEquals(frontmatter.model, 'gemini-pro');
});

test('GeminiProvider default frontmatter has temperature', () => {
  const provider = new GeminiProvider();
  const frontmatter = provider.getDefaultFrontmatter();
  assertEquals(frontmatter.temperature, 0.7);
});

test('GeminiProvider default template includes {{filename}}', () => {
  const provider = new GeminiProvider();
  const template = provider.getDefaultTemplate();
  assert(template.includes('{{filename}}'));
});

test('GeminiProvider default template includes {{filepath}}', () => {
  const provider = new GeminiProvider();
  const template = provider.getDefaultTemplate();
  assert(template.includes('{{filepath}}'));
});

test('GeminiProvider default template includes {{content}}', () => {
  const provider = new GeminiProvider();
  const template = provider.getDefaultTemplate();
  assert(template.includes('{{content}}'));
});

test('GeminiProvider.buildArgs() starts with stdin flag', () => {
  const provider = new GeminiProvider();
  const args = provider.buildArgs({});
  assertEquals(args[0], '-i');
  assertEquals(args[1], '-');
});

test('GeminiProvider.buildArgs() includes --model flag', () => {
  const provider = new GeminiProvider();
  const args = provider.buildArgs({ model: 'gemini-pro' });
  assertArrayIncludes(args, '--model');
  assertArrayIncludes(args, 'gemini-pro');
});

test('GeminiProvider.buildArgs() includes --temperature flag', () => {
  const provider = new GeminiProvider();
  const args = provider.buildArgs({ temperature: 0.8 });
  assertArrayIncludes(args, '--temperature');
  assertArrayIncludes(args, '0.8');
});

test('GeminiProvider.buildArgs() includes --max-tokens flag', () => {
  const provider = new GeminiProvider();
  const args = provider.buildArgs({ max_tokens: 4096 });
  assertArrayIncludes(args, '--max-tokens');
  assertArrayIncludes(args, '4096');
});

test('GeminiProvider.buildArgs() includes --output-format flag', () => {
  const provider = new GeminiProvider();
  const args = provider.buildArgs({ output_format: 'json' });
  assertArrayIncludes(args, '--output-format');
  assertArrayIncludes(args, 'json');
});

test('GeminiProvider.buildArgs() includes --stream flag', () => {
  const provider = new GeminiProvider();
  const args = provider.buildArgs({ stream: true });
  assertArrayIncludes(args, '--stream');
  assertArrayIncludes(args, 'true');
});

test('GeminiProvider.buildArgs() includes --safe-mode flag', () => {
  const provider = new GeminiProvider();
  const args = provider.buildArgs({ safe_mode: true });
  assertArrayIncludes(args, '--safe-mode');
  assertArrayIncludes(args, 'true');
});

test('GeminiProvider.buildArgs() includes --log-level flag', () => {
  const provider = new GeminiProvider();
  const args = provider.buildArgs({ log_level: 'debug' });
  assertArrayIncludes(args, '--log-level');
  assertArrayIncludes(args, 'debug');
});

test('GeminiProvider.buildArgs() includes custom flags', () => {
  const provider = new GeminiProvider();
  const args = provider.buildArgs({ flags: ['--custom-flag', 'value'] });
  assertArrayIncludes(args, '--custom-flag');
  assertArrayIncludes(args, 'value');
});

// GeminiRunner tests
test('GeminiRunner can be instantiated', () => {
  const runner = new GeminiRunner();
  assert(runner instanceof GeminiRunner);
});

test('GeminiRunner.getDefaultPath() returns "gemini"', () => {
  const runner = new GeminiRunner();
  assertEquals(runner.getDefaultPath(), 'gemini');
});

test('GeminiRunner.getFrontmatterSchema() delegates to provider', () => {
  const runner = new GeminiRunner();
  const schema = runner.getFrontmatterSchema();
  assertArrayIncludes(schema.required, 'include');
});

test('GeminiRunner.getDefaultFrontmatter() delegates to provider', () => {
  const runner = new GeminiRunner();
  const frontmatter = runner.getDefaultFrontmatter();
  assertEquals(frontmatter.model, 'gemini-pro');
});

test('GeminiRunner.getDefaultTemplate() delegates to provider', () => {
  const runner = new GeminiRunner();
  const template = runner.getDefaultTemplate();
  assert(template.includes('{{filename}}'));
});

test('GeminiRunner.buildArgs() delegates to provider', () => {
  const runner = new GeminiRunner();
  const args = runner.buildArgs({ model: 'gemini-pro' });
  assertArrayIncludes(args, '--model');
  assertArrayIncludes(args, 'gemini-pro');
});

test('GeminiRunner.getExecutor() returns ToolExecutor', () => {
  const runner = new GeminiRunner();
  const executor = runner.getExecutor();
  assert(executor instanceof ToolExecutor);
});

test('GeminiRunner.setRunnerType("memory") creates memory runner', () => {
  const runner = new GeminiRunner();
  runner.setRunnerType('memory', { mockResponse: { stdout: 'test' } });
  const executor = runner.getExecutor();
  assert(executor instanceof ToolExecutor);
});

test('GeminiRunner.setPath() updates custom path', () => {
  const runner = new GeminiRunner();
  runner.setPath('/custom/path/to/gemini');
  // Path is internal to executor, just verify no error
  assert(true);
});

// Integration test with ToolExecutor
test('GeminiRunner works with ToolExecutor in memory mode', async () => {
  const runner = new GeminiRunner();
  runner.setRunnerType('memory', {
    mockResponse: {
      success: true,
      stdout: 'Mock gemini response',
      stderr: '',
      exitCode: 0
    }
  });
  
  const result = await runner.execute('Test prompt', { model: 'gemini-pro' });
  assertEquals(result.success, true);
  assertEquals(result.output, 'Mock gemini response');
});

console.log('\n==================================================');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('==================================================\n');

process.exit(failed > 0 ? 1 : 0);
