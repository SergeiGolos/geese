---
title: "ADR-0005: Editor Mode Web Interface"
status: "Proposed"
date: "2025-12-08"
authors: "Geese Development Team"
tags: ["architecture", "decision", "ui", "editor", "web-interface"]
supersedes: ""
superseded_by: ""
---

# ADR-0005: Editor Mode Web Interface

## Status

**Proposed**

## Context

Geese is currently a CLI-only tool for processing `.geese` files with AI-powered transformations. Users must:

- Manually create and edit `.geese` and pipe files using external text editors
- Switch between terminal and editor to manage configuration
- View logs by navigating to the file system and opening log files manually
- Reference documentation separately to understand special syntax highlighting for `.geese` files and pipe operations
- Manually cross-reference pipes defined in `.geese` files with available system pipes

This workflow creates several pain points:

1. **Fragmented Experience**: Users must context-switch between CLI, editor, file browser, and documentation
2. **Configuration Complexity**: Managing hierarchical configuration (global vs. local) requires knowledge of file locations and JSON editing
3. **Limited Discoverability**: Available pipes, configuration options, and `.geese` files are not easily discoverable
4. **No Real-time Feedback**: Users cannot see syntax highlighting or validation for `.geese` file special values during editing
5. **Log Management**: Viewing HTML-rendered logs requires opening files manually and lacks integrated preview
6. **Learning Curve**: New users struggle to understand the relationship between `.geese` files, pipes, and configuration

The Geese architecture already supports extensibility through:
- Interface-based design (ADR-001)
- Dependency injection container (ADR-002)  
- Event-driven architecture (ADR-003)
- Multiple tool runners and custom pipes

An integrated editor mode would significantly improve the user experience while leveraging the existing architectural patterns.

## Decision

We will implement an **Editor Mode** that launches a web-based application host serving an integrated development environment for Geese. This mode will be invoked via `geese editor` command.

### Architecture Components

**1. Web Application Host**

- **Technology**: Express.js web server running on localhost
- **Port**: Default 3000 (configurable via `--port` flag)
- **Architecture**: Single-page application with REST API backend
- **Lifecycle**: Server runs until explicitly stopped by user (Ctrl+C)

**2. Monaco Editor Integration**

- **Component**: Microsoft Monaco Editor (same editor powering VS Code)
- **Features**:
  - Syntax highlighting for `.geese` files (YAML frontmatter + Handlebars template)
  - Syntax highlighting for JavaScript pipe files
  - IntelliSense for system variables (`_include`, `_exclude`, `_recipe`, `_tool`, `_model`, `_temperature`)
  - Autocompletion for available pipe operations
  - Error detection and validation for `.geese` file structure
  - Cross-referencing: Highlight undefined pipes referenced in `.geese` files
  - Multi-file editing with tabs

**3. File Browser Navigation Panel**

- **Structure**: VS Code-inspired tree view with two root sections:
  - **Profile (.geese/)**: Local project configuration and files
    - `.geese/config.json` (local configuration)
    - `.geese/*.geese` (project-specific templates)
    - `.geese/pipes/` (custom project pipes)
    - `.geese/runners/` (custom project runners)
  - **Global (~/.geese/)**: User-level configuration and files
    - `~/.geese/config.json` (global configuration)
    - `~/.geese/*.geese` (global templates)
    - `~/.geese/pipes/` (global custom pipes)
    - `~/.geese/runners/` (global custom runners)

- **Features**:
  - Expand/collapse tree nodes
  - File icons based on type (`.geese`, `.js`, `.json`)
  - Click to open file in editor
  - Right-click context menu (New, Delete, Rename)
  - Drag-and-drop support for moving files between sections

**4. Configuration Management Interface**

- **Visual Editor**: Form-based UI for editing configuration without manual JSON editing
- **Scope Selection**: Toggle between Global and Local configuration
- **Settings Exposed**:
  - `defaultTool` (dropdown: goose, aider, custom runners)
  - `logLevel` (dropdown: debug, info, warn, error)
  - `goose.model` (text input with suggestions: gpt-4, gpt-3.5-turbo, etc.)
  - `goose.temperature` (slider: 0.0 - 1.0)
  - `goose.max_tokens` (number input)
  - `goose.include` (array input with add/remove buttons)
  - `goose.exclude` (array input with add/remove buttons)
  - `security.allowAbsolutePaths` (checkbox)
  - `security.maxFileReadsPerSecond` (number input)
  - Tool-specific settings (dynamic based on registered runners)

- **Validation**: Real-time validation with inline error messages
- **Preview**: Show JSON output before saving
- **Hierarchy Visualization**: Display effective configuration with source indicators

**5. Log Viewer**

- **List View**: Table of recent runs with columns:
  - Timestamp (sortable)
  - `.geese` file used
  - Target files processed (count)
  - Duration
  - Status (success/failure)
  - Actions (View Details, Download)

- **Detail View**: HTML-rendered preview of log markdown with:
  - Syntax-highlighted code blocks
  - Collapsible sections for each processed file
  - Token usage information
  - Execution timeline
  - Error messages with stack traces (if applicable)

