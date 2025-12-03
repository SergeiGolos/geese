/**
 * Test suite for interface contract enforcement
 * Verifies that interfaces properly enforce method implementation
 */

const IConfigProvider = require('./src/interfaces/config-provider');
const IFileFinder = require('./src/interfaces/file-finder');
const IReportGenerator = require('./src/interfaces/report-generator');
const IPipeOperation = require('./src/interfaces/pipe-operation');
const ConfigManager = require('./src/config-manager');
const GeeseFileFinder = require('./src/geese-file-finder');
const ReportGenerator = require('./src/report-generator');

// Test utilities
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.error(`✗ ${message}`);
    failed++;
  }
}

async function assertThrows(fn, expectedError, message) {
  try {
    await fn();
    console.error(`✗ ${message}`);
    console.error(`  Expected error to be thrown but none was`);
    failed++;
    return false;
  } catch (error) {
    if (expectedError && !error.message.includes(expectedError)) {
      console.error(`✗ ${message}`);
      console.error(`  Expected error containing "${expectedError}" but got: ${error.message}`);
      failed++;
      return false;
    }
    console.log(`✓ ${message}`);
    passed++;
    return true;
  }
}

async function runTests() {
  console.log('\n🧪 Running Interface Tests\n');

  // Test 1: IConfigProvider enforces loadConfig()
  const provider = new IConfigProvider();
  await assertThrows(
    () => provider.loadConfig(),
    'must be implemented by subclass',
    'IConfigProvider.loadConfig() throws if not implemented'
  );

  // Test 2: IConfigProvider enforces saveConfig()
  await assertThrows(
    () => provider.saveConfig({}),
    'must be implemented by subclass',
    'IConfigProvider.saveConfig() throws if not implemented'
  );

  // Test 3: IConfigProvider enforces get()
  await assertThrows(
    () => provider.get('key'),
    'must be implemented by subclass',
    'IConfigProvider.get() throws if not implemented'
  );

  // Test 4: IConfigProvider enforces set()
  await assertThrows(
    () => provider.set('key', 'value'),
    'must be implemented by subclass',
    'IConfigProvider.set() throws if not implemented'
  );

  // Test 5: IConfigProvider enforces delete()
  await assertThrows(
    () => provider.delete('key'),
    'must be implemented by subclass',
    'IConfigProvider.delete() throws if not implemented'
  );

  // Test 6: IConfigProvider enforces list()
  await assertThrows(
    () => provider.list(),
    'must be implemented by subclass',
    'IConfigProvider.list() throws if not implemented'
  );

  // Test 7: ConfigManager properly implements IConfigProvider
  assert(
    ConfigManager.prototype instanceof IConfigProvider,
    'ConfigManager extends IConfigProvider'
  );

  // Test 8: ConfigManager has all required methods
  const configManager = new ConfigManager();
  assert(
    typeof configManager.loadConfig === 'function',
    'ConfigManager implements loadConfig()'
  );
  assert(
    typeof configManager.saveConfig === 'function',
    'ConfigManager implements saveConfig()'
  );
  assert(
    typeof configManager.get === 'function',
    'ConfigManager implements get()'
  );
  assert(
    typeof configManager.set === 'function',
    'ConfigManager implements set()'
  );
  assert(
    typeof configManager.delete === 'function',
    'ConfigManager implements delete()'
  );
  assert(
    typeof configManager.list === 'function',
    'ConfigManager implements list()'
  );

  // Test 9: IFileFinder enforces discoverGeeseFiles()
  const finder = new IFileFinder();
  await assertThrows(
    () => finder.discoverGeeseFiles('/path'),
    'must be implemented by subclass',
    'IFileFinder.discoverGeeseFiles() throws if not implemented'
  );

  // Test 10: IFileFinder enforces findGeeseInDirectory()
  await assertThrows(
    () => finder.findGeeseInDirectory('/path'),
    'must be implemented by subclass',
    'IFileFinder.findGeeseInDirectory() throws if not implemented'
  );

  // Test 11: GeeseFileFinder properly implements IFileFinder
  assert(
    GeeseFileFinder.prototype instanceof IFileFinder,
    'GeeseFileFinder extends IFileFinder'
  );

  // Test 12: GeeseFileFinder has all required methods
  const fileFinder = new GeeseFileFinder();
  assert(
    typeof fileFinder.discoverGeeseFiles === 'function',
    'GeeseFileFinder implements discoverGeeseFiles()'
  );
  assert(
    typeof fileFinder.findGeeseInDirectory === 'function',
    'GeeseFileFinder implements findGeeseInDirectory()'
  );

  // Test 13: IReportGenerator enforces createSessionEntry()
  const generator = new IReportGenerator();
  try {
    generator.createSessionEntry('file', 'target', {}, 'prompt', 'response', 0, 1000);
    console.error(`✗ IReportGenerator.createSessionEntry() throws if not implemented`);
    failed++;
  } catch (error) {
    if (error.message.includes('must be implemented by subclass')) {
      console.log(`✓ IReportGenerator.createSessionEntry() throws if not implemented`);
      passed++;
    } else {
      console.error(`✗ IReportGenerator.createSessionEntry() throws if not implemented`);
      console.error(`  Expected error containing "must be implemented by subclass" but got: ${error.message}`);
      failed++;
    }
  }

  // Test 14: IReportGenerator enforces saveReport()
  await assertThrows(
    () => generator.saveReport([]),
    'must be implemented by subclass',
    'IReportGenerator.saveReport() throws if not implemented'
  );

  // Test 15: ReportGenerator properly implements IReportGenerator
  assert(
    ReportGenerator.prototype instanceof IReportGenerator,
    'ReportGenerator extends IReportGenerator'
  );

  // Test 16: ReportGenerator has all required methods
  const reportGenerator = new ReportGenerator();
  assert(
    typeof reportGenerator.createSessionEntry === 'function',
    'ReportGenerator implements createSessionEntry()'
  );
  assert(
    typeof reportGenerator.saveReport === 'function',
    'ReportGenerator implements saveReport()'
  );

  // Test 17: IPipeOperation enforces execute()
  const operation = new IPipeOperation();
  try {
    operation.execute('value', [], {});
    console.error(`✗ IPipeOperation.execute() throws if not implemented`);
    failed++;
  } catch (error) {
    if (error.message.includes('must be implemented by subclass')) {
      console.log(`✓ IPipeOperation.execute() throws if not implemented`);
      passed++;
    } else {
      console.error(`✗ IPipeOperation.execute() throws if not implemented`);
      console.error(`  Expected error containing "must be implemented by subclass" but got: ${error.message}`);
      failed++;
    }
  }

  // Test 18: IPipeOperation enforces getName()
  try {
    operation.getName();
    console.error(`✗ IPipeOperation.getName() throws if not implemented`);
    failed++;
  } catch (error) {
    if (error.message.includes('must be implemented by subclass')) {
      console.log(`✓ IPipeOperation.getName() throws if not implemented`);
      passed++;
    } else {
      console.error(`✗ IPipeOperation.getName() throws if not implemented`);
      console.error(`  Expected error containing "must be implemented by subclass" but got: ${error.message}`);
      failed++;
    }
  }

  // Test 19: IPipeOperation has default implementation for validateArgs()
  assert(
    operation.validateArgs(['arg1', 'arg2']) === true,
    'IPipeOperation.validateArgs() has default implementation returning true'
  );

  // Test 20: IPipeOperation has default implementation for getMetadata()
  const metadata = operation.getMetadata();
  assert(
    typeof metadata === 'object' && metadata.description,
    'IPipeOperation.getMetadata() has default implementation'
  );

  // Test 21: Create a concrete implementation of IPipeOperation
  class TrimOperation extends IPipeOperation {
    getName() {
      return 'trim';
    }
    
    execute(value, args, context) {
      return String(value).trim();
    }
  }

  const trimOp = new TrimOperation();
  assert(
    trimOp instanceof IPipeOperation,
    'Concrete operation extends IPipeOperation'
  );
  assert(
    trimOp.getName() === 'trim',
    'Concrete operation implements getName()'
  );
  assert(
    trimOp.execute('  hello  ', [], {}) === 'hello',
    'Concrete operation implements execute()'
  );

  // Test 22: Verify ObjectPathHelper.listKeys works correctly
  const ObjectPathHelper = require('./src/utils/object-path-helper');
  const testObj = {
    level1: {
      level2: {
        level3: 'value'
      },
      other: 'data'
    },
    simple: 'value'
  };
  const keys = ObjectPathHelper.listKeys(testObj);
  assert(
    keys.includes('level1') && keys.includes('level1.level2') && keys.includes('level1.level2.level3'),
    'ObjectPathHelper.listKeys() returns nested keys in dot notation'
  );

  // Print summary
  console.log('\n==================================================');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('==================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
