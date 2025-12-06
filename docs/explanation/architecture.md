# Explanation: Architecture

This document provides a high-level overview of Geese's architecture.

## Design Philosophy

Geese is designed around the **Dependency Injection (DI)** pattern and an **Event-Driven** architecture to ensure modularity, testability, and extensibility.

## Core Components

### 1. Dependency Injection Container

The heart of the application is the DI Container (`src/container.js`). It manages the lifecycle of all services (singletons vs. transient) and injects dependencies.

*   **Registry**: `src/container-setup.js` defines all available services.
*   **Usage**: Commands receive the container and request services (e.g., `container.get('configManager')`).

### 2. Event System

Geese uses an event bus (`EventEmitter`) for cross-cutting concerns like logging and reporting. This decouples the core logic from side effects.

*   **Events**: `file:processing`, `file:processed`, `error`.
*   **Listeners**: The CLI attaches listeners to print progress bars; the ReportGenerator listens to build the markdown log.

### 3. Interface-Based Design

Key components are defined by interfaces (abstract base classes) to allow for easy swapping and mocking.

*   `IConfigProvider`: Configuration management.
*   `IPipeOperation`: Data transformation.
*   `IAIToolProvider` / `IAIToolRunner`: External AI tool integration.

### 4. The Runner Pipeline

When you run `geese`, the following pipeline executes:

1.  **Config Loading**: Hierarchy resolved (CLI > Local > Global > Core).
2.  **File Discovery**: `GeeseFileFinder` scans for `.geese` files.
3.  **Selection**: User selects a file (if not specified via flag).
4.  **Parsing**: `GeeseParser` reads frontmatter and template.
5.  **Context Building**:
    *   System variables processed.
    *   Glob patterns expanded to find target files.
    *   Pipes executed for each file context.
6.  **Prompt Generation**: Handlebars renders the template.
7.  **Tool Execution**: The `ToolExecutor` (via the specific Runner) sends the prompt to the external AI CLI.
8.  **Reporting**: Results are captured and saved.

## Extensibility Points

*   **Custom Pipes**: Implement `IPipeOperation` to add new data transformations.
*   **Custom Runners**: Implement `IAIToolProvider` to support new AI tools.

See [Contributing](../how-to/integrate-ai-tools.md) for details on extending Geese.
