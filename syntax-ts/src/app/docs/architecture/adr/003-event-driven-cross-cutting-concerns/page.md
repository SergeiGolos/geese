---
title: "ADR 003: Event Driven Architecture"
nextjs:
  metadata:
    title: "ADR 003: Event Driven Architecture"
    description: "Documentation for ADR 003: Event Driven Architecture"
---

## Status
Accepted (2024-12-03)

## Context

Cross-cutting concerns like logging, progress reporting, error handling, and performance monitoring were scattered throughout the codebase:

```javascript
// Logging mixed with business logic
console.log(`Processing ${file}...`);
const result = await processFile(file);
console.log(`✓ Processed ${file} in ${duration}ms`);

// Progress updates tightly coupled
await updateProgress(file, 'processing');
// ... business logic ...
await updateProgress(file, 'complete');
```

Problems with this approach:
- **Tight Coupling**: Business logic coupled to logging/monitoring concerns
- **Duplication**: Similar logging code repeated across modules
- **Hard to Test**: Tests must verify logging behavior or mock console
- **Limited Flexibility**: Can't easily add new listeners (e.g., metrics, notifications)
- **No Separation**: Concerns mixed instead of separated

## Decision

We have implemented an Event System using the Observer pattern:

1. **EventEmitter Class** (`src/events/event-emitter.js`):
   - Lightweight event emitter for pub/sub pattern
   - Supports registering listeners for events
   - Supports one-time listeners
   - Error handling prevents one failing listener from affecting others
   - No external dependencies

2. **Event Types** (Recommended naming convention):
   - `file:processing` - When starting to process a file
   - `file:processed` - When file processing completes
   - `config:loaded` - When configuration is loaded
   - `pipe:executed` - When a pipe operation executes
   - `error` - When any error occurs

3. **Usage Pattern**:
   ```javascript
   // Core business logic emits events
   events.emit('file:processing', { file, startTime });
   const result = await processFile(file);
   events.emit('file:processed', { file, result, duration });

   // External concerns register listeners
   events.on('file:processing', (data) => {
     console.log(`Processing ${data.file}...`);
   });

   events.on('file:processed', (data) => {
     console.log(`✓ Processed ${data.file} in ${data.duration}ms`);
   });
   ```

4. **Integration Points**:
   - Can be injected via DI container
   - Business logic emits events without knowing about listeners
   - Listeners can be added/removed dynamically
   - Supports testing by asserting events were emitted

## Consequences

### Positive
- **Separation of Concerns**: Business logic separate from logging/monitoring
- **Loose Coupling**: Core logic doesn't depend on cross-cutting concerns
- **Flexibility**: Easy to add new listeners without changing core code
- **Better Testing**: Can test business logic and listeners independently
- **Extensibility**: Third parties can listen to events
- **Observable**: Easy to monitor what's happening in the application
- **No Dependencies**: Pure JavaScript implementation

### Negative
- **Indirection**: Events add a layer of indirection
- **Debugging**: Event flow can be harder to trace
- **Async Concerns**: Event handlers are synchronous by default
- **Memory Management**: Need to properly remove listeners to avoid leaks

### Neutral
- Adds ~200 lines of infrastructure code
- Existing code continues to work without events
- Events are optional and can be adopted gradually

## Usage Examples

```javascript
// In business logic
class FileProcessor {
  constructor(events) {
    this.events = events;
  }

  async process(file) {
    this.events.emit('file:processing', { file });
    const result = await this.doProcess(file);
    this.events.emit('file:processed', { file, result });
    return result;
  }
}

// In CLI (add listeners)
const events = new EventEmitter();
events.on('file:processing', (data) => console.log(`Processing ${data.file}...`));
events.on('file:processed', (data) => console.log(`✓ ${data.file}`));

// In tests (assert events)
const events = new EventEmitter();
let processedFiles = [];
events.on('file:processed', (data) => processedFiles.push(data.file));

const processor = new FileProcessor(events);
await processor.process('test.geese');

assert(processedFiles.includes('test.geese'));
```

## Migration Strategy

1. ✅ Implement EventEmitter with comprehensive tests
2. Add events to DI container
3. Update one module to emit events (e.g., file processing)
4. Add listeners in CLI for logging
5. Gradually add events to other modules
6. Document standard events in API documentation

## Future Enhancements

- Async event handlers with Promise support
- Event namespacing
- Event priorities
- Event filtering
- Integration with external monitoring tools