/**
 * Test suite for Event Emitter
 */

const EventEmitter = require('./src/events/event-emitter');

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

console.log('\n🧪 Running EventEmitter Tests\n');

// Test: Create event emitter
const events = new EventEmitter();
assert(events instanceof EventEmitter, 'EventEmitter can be instantiated');
assert(events.listeners instanceof Map, 'EventEmitter has listeners Map');

// Test: Register listener
let callCount = 0;
const listener = (data) => {
  callCount++;
};
events.on('test:event', listener);
assertEquals(events.listenerCount('test:event'), 1, 'Listener registered successfully');

// Test: Emit event
events.emit('test:event', { test: 'data' });
assertEquals(callCount, 1, 'Listener called on emit');

events.emit('test:event', { test: 'data' });
assertEquals(callCount, 2, 'Listener called again on second emit');

// Test: Multiple listeners
let count1 = 0;
let count2 = 0;
events.on('multi', () => count1++);
events.on('multi', () => count2++);
events.emit('multi');
assertEquals(count1, 1, 'First listener called');
assertEquals(count2, 1, 'Second listener called');

// Test: Remove listener
const events2 = new EventEmitter();
const removableListener = () => {};
events2.on('remove:test', removableListener);
assertEquals(events2.listenerCount('remove:test'), 1, 'Listener added');
const removed = events2.off('remove:test', removableListener);
assert(removed, 'off() returns true when listener removed');
assertEquals(events2.listenerCount('remove:test'), 0, 'Listener removed');

// Test: Remove listener with return value
const events3 = new EventEmitter();
let removeCalled = false;
const removeFunc = events3.on('remove:func', () => { removeCalled = true; });
events3.emit('remove:func');
assert(removeCalled, 'Listener called before removal');
removeFunc(); // Call the returned removal function
removeCalled = false;
events3.emit('remove:func');
assert(!removeCalled, 'Listener not called after removal');

// Test: Once listener
const events4 = new EventEmitter();
let onceCount = 0;
events4.once('once:event', () => onceCount++);
events4.emit('once:event');
assertEquals(onceCount, 1, 'Once listener called first time');
events4.emit('once:event');
assertEquals(onceCount, 1, 'Once listener not called second time');

// Test: Event names
const events5 = new EventEmitter();
events5.on('event1', () => {});
events5.on('event2', () => {});
events5.on('event3', () => {});
const names = events5.eventNames();
assert(names.includes('event1'), 'eventNames() includes event1');
assert(names.includes('event2'), 'eventNames() includes event2');
assert(names.includes('event3'), 'eventNames() includes event3');
assertEquals(names.length, 3, 'eventNames() returns correct count');

// Test: Remove all listeners for event
const events6 = new EventEmitter();
events6.on('clear:event', () => {});
events6.on('clear:event', () => {});
events6.on('keep:event', () => {});
events6.removeAllListeners('clear:event');
assertEquals(events6.listenerCount('clear:event'), 0, 'All listeners removed for event');
assertEquals(events6.listenerCount('keep:event'), 1, 'Other event listeners kept');

// Test: Remove all listeners
const events7 = new EventEmitter();
events7.on('event1', () => {});
events7.on('event2', () => {});
events7.removeAllListeners();
assertEquals(events7.listenerCount('event1'), 0, 'All listeners removed');
assertEquals(events7.listenerCount('event2'), 0, 'All listeners removed');
assertEquals(events7.eventNames().length, 0, 'No events remain');

// Test: Error handling in listeners
const events8 = new EventEmitter();
let errorEmitted = false;
events8.on('error', (data) => {
  errorEmitted = true;
});
events8.on('failing:event', () => {
  throw new Error('Test error');
});
let successCalled = false;
events8.on('failing:event', () => {
  successCalled = true;
});
events8.emit('failing:event');
assert(errorEmitted, 'Error event emitted when listener throws');
assert(successCalled, 'Other listeners still called after error');

// Test: Emit returns false for nonexistent event
const events9 = new EventEmitter();
const result = events9.emit('nonexistent');
assert(result === false, 'emit() returns false when no listeners');

// Test: Emit returns true for existing event
const events10 = new EventEmitter();
events10.on('exists', () => {});
const result2 = events10.emit('exists');
assert(result2 === true, 'emit() returns true when listeners exist');

// Test: Invalid listener throws
const events11 = new EventEmitter();
assertThrows(
  () => events11.on('test', 'not a function'),
  'Registering non-function listener throws error'
);

// Test: Data passed to listeners
const events12 = new EventEmitter();
let receivedData = null;
events12.on('data:event', (data) => {
  receivedData = data;
});
const testData = { file: 'test.geese', size: 1024 };
events12.emit('data:event', testData);
assert(receivedData === testData, 'Data passed to listener correctly');
assertEquals(receivedData.file, 'test.geese', 'Data properties accessible');

// Test: Multiple emits with data
const events13 = new EventEmitter();
const receivedEvents = [];
events13.on('track:event', (data) => {
  receivedEvents.push(data);
});
events13.emit('track:event', { id: 1 });
events13.emit('track:event', { id: 2 });
events13.emit('track:event', { id: 3 });
assertEquals(receivedEvents.length, 3, 'All events tracked');
assertEquals(receivedEvents[0].id, 1, 'First event data correct');
assertEquals(receivedEvents[2].id, 3, 'Last event data correct');

// Test: Listener removal during emit
const events14 = new EventEmitter();
let emitCount = 0;
const selfRemovingListener = () => {
  emitCount++;
  events14.off('self:remove', selfRemovingListener);
};
events14.on('self:remove', selfRemovingListener);
events14.emit('self:remove');
events14.emit('self:remove');
assertEquals(emitCount, 1, 'Self-removing listener only called once');

// Test: Error in error listener doesn't cause infinite recursion
let errorListenerCallCount = 0;
const loggedErrors = [];

// Create emitter with custom error logger
const events15 = new EventEmitter({
  errorLogger: (...args) => {
    loggedErrors.push(args);
  }
});

// Error listener that throws
events15.on('error', () => {
  errorListenerCallCount++;
  throw new Error('Error in error listener');
});

// Regular listener that throws
events15.on('throw:event', () => {
  throw new Error('Test error');
});

// Emit event - should not cause infinite recursion
events15.emit('throw:event');

assertEquals(errorListenerCallCount, 1, 'Error listener called exactly once (no infinite recursion)');
assert(loggedErrors.length > 0 && loggedErrors[0][0].includes('Error in error event listener'), 
  'Custom error logger called when error listener throws');

// Print summary
console.log('\n' + '='.repeat(50));
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log('='.repeat(50) + '\n');

process.exit(testsFailed > 0 ? 1 : 0);
