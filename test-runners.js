#!/usr/bin/env node

/**
 * Test suite for runner implementations
 */

const fs = require('fs-extra');
const path = require('path');

// Import runners and interfaces
const IAIToolRunner = require('./src/interfaces/IAIToolRunner');
const RealToolRunner = require('./src/runners/RealToolRunner');
const ConsoleLoggerRunner = require('./src/runners/ConsoleLoggerRunner');
const FileWriterRunner = require('./src/runners/FileWriterRunner');
const MemoryRunner = require('./src/runners/MemoryRunner');
const IAIToolProvider = require('./src/interfaces/IAIToolProvider');
const GooseProvider = require('./src/providers/GooseProvider');
const ToolExecutor = require('./src/ToolExecutor');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passedTests++;
  } else {
    console.log(`✗ ${message}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('\n🧪 Running Runner Tests\n');

  // Test IAIToolRunner interface
  try {
    const runner = new IAIToolRunner();
    await runner.execute('echo', [], 'test');
    assert(false, 'IAIToolRunner.execute() should throw');
  } catch (error) {
    assert(error.message.includes('must be implemented'), 'IAIToolRunner.execute() throws if not implemented');
  }

  try {
    const runner = new IAIToolRunner();
    await runner.checkAvailable('test');
    assert(false, 'IAIToolRunner.checkAvailable() should throw');
  } catch (error) {
    assert(error.message.includes('must be implemented'), 'IAIToolRunner.checkAvailable() throws if not implemented');
  }

  // Test MemoryRunner
  const memoryRunner = new MemoryRunner({
    mockResponse: {
      success: true,
      stdout: 'Mock output',
      stderr: '',
      exitCode: 0
    }
  });

  const result1 = await memoryRunner.execute('goose', ['--help'], 'test input');
  assert(result1.success === true, 'MemoryRunner executes successfully');
  assert(result1.stdout === 'Mock output', 'MemoryRunner returns mock stdout');
  assert(result1.stderr === '', 'MemoryRunner returns mock stderr');
  assert(result1.exitCode === 0, 'MemoryRunner returns mock exit code');

  const executions = memoryRunner.getExecutions();
  assert(executions.length === 1, 'MemoryRunner stores execution');
  assert(executions[0].executablePath === 'goose', 'MemoryRunner stores correct executable path');
  assert(executions[0].args.length === 1, 'MemoryRunner stores correct args length');
  assert(executions[0].args[0] === '--help', 'MemoryRunner stores correct args content');
  assert(executions[0].stdin === 'test input', 'MemoryRunner stores correct stdin');

  const lastExecution = memoryRunner.getLastExecution();
  assert(lastExecution !== null, 'MemoryRunner.getLastExecution() returns last execution');
  assert(lastExecution.executablePath === 'goose', 'Last execution has correct data');

  assert(memoryRunner.getExecutionCount() === 1, 'MemoryRunner.getExecutionCount() returns correct count');

  memoryRunner.clearExecutions();
  assert(memoryRunner.getExecutionCount() === 0, 'MemoryRunner.clearExecutions() clears executions');

  const available = await memoryRunner.checkAvailable('test');
  assert(available === true, 'MemoryRunner.checkAvailable() returns mock availability');

  // Test ConsoleLoggerRunner
  const consoleRunner = new ConsoleLoggerRunner();
  const consoleResult = await consoleRunner.execute('goose', ['--model', 'gpt-4'], 'Test prompt');
  assert(consoleResult.success === true, 'ConsoleLoggerRunner executes successfully');
  assert(consoleResult.stdout.includes('[DRY-RUN]'), 'ConsoleLoggerRunner returns dry-run message');
  assert(consoleResult.exitCode === 0, 'ConsoleLoggerRunner returns exit code 0');

  const consoleAvailable = await consoleRunner.checkAvailable('test');
  assert(consoleAvailable === true, 'ConsoleLoggerRunner.checkAvailable() always returns true');

  // Test FileWriterRunner
  const tmpFile = path.join(__dirname, 'tmp-test-dry-run.txt');
  const fileRunner = new FileWriterRunner(tmpFile);

  const fileResult = await fileRunner.execute('goose', ['--recipe', 'code-review'], 'Test stdin content');
  assert(fileResult.success === true, 'FileWriterRunner executes successfully');
  assert(fileResult.stdout.includes(tmpFile), 'FileWriterRunner mentions output file');

  const fileExists = await fs.pathExists(tmpFile);
  assert(fileExists, 'FileWriterRunner creates output file');

  try {
    if (fileExists) {
      const fileContent = await fs.readFile(tmpFile, 'utf-8');
      assert(fileContent.includes('---'), 'FileWriterRunner creates frontmatter');
      assert(fileContent.includes('executable:'), 'FileWriterRunner includes executable in frontmatter');
      assert(fileContent.includes('goose'), 'FileWriterRunner includes correct executable');
      assert(fileContent.includes('Test stdin content'), 'FileWriterRunner includes stdin content');
    }
  } finally {
    // Cleanup
    if (await fs.pathExists(tmpFile)) {
      await fs.remove(tmpFile);
    }
  }

  const fileAvailable = await fileRunner.checkAvailable('test');
  assert(fileAvailable === true, 'FileWriterRunner.checkAvailable() always returns true');

  // Test IAIToolProvider interface
  try {
    const provider = new IAIToolProvider();
    provider.getFrontmatterSchema();
    assert(false, 'IAIToolProvider.getFrontmatterSchema() should throw');
  } catch (error) {
    assert(error.message.includes('must be implemented'), 'IAIToolProvider.getFrontmatterSchema() throws if not implemented');
  }

  try {
    const provider = new IAIToolProvider();
    provider.getDefaultFrontmatter();
    assert(false, 'IAIToolProvider.getDefaultFrontmatter() should throw');
  } catch (error) {
    assert(error.message.includes('must be implemented'), 'IAIToolProvider.getDefaultFrontmatter() throws if not implemented');
  }

  try {
    const provider = new IAIToolProvider();
    provider.getDefaultTemplate();
    assert(false, 'IAIToolProvider.getDefaultTemplate() should throw');
  } catch (error) {
    assert(error.message.includes('must be implemented'), 'IAIToolProvider.getDefaultTemplate() throws if not implemented');
  }

  try {
    const provider = new IAIToolProvider();
    provider.buildArgs({});
    assert(false, 'IAIToolProvider.buildArgs() should throw');
  } catch (error) {
    assert(error.message.includes('must be implemented'), 'IAIToolProvider.buildArgs() throws if not implemented');
  }

  try {
    const provider = new IAIToolProvider();
    provider.getDefaultPath();
    assert(false, 'IAIToolProvider.getDefaultPath() should throw');
  } catch (error) {
    assert(error.message.includes('must be implemented'), 'IAIToolProvider.getDefaultPath() throws if not implemented');
  }

  // Test GooseProvider
  const gooseProvider = new GooseProvider();
  assert(gooseProvider instanceof IAIToolProvider, 'GooseProvider extends IAIToolProvider');
  assert(gooseProvider.getDefaultPath() === 'goose', 'GooseProvider.getDefaultPath() returns "goose"');

  const schema = gooseProvider.getFrontmatterSchema();
  assert(schema.required.includes('include'), 'GooseProvider schema includes "include" as required');
  assert(schema.required.includes('recipe'), 'GooseProvider schema includes "recipe" as required');
  assert(schema.optional.includes('model'), 'GooseProvider schema includes "model" as optional');

  const frontmatter = gooseProvider.getDefaultFrontmatter();
  assert(Array.isArray(frontmatter.include), 'GooseProvider default frontmatter has include array');
  assert(frontmatter.recipe === 'code-review', 'GooseProvider default frontmatter has recipe');

  const template = gooseProvider.getDefaultTemplate();
  assert(template.includes('{{filename}}'), 'GooseProvider default template includes {{filename}}');

  const args = gooseProvider.buildArgs({ model: 'gpt-4', recipe: 'code-review', temperature: 0.7 });
  assert(args[0] === 'session', 'GooseProvider.buildArgs() starts with "session" command');
  assert(args[1] === 'start', 'GooseProvider.buildArgs() has "start" as second argument');
  assert(args.includes('--model'), 'GooseProvider.buildArgs() includes --model flag');
  assert(args.includes('gpt-4'), 'GooseProvider.buildArgs() includes model value');
  assert(args.includes('--recipe'), 'GooseProvider.buildArgs() includes --recipe flag');
  assert(args.includes('code-review'), 'GooseProvider.buildArgs() includes recipe value');

  // Test new CLI parameters
  const newArgs = gooseProvider.buildArgs({ 
    config: '/path/to/config.yaml',
    profile: 'work',
    resume: 'session123',
    log_level: 'debug',
    no_color: true,
    temperature: 0.8,
    max_tokens: 3000
  });
  assert(newArgs.includes('--config'), 'GooseProvider.buildArgs() includes --config flag');
  assert(newArgs.includes('/path/to/config.yaml'), 'GooseProvider.buildArgs() includes config path');
  assert(newArgs.includes('--profile'), 'GooseProvider.buildArgs() includes --profile flag');
  assert(newArgs.includes('work'), 'GooseProvider.buildArgs() includes profile value');
  assert(newArgs.includes('--resume'), 'GooseProvider.buildArgs() includes --resume flag');
  assert(newArgs.includes('session123'), 'GooseProvider.buildArgs() includes resume session');
  assert(newArgs.includes('--log-level'), 'GooseProvider.buildArgs() includes --log-level flag');
  assert(newArgs.includes('debug'), 'GooseProvider.buildArgs() includes log level value');
  assert(newArgs.includes('--no-color'), 'GooseProvider.buildArgs() includes --no-color flag');
  assert(newArgs.includes('--temperature'), 'GooseProvider.buildArgs() includes --temperature flag');
  assert(newArgs.includes('0.8'), 'GooseProvider.buildArgs() includes temperature value');
  assert(newArgs.includes('--max-tokens'), 'GooseProvider.buildArgs() includes --max-tokens flag');
  assert(newArgs.includes('3000'), 'GooseProvider.buildArgs() includes max_tokens value');

  // Test that schema includes new optional parameters
  assert(schema.optional.includes('config'), 'GooseProvider schema includes config');
  assert(schema.optional.includes('profile'), 'GooseProvider schema includes profile');
  assert(schema.optional.includes('resume'), 'GooseProvider schema includes resume');
  assert(schema.optional.includes('log_level'), 'GooseProvider schema includes log_level');
  assert(schema.optional.includes('no_color'), 'GooseProvider schema includes no_color');

  // Test ToolExecutor
  const executor = new ToolExecutor(gooseProvider, memoryRunner);
  assert(executor.getDefaultPath() === 'goose', 'ToolExecutor.getDefaultPath() delegates to provider');
  
  const executorSchema = executor.getFrontmatterSchema();
  assert(executorSchema.required.includes('include'), 'ToolExecutor.getFrontmatterSchema() delegates to provider');

  const executorFrontmatter = executor.getDefaultFrontmatter();
  assert(executorFrontmatter.recipe === 'code-review', 'ToolExecutor.getDefaultFrontmatter() delegates to provider');

  const executorTemplate = executor.getDefaultTemplate();
  assert(executorTemplate.includes('{{filename}}'), 'ToolExecutor.getDefaultTemplate() delegates to provider');

  const executorArgs = executor.buildArgs({ model: 'gpt-4' });
  assert(executorArgs.includes('--model'), 'ToolExecutor.buildArgs() delegates to provider');

  memoryRunner.clearExecutions();
  const executorResult = await executor.execute('test prompt', { model: 'gpt-4' });
  assert(executorResult.success === true, 'ToolExecutor.execute() works with memory runner');
  assert(memoryRunner.getExecutionCount() === 1, 'ToolExecutor.execute() calls runner');

  const lastExec = memoryRunner.getLastExecution();
  assert(lastExec.stdin === 'test prompt', 'ToolExecutor passes prompt as stdin');
  assert(lastExec.args.includes('--model'), 'ToolExecutor passes built args to runner');

  executor.setPath('/custom/path/goose');
  memoryRunner.clearExecutions();
  await executor.execute('test', {});
  const customPathExec = memoryRunner.getLastExecution();
  assert(customPathExec.executablePath === '/custom/path/goose', 'ToolExecutor.setPath() sets custom path');

  // Test ToolExecutor.create factory
  const consoleExecutor = ToolExecutor.create(gooseProvider, 'console');
  assert(consoleExecutor.getRunner() instanceof ConsoleLoggerRunner, 'ToolExecutor.create("console") creates ConsoleLoggerRunner');

  const memoryExecutor = ToolExecutor.create(gooseProvider, 'memory', {
    mockResponse: { success: true, stdout: 'test' }
  });
  assert(memoryExecutor.getRunner() instanceof MemoryRunner, 'ToolExecutor.create("memory") creates MemoryRunner');

  const tmpFile2 = path.join(__dirname, 'tmp-test-factory.txt');
  const fileExecutor = ToolExecutor.create(gooseProvider, 'file', { outputPath: tmpFile2 });
  assert(fileExecutor.getRunner() instanceof FileWriterRunner, 'ToolExecutor.create("file") creates FileWriterRunner');
  
  try {
    // Additional verification could go here
  } finally {
    // Cleanup
    if (await fs.pathExists(tmpFile2)) {
      await fs.remove(tmpFile2);
    }
  }

  const realExecutor = ToolExecutor.create(gooseProvider, 'real');
  assert(realExecutor.getRunner() instanceof RealToolRunner, 'ToolExecutor.create("real") creates RealToolRunner');

  // Test error handling
  try {
    ToolExecutor.create(gooseProvider, 'file', {});
    assert(false, 'ToolExecutor.create("file") should throw without outputPath');
  } catch (error) {
    assert(error.message.includes('outputPath'), 'ToolExecutor.create("file") requires outputPath');
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log('='.repeat(50) + '\n');

  process.exit(failedTests > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
