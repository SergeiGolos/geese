# Architecture Guide

This guide provides an overview of the architectural patterns and infrastructure in the Geese project. **These patterns are mandatory** - the Dependency Injection Container is the baseline architecture for all commands and services.

## Table of Contents

1. [Dependency Injection Container](#dependency-injection-container)
2. [Event System](#event-system)
3. [Interface-Based Architecture](#interface-based-architecture)
4. [JSDoc Documentation Standard](#jsdoc-documentation-standard)
5. [Architecture Decision Records](#architecture-decision-records)

---

## Dependency Injection Container

The Dependency Injection (DI) Container manages service dependencies and lifecycle. **This is the baseline architecture** - all CLI commands and services use the container.

### Application Integration

The container is created at application startup in `bin/geese.js`:

```javascript
// bin/geese.js - Main CLI entry point
const { createContainer } = require('../src/container-setup');

// Create container with all services registered
const container = createContainer();

// All command handlers receive the container
program
  .command('config')
  .action(async (options) => {
    await configCommand(container, options);
  });

program
  .command('new <name>')
  .action(async (name, options) => {
    await newCommand(container, name, options);
  });

program
  .command('run [directory]')
  .action(async (directory, options) => {
    await runCommand(container, directory, options);
  });
```

All services are registered in `src/container-setup.js`:
- `configManager` - Configuration management (singleton)
- `toolRegistry` - Tool registry (singleton)
- `pipeOperations` - Pipe operations (singleton)
- `parser` - Geese file parser (singleton)
- `geeseFileFinder` - File discovery (singleton)
- `reportGenerator` - Report generation (singleton)
- `events` - Event emitter (singleton)

### Basic Usage

If you need to create a container manually (e.g., for testing):

```javascript
const { createContainer } = require('./src/container-setup');

// Create configured container
const container = createContainer({ logDir: './test-logs' });

// Get services
const configManager = container.get('configManager');
const parser = container.get('parser');
```

### Lifecycle Management

**Singleton**: One instance is created and reused
```javascript
container.register('config', () => new ConfigManager(), { singleton: true });
```

**Transient**: New instance created each time
```javascript
container.register('parser', () => new GeeseParser());
```

### Testing with DI

```javascript
// In tests, inject mocks
const mockConfig = { get: () => 'test-value' };
container.register('configManager', () => mockConfig, { singleton: true });

const service = container.get('service-that-needs-config');
// service will use mockConfig
```

### API Reference

- `register(name, factory, options)` - Register a service
- `get(name)` - Get a service instance
- `has(name)` - Check if service is registered
- `unregister(name)` - Remove a service
- `clearSingletons()` - Clear singleton cache
- `listServices()` - List all registered services

See `docs/adr/ADR-002-dependency-injection-container.md` for more details.

---

## Event System

The Event System enables loose coupling through the Observer pattern.

### Basic Usage

```javascript
const EventEmitter = require('./src/events/event-emitter');

// Create event emitter (with optional custom error logger)
const events = new EventEmitter({
  errorLogger: (message, error) => {
    // Custom error logging (defaults to console.error)
    myLogger.error(message, error);
  }
});

// Or use default console.error
const events2 = new EventEmitter();

// Register listeners
events.on('file:processing', (data) => {
  console.log(`Processing ${data.file}...`);
});

events.on('file:processed', (data) => {
  console.log(`✓ Processed ${data.file} in ${data.duration}ms`);
});

// Emit events
events.emit('file:processing', { file: 'review.geese', startTime: Date.now() });

// ... do work ...

events.emit('file:processed', { file: 'review.geese', duration: 150 });
```

### One-Time Listeners

```javascript
// Listener is automatically removed after first call
events.once('startup:complete', () => {
  console.log('Application started successfully');
});
```

### Removing Listeners

```javascript
// Method 1: Use returned removal function
const removeListener = events.on('event', handler);
removeListener();

// Method 2: Use off() method
events.off('event', handler);

// Method 3: Remove all listeners for an event
events.removeAllListeners('event');

// Method 4: Remove all listeners
events.removeAllListeners();
```

### Recommended Events

- `file:processing` - File processing started
- `file:processed` - File processing completed
- `config:loaded` - Configuration loaded
- `config:saved` - Configuration saved
- `pipe:executed` - Pipe operation executed
- `error` - Error occurred

### Error Handling

The EventEmitter catches errors in listeners and emits an `error` event, preventing one failing listener from breaking others.

```javascript
events.on('error', ({ event, error, data }) => {
  console.error(`Error in listener for ${event}:`, error);
});
```

### API Reference

- `constructor(options?)` - Create EventEmitter with optional custom error logger
- `on(event, listener)` - Register a listener
- `once(event, listener)` - Register a one-time listener
- `off(event, listener)` - Remove a listener
- `emit(event, data)` - Emit an event
- `removeAllListeners(event?)` - Remove listeners
- `listenerCount(event)` - Get listener count
- `eventNames()` - Get all event names

See `docs/adr/ADR-003-event-driven-cross-cutting-concerns.md` for more details.

---

## Interface-Based Architecture

The project uses abstract base classes to define interfaces.

### Available Interfaces

- **IConfigProvider** (`src/interfaces/config-provider.js`)
  - Methods: `loadConfig()`, `saveConfig()`, `get()`, `set()`, `delete()`, `list()`
  
- **IFileFinder** (`src/interfaces/file-finder.js`)
  - Methods: `discoverGeeseFiles()`, `findGeeseInDirectory()`

- **IReportGenerator** (`src/interfaces/report-generator.js`)
  - Methods: `createSessionEntry()`, `saveReport()`

- **IPipeOperation** (`src/interfaces/pipe-operation.js`)
  - Methods: `execute()`, `getName()`, `validateArgs()`

### Creating an Implementation

```javascript
const IConfigProvider = require('./interfaces/config-provider');

class MyConfigProvider extends IConfigProvider {
  async loadConfig() {
    // Implementation
  }
  
  async saveConfig(config) {
    // Implementation
  }
  
  async get(key) {
    // Implementation
  }
  
  async set(key, value) {
    // Implementation
  }
  
  async delete(key) {
    // Implementation
  }
  
  async list() {
    // Implementation
  }
}
```

### Benefits

- Clear contracts between modules
- Easy to create test doubles
- Supports dependency injection
- Runtime verification that methods are implemented

See `docs/adr/ADR-001-interface-based-architecture.md` for more details.

---

## JSDoc Documentation Standard

All public APIs should have comprehensive JSDoc comments.

### Required Elements

```javascript
/**
 * Brief description of what this does
 * 
 * Detailed description if needed
 * 
 * @param {string} name - Parameter description
 * @param {Object} [options={}] - Optional parameter
 * @param {string} [options.key] - Nested option
 * 
 * @returns {Promise<Result>} Description of return value
 * @returns {string} returns.field - Description of field
 * 
 * @throws {Error} When this error occurs
 * 
 * @example
 * const result = await myFunction('test', { key: 'value' });
 * console.log(result.field);
 */
async function myFunction(name, options = {}) {
  // Implementation
}
```

### Type Annotations

- Primitives: `{string}`, `{number}`, `{boolean}`
- Arrays: `{string[]}`, `{Array<string>}`
- Objects: `{Object}`, `{MyClass}`
- Optional: `{string}` with `[param]`
- Union: `{string|number}`
- Any: `{*}`
- Promises: `{Promise<string>}`

### Benefits

- IDE autocompletion and inline help
- Type checking support
- Self-documenting code
- Generated documentation

See `docs/adr/ADR-004-jsdoc-documentation-standard.md` for complete standard.

---

## Architecture Decision Records

ADRs document key architectural decisions.

### Location

All ADRs are in `docs/adr/`.

### Current ADRs

1. **ADR-001**: Interface-Based Architecture
2. **ADR-002**: Dependency Injection Container
3. **ADR-003**: Event-Driven Cross-Cutting Concerns
4. **ADR-004**: JSDoc Documentation Standard

### ADR Format

```markdown
# ADR-NNN: Title

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Context
What is the issue being addressed?

## Decision
What change is being made?

## Consequences
What becomes easier or more difficult?
```

### Creating a New ADR

1. Create a new file: `docs/adr/ADR-NNN-title.md`
2. Fill in the template
3. Update `docs/adr/README.md` index
4. Submit with your changes

---

## Putting It All Together

### Example: Adding a New Feature

```javascript
const Container = require('./src/container');
const EventEmitter = require('./src/events/event-emitter');

// 1. Create infrastructure
const container = new Container();
const events = new EventEmitter();

// 2. Register services
container.register('events', () => events, { singleton: true });
container.register('config', () => new ConfigManager(), { singleton: true });

// 3. Register your feature with dependencies
container.register('myFeature', (c) => {
  return new MyFeature(
    c.get('config'),
    c.get('events')
  );
});

// 4. Add event listeners
events.on('feature:action', (data) => {
  console.log('Feature action:', data);
});

// 5. Use the feature
const feature = container.get('myFeature');
await feature.doSomething();
```

### Example: Feature Implementation

```javascript
const IFeature = require('./interfaces/feature');

/**
 * My Feature implementation
 * 
 * @class MyFeature
 * @extends IFeature
 * 
 * @example
 * const feature = new MyFeature(config, events);
 * await feature.doSomething();
 */
class MyFeature extends IFeature {
  /**
   * Create a new MyFeature
   * 
   * @param {IConfigProvider} config - Configuration provider
   * @param {EventEmitter} events - Event emitter
   */
  constructor(config, events) {
    super();
    this.config = config;
    this.events = events;
  }
  
  /**
   * Perform the feature action
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await feature.doSomething();
   */
  async doSomething() {
    this.events.emit('feature:action', { status: 'starting' });
    
    const value = await this.config.get('feature.key');
    // ... do work ...
    
    this.events.emit('feature:action', { status: 'complete' });
  }
}

module.exports = MyFeature;
```

---

## Best Practices

### 1. Use Dependency Injection

✅ **Good**: Dependencies injected through constructor
```javascript
class MyClass {
  constructor(config, parser) {
    this.config = config;
    this.parser = parser;
  }
}
```

❌ **Bad**: Direct require() in constructor
```javascript
class MyClass {
  constructor() {
    this.config = require('./config');
    this.parser = require('./parser');
  }
}
```

### 2. Emit Events for Cross-Cutting Concerns

✅ **Good**: Emit events for logging
```javascript
events.emit('processing', { file });
await process(file);
events.emit('processed', { file, result });
```

❌ **Bad**: Console logs in business logic
```javascript
console.log(`Processing ${file}...`);
await process(file);
console.log(`✓ Processed ${file}`);
```

### 3. Depend on Interfaces

✅ **Good**: Depend on interface
```javascript
class MyClass {
  constructor(configProvider) {
    if (!(configProvider instanceof IConfigProvider)) {
      throw new Error('Must provide IConfigProvider');
    }
    this.config = configProvider;
  }
}
```

❌ **Bad**: Depend on concrete class
```javascript
class MyClass {
  constructor(configManager) {
    this.config = configManager;
  }
}
```

### 4. Document Public APIs

✅ **Good**: Comprehensive JSDoc
```javascript
/**
 * Parse a .geese file
 * @param {string} filePath - Path to file
 * @returns {Object} Parsed data
 * @example
 * const data = parse('./file.geese');
 */
parse(filePath) { }
```

❌ **Bad**: No documentation
```javascript
parse(filePath) { }
```

---

## Testing with New Infrastructure

### Testing with DI Container

```javascript
// test-my-feature.js
const Container = require('./src/container');
const MyFeature = require('./src/my-feature');

// Create test container with mocks
const container = new Container();

const mockConfig = {
  get: async (key) => 'test-value'
};

const mockEvents = {
  emit: () => {}
};

container.register('config', () => mockConfig, { singleton: true });
container.register('events', () => mockEvents, { singleton: true });
container.register('feature', (c) => {
  return new MyFeature(c.get('config'), c.get('events'));
});

// Test
const feature = container.get('feature');
await feature.doSomething();
```

### Testing with Events

```javascript
const EventEmitter = require('./src/events/event-emitter');

// Track events
const events = new EventEmitter();
const emittedEvents = [];

events.on('test:event', (data) => {
  emittedEvents.push(data);
});

// Run code that emits events
await myFunction(events);

// Assert events were emitted
assert(emittedEvents.length > 0);
assert(emittedEvents[0].status === 'complete');
```

---

## Further Reading

- [TECHNICAL_DEBT.md](../TECHNICAL_DEBT.md) - Technical debt analysis
- [ADR Directory](./adr/) - Architecture decision records
- [INTERFACE_ABSTRACTION_IMPROVEMENTS.md](./INTERFACE_ABSTRACTION_IMPROVEMENTS.md) - Interface improvements
- [README.md](../README.md) - Project overview

---

**Last Updated**: 2024-12-03  
**Version**: 1.0.0
