# 📋 Geese Requirements Document

## 🎯 Project Overview

Geese is a CLI tool that processes `.geese` files to apply AI-powered transformations to codebases using the Goose AI assistant. The tool enables automated code reviews, documentation generation, refactoring assistance, and other AI-driven tasks.

## 🏗️ Architecture

### Core Components

1. **CLI Interface** (`bin/geese.js`)
   - Command-line argument parsing
   - Interactive file selection
   - User experience orchestration

2. **Geese Parser** (`src/geese-parser.js`)
   - `.geese` file parsing with YAML frontmatter
   - Handlebars template processing
   - File pattern matching (include/exclude)

3. **Goose Runner** (`src/goose-runner.js`)
   - Goose AI process execution
   - Configuration management
   - Error handling

4. **Report Generator** (`src/report-generator.js`)
   - Markdown report generation
   - Session tracking
   - Output formatting

### Dependencies

- **commander**: CLI framework for argument parsing
- **inquirer**: Interactive command line prompts
- **handlebars**: Template engine for prompt generation
- **gray-matter**: Frontmatter parsing for `.geese` files
- **glob**: File pattern matching
- **chalk**: Terminal color formatting
- **fs-extra**: Enhanced file system operations

## 📄 .geese File Specification

### File Structure

```
.geese file:
├── Frontmatter (YAML)
│   ├── Required Properties
│   │   ├── include: string[]
│   │   └── recipe: string
│   ├── Optional Properties  
│   │   ├── exclude: string[]
│   │   ├── model: string
│   │   └── custom_properties: any
│   └── Goose Configuration (@prefix)
│       ├── @temperature: number
│       ├── @max_tokens: number
│       └── @flags: string[]
└── Template Content (Handlebars)
```

### Required Frontmatter Properties

- **include** (string[]): Array of glob patterns for files to process
- **recipe** (string): The Goose recipe to use for processing

### Optional Frontmatter Properties

- **exclude** (string[]): Array of glob patterns for files to exclude
- **model** (string): AI model to use (e.g., "gpt-4", "claude-3")
- **Custom Properties**: Any additional properties become available as template variables

### Goose Configuration Properties (@prefix)

- **@temperature** (number): AI response temperature (0.0-1.0)
- **@max_tokens** (number): Maximum tokens in AI response
- **@flags** (string[]): Additional CLI flags for Goose

### Template Variables

Predefined variables available in Handlebars templates:

- `{{filename}}`: Target filename (e.g., "app.js")
- `{{filepath}}`: Full path to target file
- `{{content}}`: Complete file content
- `{{geese_file}}`: Name of the .geese file (without extension)
- Custom variables from frontmatter properties

### Example .geese File

```yaml
---
include:
  - "src/**/*.js"
  - "src/**/*.jsx"
exclude:
  - "*.test.js"
  - "node_modules/**"
recipe: "code-review"
@temperature: 0.7
@max_tokens: 2000
project_name: "My Application"
review_focus: "performance and security"
---

Please review the following file from {{project_name}}.

File: {{filename}}
Path: {{filepath}}

Focus areas: {{review_focus}}

Content to review:
{{content}}
```

## 🛠️ Functional Requirements

### Core Functionality

#### FR1: .geese File Discovery
- **Priority**: High
- **Description**: Automatically discover all `.geese` files in specified directory
- **Acceptance Criteria**:
  - Search recursively through subdirectories
  - Return array of absolute file paths
  - Handle non-existent directories gracefully

#### FR2: Interactive File Selection
- **Priority**: High
- **Description**: Allow users to select which `.geese` files and target files to process
- **Acceptance Criteria**:
  - Display .geese files with file sizes
  - Support multi-selection with space bar
  - Show target files with relative paths
  - Handle single file scenario without selection prompt

#### FR3: Template Processing
- **Priority**: High
- **Description**: Process Handlebars templates with file context
- **Acceptance Criteria**:
  - Parse YAML frontmatter correctly
  - Render Handlebars templates with all variables
  - Include file content in templates
  - Support custom template variables

#### FR4: File Pattern Matching
- **Priority**: High
- **Description**: Match files using include/exclude patterns
- **Acceptance Criteria**:
  - Support glob patterns (e.g., `**/*.js`, `src/**`)
  - Apply include patterns first
  - Filter out exclude patterns
  - Remove duplicate file paths

#### FR5: Goose Integration
- **Priority**: High
- **Description**: Execute Goose with generated prompts and configuration
- **Acceptance Criteria**:
  - Spawn Goose process with appropriate flags
  - Pass generated prompts via stdin
  - Capture stdout and stderr
  - Handle process timeouts and errors

