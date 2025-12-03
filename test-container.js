/**
 * Test suite for Dependency Injection Container
 */

const Container = require('./src/container');

// Test helpers
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`✗ ${message}`);
    testsFailed++;
  }
}

function assertEquals(actual, expected, message) {
  if (actual === expected) {
    console.log(`✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`✗ ${message}`);
    console.error(`  Expected: ${expected}`);
    console.error(`  Got: ${actual}`);
    testsFailed++;
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    console.error(`✗ ${message} (did not throw)`);
    testsFailed++;
  } catch (error) {
    console.log(`✓ ${message}`);
    testsPassed++;
  }
}

// Mock service classes
class MockConfigManager {
  constructor() {
    this.name = 'ConfigManager';
  }
}

class MockParser {
  constructor(pipeOps) {
    this.pipeOps = pipeOps;
    this.name = 'Parser';
  }
}

class MockPipeOps {
  constructor() {
    this.name = 'PipeOperations';
  }
}

console.log('\n🧪 Running Container Tests\n');

// Test: Create container
const container = new Container();
assert(container instanceof Container, 'Container can be instantiated');
assert(container.services instanceof Map, 'Container has services Map');
assert(container.singletons instanceof Map, 'Container has singletons Map');

// Test: Register service
container.register('config', () => new MockConfigManager());
assert(container.has('config'), 'Service registration works');

// Test: Get service (transient)
const config1 = container.get('config');
const config2 = container.get('config');
assert(config1 instanceof MockConfigManager, 'Get returns correct instance');
assert(config1 !== config2, 'Transient services create new instances');

// Test: Register singleton
container.register('pipeOps', () => new MockPipeOps(), { singleton: true });
const pipeOps1 = container.get('pipeOps');
const pipeOps2 = container.get('pipeOps');
assert(pipeOps1 === pipeOps2, 'Singleton services return same instance');

// Test: Dependency resolution
container.register('parser', (c) => {
  return new MockParser(c.get('pipeOps'));
});
const parser = container.get('parser');
assert(parser instanceof MockParser, 'Service with dependencies is resolved');
assert(parser.pipeOps instanceof MockPipeOps, 'Dependencies are injected correctly');

// Test: Has method
assert(container.has('config'), 'has() returns true for registered service');
assert(!container.has('nonexistent'), 'has() returns false for unregistered service');

// Test: List services
const services = container.listServices();
assert(services.includes('config'), 'listServices() includes registered services');
assert(services.includes('pipeOps'), 'listServices() includes all services');
assert(services.includes('parser'), 'listServices() includes parser service');

// Test: Unregister service
container.register('temp', () => ({ temp: true }));
assert(container.has('temp'), 'Service is registered');
container.unregister('temp');
assert(!container.has('temp'), 'unregister() removes service');

// Test: Clear singletons
container.register('singleton1', () => ({ id: Math.random() }), { singleton: true });
const s1 = container.get('singleton1');
container.clearSingletons();
const s2 = container.get('singleton1');
assert(s1 !== s2, 'clearSingletons() clears singleton cache');

// Test: Error on missing service
assertThrows(
  () => container.get('nonexistent'),
  'Getting nonexistent service throws error'
);

// Test: Error on invalid service name
assertThrows(
  () => container.register('', () => {}),
  'Registering with empty name throws error'
);

assertThrows(
  () => container.register(null, () => {}),
  'Registering with null name throws error'
);

// Test: Error on invalid factory
assertThrows(
  () => container.register('invalid', 'not a function'),
  'Registering with non-function factory throws error'
);

// Test: Complex dependency chain
const container2 = new Container();
container2.register('service1', () => ({ level: 1 }), { singleton: true });
container2.register('service2', (c) => ({ level: 2, dep: c.get('service1') }), { singleton: true });
container2.register('service3', (c) => ({ level: 3, dep: c.get('service2') }));

const s3 = container2.get('service3');
assert(s3.level === 3, 'Complex dependency chain resolves correctly');
assert(s3.dep.level === 2, 'Second level dependency resolved');
assert(s3.dep.dep.level === 1, 'Third level dependency resolved');

// Print summary
console.log('\n' + '='.repeat(50));
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log('='.repeat(50) + '\n');

process.exit(testsFailed > 0 ? 1 : 0);