- **Features**:
  - Search/filter logs by date, file, or status
  - Export logs as PDF or HTML
  - Clear logs action (with confirmation)

**6. Pipe Library Browser**

- **Categorized List**: Group pipes by type:
  - String Operations (trim, toUpperCase, toLowerCase, substring, replace, split, join)
  - File Operations (readFile, readJson)
  - JSON/Data Operations (parseJson, jqSelect, jqMap)
  - Utility Operations (grep, grepCount, count)
  - Custom Pipes (user-defined)

- **Pipe Details Panel**:
  - Name and description
  - Arguments (with types and defaults)
  - Usage examples
  - Source location (built-in vs. custom)
  - Quick "Insert into Editor" action

- **Cross-Reference Indicator**: Show which `.geese` files use each pipe

**7. Runner Management**

- **List View**: Available runners with:
  - Name
  - Type (built-in vs. custom)
  - Status (configured, missing dependencies)
  - Actions (Configure, Test, Remove)

- **Configuration UI**: Tool-specific settings for each runner
- **Test Interface**: Send test prompt to verify runner configuration

### Technical Implementation Details

**Backend API Endpoints**

```
GET    /api/files                    - List all .geese and pipe files
GET    /api/files/:path              - Get file contents
PUT    /api/files/:path              - Save file contents
POST   /api/files                    - Create new file
DELETE /api/files/:path              - Delete file

GET    /api/config                   - Get configuration (global + local merged)
GET    /api/config/global            - Get global configuration
GET    /api/config/local             - Get local configuration
PUT    /api/config/global            - Update global configuration
PUT    /api/config/local             - Update local configuration

GET    /api/pipes                    - List all available pipes
GET    /api/pipes/:name              - Get pipe details

GET    /api/runners                  - List all available runners
GET    /api/runners/:name            - Get runner details

GET    /api/logs                     - List recent logs
GET    /api/logs/:id                 - Get log details
DELETE /api/logs/:id                 - Delete log

POST   /api/validate/geese           - Validate .geese file syntax
POST   /api/run                      - Execute .geese file (dry-run or actual)
```

**Frontend Architecture**

- **Framework**: React with React Router for navigation
- **State Management**: React Context API for global state
- **UI Components**: Custom component library inspired by VS Code
- **Monaco Editor**: `@monaco-editor/react` wrapper
- **Styling**: CSS Modules with VS Code theme
- **HTTP Client**: Fetch API with error handling

**File Structure**

```
src/
  editor/
    server/
      index.js              - Express server setup
      routes/
        files.js            - File management endpoints
        config.js           - Configuration endpoints
        pipes.js            - Pipe library endpoints
        runners.js          - Runner management endpoints
        logs.js             - Log viewer endpoints
      middleware/
        validation.js       - Request validation
        error-handler.js    - Centralized error handling
        security.js         - Security headers and CORS
    client/
      public/
        index.html          - HTML entry point
      src/
        components/
          Editor/
            MonacoEditor.jsx
            EditorTabs.jsx
          FileExplorer/
            TreeView.jsx
            FileNode.jsx
          ConfigEditor/
            ConfigForm.jsx
            SettingInput.jsx
          LogViewer/
            LogList.jsx
            LogDetail.jsx
          PipeLibrary/
            PipeList.jsx
            PipeDetail.jsx
        services/
          api.js              - API client
          websocket.js        - WebSocket for real-time updates
        contexts/
          AppContext.jsx      - Global application state
        App.jsx               - Root component
        index.jsx             - Entry point
```

**Integration with Existing CLI**

- Reuse existing services via DI container:
  - `ConfigManager` for configuration hierarchy
  - `GeeseFileFinder` for file discovery
  - `PipeOperations` for pipe metadata
  - `ToolRegistry` for runner information
  - `ReportGenerator` for log generation

- New CLI command:
```bash
geese editor [options]
  --port <number>     Port to run editor on (default: 3000)
  --no-browser        Don't open browser automatically
  --directory <path>  Project directory (default: current)
```

**Security Considerations**

- Server binds to localhost only (no external access)
- CSRF token validation for state-changing operations
- Input validation and sanitization on all API endpoints
- Rate limiting on execution endpoints
- File access restricted to project directory and `~/.geese/`
- No execution of arbitrary code from UI (only `.geese` files)

**Monaco Editor Language Support**

Custom language definition for `.geese` files:
```javascript
{
  tokenizer: {
    root: [
      // YAML frontmatter
      [/^---$/, 'keyword'],
      // System variables
      [/_include|_exclude|_recipe|_tool|_model|_temperature|_max_tokens/, 'keyword.system'],
      // Pipe operator
      [/~>/, 'operator.pipe'],
      // Handlebars template syntax
      [/{{/, { token: 'delimiter.handlebars', next: '@handlebars' }],
      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string'],
    ],
    handlebars: [
      [/[^{}]+/, 'variable.handlebars'],
      [/}}/, { token: 'delimiter.handlebars', next: '@pop' }],
    ],
    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ]
  }
}
```

## Consequences

### Positive