#### FR6: Report Generation
- **Priority**: Medium
- **Description**: Generate comprehensive markdown reports
- **Acceptance Criteria**:
  - Create summary table of all sessions
  - Include detailed information for each file
  - Show configuration, prompts, and responses
  - Generate timestamped filenames

#### FR7: Error Handling
- **Priority**: High
- **Description**: Handle errors gracefully throughout the application
- **Acceptance Criteria**:
  - Validate .geese file format
  - Handle file system errors
  - Catch Goose process failures
  - Provide meaningful error messages

### Non-Functional Requirements

#### NFR1: Performance
- **Priority**: Medium
- **Requirements**:
  - Process files efficiently
  - Handle large file content (>1MB)
  - Responsive CLI interaction

#### NFR2: Usability
- **Priority**: High
- **Requirements**:
  - Intuitive CLI interface
  - Clear error messages
  - Helpful help documentation
  - Progress indicators

#### NFR3: Reliability
- **Priority**: High
- **Requirements**:
  - Robust error handling
  - Graceful degradation
  - Consistent behavior across platforms

#### NFR4: Maintainability
- **Priority**: Medium
- **Requirements**:
  - Clean code architecture
  - Comprehensive documentation
  - Modular design
  - Easy configuration

## 🚀 Command Line Interface

### Commands and Options

```
geese [directory] [options]

Arguments:
  directory         Directory to search for .geese files (default: ".")

Options:
  -f, --file <file>     Process a specific .geese file
  -o, --output <dir>    Output directory for logs (default: "./logs")
  -g, --goose-path <path> Path to goose executable (default: "goose")
  --dry-run           Show what would be processed without executing goose
  -h, --help           Display help for command
  -V, --version        Display version number
```

### Usage Scenarios

#### Scenario 1: Basic Processing
```bash
geese ./my-project
```
- Discover all .geese files in ./my-project
- Allow interactive selection
- Process selected files
- Generate report

#### Scenario 2: Specific File
```bash
geese -f code-review.geese
```
- Process only the specified .geese file
- Skip file selection prompt
- Process all matched target files

#### Scenario 3: Dry Run
```bash
geese --dry-run
```
- Show what would be processed
- Display generated prompts
- Do not execute Goose

#### Scenario 4: Custom Configuration
```bash
geese -o ./reports -g /custom/goose/path
```
- Custom output directory for reports
- Custom path to Goose executable

## 📊 Report Format

### Report Structure

```markdown
# Geese Processing Report

**Generated:** [timestamp]
**Total Sessions:** [number]
**Total Duration:** [milliseconds]

## Summary

| Geese File | Target File | Duration | Status |
|------------|-------------|----------|---------|

## Session [N]: [geese-file] → [target-file]

**Start Time:** [timestamp]
**Duration:** [milliseconds]
**Status:** [Success/Failed]

### Goose Configuration
```json
[configuration object]
```

### Context Variables
```json
[variables object]
```

### File Content Preview
```
[content preview]
```

### Generated Prompt
```
[rendered template]
```

### Response
```
[goose response]
```

### Token Information
- Input Tokens: [number]
- Output Tokens: [number]
- Total Tokens: [number]
```

## 🔒 Security Considerations

### Input Validation
- Validate file paths to prevent directory traversal
- Sanitize template inputs
- Limit file size to prevent memory issues

### Command Injection
- Escape shell arguments properly
- Validate goose path configuration
- Use safe process spawning

### File System Access
- Check file permissions before processing
- Handle permission denied errors gracefully
- Respect .gitignore patterns when appropriate

## 🧪 Testing Requirements

### Unit Tests
- Test each component in isolation
- Mock external dependencies (file system, child processes)
- Cover error scenarios and edge cases

### Integration Tests
- Test end-to-end workflows
- Test with actual .geese files
- Verify report generation

### Manual Testing Scenarios
- Process single and multiple .geese files
- Test with various glob patterns
- Verify error handling
- Test CLI options and flags

## 📦 Distribution Requirements

### NPM Package
- Proper package.json configuration
- Binary entry point configured
- Dependencies properly declared
- Documentation included

### Cross-Platform Support
- Windows, macOS, Linux compatibility
- Handle path separators correctly
- Test with different Node.js versions (>=16.0.0)

### Installation
- Global installation support
- Local development setup
- PATH configuration for CLI

## 🚧 Future Enhancements

### Version 2.0 Features
- Configuration file support
- Plugin system for custom processors
- Batch processing capabilities
- REST API interface

### Potential Integrations
- IDE plugins
- CI/CD pipeline integration
- Cloud storage support
- Database processing

### Performance Improvements
- Parallel file processing
- Caching mechanisms
- Incremental processing
- Memory optimization
