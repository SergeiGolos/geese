#!/usr/bin/env node

/**
 * Test suite for runner CLI
 */

const fs = require('fs-extra');
const path = require('path');
const RunnerCLI = require('./src/runner-cli');

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
  console.log('\n🧪 Running Runner CLI Tests\n');

  // Test directory paths
  const globalDir = RunnerCLI.getRunnersDirectory('global');
  assert(globalDir.includes('.geese/runners'), 'getRunnersDirectory(global) returns correct path');
  assert(globalDir.includes(require('os').homedir()), 'getRunnersDirectory(global) uses home directory');

  const localDir = RunnerCLI.getRunnersDirectory('local');
  assert(localDir.includes('.geese/runners'), 'getRunnersDirectory(local) returns correct path');
  assert(localDir.includes(process.cwd()), 'getRunnersDirectory(local) uses current directory');

  // Test capitalize helper
  assert(RunnerCLI.capitalize('test') === 'Test', 'capitalize() capitalizes first letter');
  assert(RunnerCLI.capitalize('Test') === 'Test', 'capitalize() handles already capitalized');
  assert(RunnerCLI.capitalize('testName') === 'TestName', 'capitalize() keeps camelCase');

  // Test path helpers
  const interfacesPath = RunnerCLI.getPathToInterfaces();
  assert(interfacesPath.includes('src/interfaces'), 'getPathToInterfaces() returns correct path');
  assert(path.isAbsolute(interfacesPath), 'getPathToInterfaces() returns absolute path');

  const srcPath = RunnerCLI.getPathToSrc();
  assert(srcPath.includes('src'), 'getPathToSrc() returns correct path');
  assert(path.isAbsolute(srcPath), 'getPathToSrc() returns absolute path');

  // Test template generation
  const providerTemplate = RunnerCLI.generateProviderTemplate('testTool', 'Test description');
  assert(providerTemplate.includes('TestToolProvider'), 'generateProviderTemplate() uses correct class name');
  assert(providerTemplate.includes('IAIToolProvider'), 'generateProviderTemplate() extends IAIToolProvider');
  assert(providerTemplate.includes('Test description'), 'generateProviderTemplate() includes description');
  assert(providerTemplate.includes('testTool'), 'generateProviderTemplate() includes tool name');
  assert(providerTemplate.includes('getDefaultPath()'), 'generateProviderTemplate() includes required methods');
  assert(providerTemplate.includes('getFrontmatterSchema()'), 'generateProviderTemplate() includes schema method');
  assert(providerTemplate.includes('getDefaultFrontmatter()'), 'generateProviderTemplate() includes frontmatter method');
  assert(providerTemplate.includes('getDefaultTemplate()'), 'generateProviderTemplate() includes template method');
  assert(providerTemplate.includes('buildArgs(config)'), 'generateProviderTemplate() includes buildArgs method');

  const runnerTemplate = RunnerCLI.generateRunnerTemplate('testTool', 'Test runner');
  assert(runnerTemplate.includes('TestToolRunner'), 'generateRunnerTemplate() uses correct class name');
  assert(runnerTemplate.includes('TestToolProvider'), 'generateRunnerTemplate() references provider');
  assert(runnerTemplate.includes('ToolExecutor'), 'generateRunnerTemplate() uses ToolExecutor');
  assert(runnerTemplate.includes('Test runner'), 'generateRunnerTemplate() includes description');
  assert(runnerTemplate.includes('initializeExecutor'), 'generateRunnerTemplate() includes initialization');
  assert(runnerTemplate.includes('execute(prompt, config'), 'generateRunnerTemplate() includes execute method');
  assert(runnerTemplate.includes('setPath(path)'), 'generateRunnerTemplate() includes setPath method');

  const indexTemplate = RunnerCLI.generateIndexTemplate('testTool');
  assert(indexTemplate.includes('TestToolRunner'), 'generateIndexTemplate() exports runner');
  assert(indexTemplate.includes('TestToolProvider'), 'generateIndexTemplate() exports provider');
  assert(indexTemplate.includes('Runner:'), 'generateIndexTemplate() exports as Runner');
  assert(indexTemplate.includes('Provider:'), 'generateIndexTemplate() exports as Provider');

  // Test runner creation (in a temp directory to avoid pollution)
  const tmpDir = path.join(__dirname, 'tmp-test-runners');
  await fs.ensureDir(tmpDir);

  try {
    // Override getRunnersDirectory for testing
    const originalGetDir = RunnerCLI.getRunnersDirectory;
    RunnerCLI.getRunnersDirectory = () => tmpDir;

    const result = await RunnerCLI.createRunner('myTestRunner', { 
      description: 'Test runner for testing',
      force: true 
    });
    
    assert(result !== null, 'createRunner() returns file paths');
    assert(result.providerFile, 'createRunner() returns provider file path');
    assert(result.runnerFile, 'createRunner() returns runner file path');
    assert(result.indexFile, 'createRunner() returns index file path');

    // Verify files exist
    const runnerDir = path.join(tmpDir, 'myTestRunner');
    assert(fs.existsSync(runnerDir), 'createRunner() creates directory');
    assert(fs.existsSync(result.providerFile), 'createRunner() creates provider file');
    assert(fs.existsSync(result.runnerFile), 'createRunner() creates runner file');
    assert(fs.existsSync(result.indexFile), 'createRunner() creates index file');

    // Verify file contents
    const providerContent = fs.readFileSync(result.providerFile, 'utf8');
    assert(providerContent.includes('MyTestRunnerProvider'), 'Provider file has correct class name');
    assert(providerContent.includes('Test runner for testing'), 'Provider file has description');

    const runnerContent = fs.readFileSync(result.runnerFile, 'utf8');
    assert(runnerContent.includes('MyTestRunnerRunner'), 'Runner file has correct class name');
    assert(runnerContent.includes('MyTestRunnerProvider'), 'Runner file references provider');

    const indexContent = fs.readFileSync(result.indexFile, 'utf8');
    assert(indexContent.includes('MyTestRunnerRunner'), 'Index file exports runner');
    assert(indexContent.includes('MyTestRunnerProvider'), 'Index file exports provider');

    // Verify the created files can be required (syntax is valid)
    let canRequireProvider = false;
    let canRequireRunner = false;
    let canRequireIndex = false;
    
    try {
      const Provider = require(result.providerFile);
      canRequireProvider = typeof Provider === 'function';
    } catch (e) {
      console.log('    Error requiring provider:', e.message);
    }
    
    try {
      const Runner = require(result.runnerFile);
      canRequireRunner = typeof Runner === 'function';
    } catch (e) {
      console.log('    Error requiring runner:', e.message);
    }
    
    try {
      const index = require(result.indexFile);
      canRequireIndex = index.Runner && index.Provider;
    } catch (e) {
      console.log('    Error requiring index:', e.message);
    }

    assert(canRequireProvider, 'Generated provider file is valid JavaScript');
    assert(canRequireRunner, 'Generated runner file is valid JavaScript');
    assert(canRequireIndex, 'Generated index file exports correctly');

    // Test provider instance
    if (canRequireProvider) {
      const ProviderClass = require(result.providerFile);
      const provider = new ProviderClass();
      assert(provider.getDefaultPath() === 'myTestRunner', 'Provider.getDefaultPath() returns correct value');
      assert(provider.getFrontmatterSchema(), 'Provider.getFrontmatterSchema() returns schema');
      assert(provider.getDefaultFrontmatter(), 'Provider.getDefaultFrontmatter() returns frontmatter');
      assert(provider.getDefaultTemplate(), 'Provider.getDefaultTemplate() returns template');
      const args = provider.buildArgs({ recipe: 'test', temperature: 0.5 });
      assert(Array.isArray(args), 'Provider.buildArgs() returns array');
      assert(args.includes('--recipe'), 'Provider.buildArgs() includes recipe flag');
    }

    // Restore original method
    RunnerCLI.getRunnersDirectory = originalGetDir;

    // Clean up
    await fs.remove(tmpDir);
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    // Clean up even on error
    try {
      await fs.remove(tmpDir);
    } catch (e) {
      // Ignore cleanup errors
    }
    process.exit(1);
  }

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
