# ADR-002: Dependency Injection Container

## Status
Accepted (2024-12-03)

## Context

The Geese project initially used singleton exports and manual dependency instantiation:

```javascript
// Old approach - singleton exports
module.exports = new PipeOperations();

// Old approach - manual instantiation scattered throughout code
const pipeOps = require('./pipe-operations');
const parser = new GeeseParser();
```

This approach created several problems:
- **Hidden Dependencies**: Hard to see what dependencies a module needs
- **Global State**: Singleton instances share state across the application
- **Testing Difficulty**: Can't inject mock dependencies for testing
- **Tight Coupling**: Direct dependencies on concrete implementations
- **No Lifecycle Control**: Can't control when instances are created or destroyed

## Decision

We have implemented a Dependency Injection (DI) Container to manage service dependencies:

1. **Container Class** (`src/container.js`):
   - Manages service registration and resolution
   - Supports both singleton and transient lifecycles
   - Provides dependency resolution through factory functions
   - Allows services to declare dependencies on other services

2. **Usage Pattern**:
   ```javascript
   const container = new Container();
   
   // Register services
   container.register('configManager', () => new ConfigManager(), { singleton: true });
   container.register('pipeOperations', () => new PipeOperations(), { singleton: true });
   
   // Register with dependencies
   container.register('parser', (c) => {
     return new GeeseParser(c.get('pipeOperations'));
   });
   
   // Use services
   const parser = container.get('parser');
   ```

3. **Implementation Strategy**:
   - Container is optional - existing code continues to work
   - New features should use DI container
   - Gradual migration from singleton exports to container-managed services
   - Services can specify dependencies through constructor injection

## Consequences

### Positive
- **Better Testability**: Easy to inject mock dependencies for unit tests
- **Explicit Dependencies**: Clear declaration of what each service needs
- **Lifecycle Management**: Control over singleton vs transient instances
- **Loose Coupling**: Services depend on interfaces, not implementations
- **Flexibility**: Easy to swap implementations (e.g., different config providers)
- **No Global State**: Services managed by container, not module system

### Negative
- **More Setup**: Need to configure container before using services
- **Indirection**: One more layer between service usage and implementation
- **Learning Curve**: Team needs to understand DI pattern
- **Migration Effort**: Existing code needs gradual migration

### Neutral
- Coexists with existing singleton pattern during migration
- Container itself could be considered a service locator anti-pattern
- Adds ~140 lines of infrastructure code

## Migration Plan

1. ✅ Create Container class with comprehensive documentation
2. Create example setup in documentation
3. Update CLI entry point to use container
4. Migrate command handlers to use container
5. Deprecate singleton exports
6. Update all import sites

## Notes

The container is a lightweight implementation suitable for this application's needs. For more complex scenarios, libraries like `inversify` or `awilix` could be considered, but would add external dependencies.