- **POS-001**: Significantly improved developer experience with integrated IDE-like environment, reducing context switching and improving productivity
- **POS-002**: Lower barrier to entry for new users through visual configuration management and syntax highlighting
- **POS-003**: Enhanced discoverability of features through integrated pipe library, runner management, and configuration UI
- **POS-004**: Better validation and error prevention through real-time syntax checking and cross-referencing
- **POS-005**: Improved log accessibility with HTML rendering and search capabilities
- **POS-006**: Leverages existing architectural patterns (DI, interfaces, events) without requiring major refactoring
- **POS-007**: Monaco Editor provides professional-grade editing experience with minimal implementation effort
- **POS-008**: Web-based architecture enables future remote collaboration features

### Negative

- **NEG-001**: Adds significant complexity to the codebase with new web server, frontend, and API layer (~3000+ lines of code)
- **NEG-002**: Introduces new dependencies (Express, React, Monaco Editor) increasing bundle size and maintenance burden
- **NEG-003**: Requires maintaining two user interfaces (CLI and Web) with feature parity expectations
- **NEG-004**: Web-based editor may have performance limitations with very large files compared to native editors
- **NEG-005**: Security surface area increases with web server, requiring careful attention to localhost security
- **NEG-006**: Browser compatibility concerns and need for modern JavaScript runtime
- **NEG-007**: Development and testing complexity increases with frontend testing requirements
- **NEG-008**: May create user expectations for features beyond the scope of a CLI tool (version control, team collaboration, etc.)

## Alternatives Considered

### Alternative 1: VS Code Extension

- **ALT-001**: **Description**: Develop a VS Code extension providing `.geese` file syntax highlighting, IntelliSense, and integrated commands
- **ALT-002**: **Rejection Reason**: Limits users to VS Code ecosystem; doesn't address configuration management or log viewing; requires users to have VS Code installed; extension development has steep learning curve

### Alternative 2: Terminal UI (TUI) with Blessed.js

- **ALT-003**: **Description**: Build a terminal-based UI using Blessed.js or similar TUI framework, providing a curses-style interface
- **ALT-004**: **Rejection Reason**: Limited editing capabilities compared to Monaco Editor; poor support for syntax highlighting; difficult to implement file tree navigation; accessibility concerns; doesn't leverage modern web technologies

### Alternative 3: Electron Desktop Application

- **ALT-005**: **Description**: Package the web interface as a standalone Electron desktop application
- **ALT-006**: **Rejection Reason**: Massive overhead (Electron bundle ~100MB+); requires distributing separate desktop application; overkill for a development tool; localhost web server provides sufficient experience without the bloat

### Alternative 4: External Editor Integration

- **ALT-007**: **Description**: Implement deep integration with existing editors (Vim, Emacs, Sublime) through plugins/configuration files
- **ALT-008**: **Rejection Reason**: Requires maintaining multiple editor plugins; doesn't solve configuration or log viewing problems; fragmented user experience across different editors; high maintenance burden

### Alternative 5: Enhanced CLI with Improved Prompts

- **ALT-009**: **Description**: Stay CLI-only but improve with better interactive prompts (inquirer.js) and built-in `geese config edit` command to open files in $EDITOR
- **ALT-010**: **Rejection Reason**: Doesn't address core issues of discoverability, syntax highlighting, or log viewing; still requires external editor; configuration editing remains complex for non-technical users

## Implementation Notes

- **IMP-001**: Implement in phases: (1) Basic server + Monaco editor, (2) File explorer, (3) Configuration UI, (4) Log viewer, (5) Pipe library browser
- **IMP-002**: Leverage existing DI container to inject services into Express routes, maintaining separation of concerns
- **IMP-003**: Create new interface `IEditorServer` to abstract web server implementation, allowing potential future migration to different server technology
- **IMP-004**: Use WebSocket connection for real-time updates (file changes, log updates) to improve responsiveness
- **IMP-005**: Implement graceful degradation: if Monaco Editor fails to load, fall back to basic textarea editor
- **IMP-006**: Add `--headless` flag to run editor server without opening browser (useful for remote development)
- **IMP-007**: Configuration validation should reuse existing `SchemaValidator` to maintain consistency with CLI
- **IMP-008**: Emit events through existing `EventEmitter` for editor actions (file opened, configuration saved, etc.) to enable analytics and debugging

## References

- **REF-001**: [ADR-001: Interface-Based Architecture](./ADR-001-interface-based-architecture.md) - Foundation for editor server abstraction
- **REF-002**: [ADR-002: Dependency Injection Container](./ADR-002-dependency-injection-container.md) - Service reuse pattern for editor API
- **REF-003**: [ADR-003: Event-Driven Cross-Cutting Concerns](./ADR-003-event-driven-cross-cutting-concerns.md) - Event integration for editor actions
- **REF-004**: [Microsoft Monaco Editor Documentation](https://microsoft.github.io/monaco-editor/) - Editor component API reference
- **REF-005**: [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html) - Security guidelines for web server
- **REF-006**: [VS Code Extension API](https://code.visualstudio.com/api) - UI/UX design inspiration
- **REF-007**: [React Best Practices](https://react.dev/learn) - Frontend architecture guidelines
- **REF-008**: [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Security considerations for web applications
