# Implement Gemini CLI Runner Provider and Runner

## Overview
Implement a custom runner provider and runner for Google's Gemini CLI tool to enable geese to process files using Gemini AI models.

## Background
The geese architecture supports multiple AI CLI tools through a provider/runner pattern. Currently, only Goose is implemented as a built-in runner. This issue tracks the implementation of a Gemini CLI runner following the same architecture.

## Research Summary

### Gemini CLI Configuration Properties

**API and Model Configuration:**
- `api-key` - API key for authentication (env: `GEMINI_API_KEY`)
- `model` - Model selection (default: `gemini-pro`, env: `GEMINI_MODEL`)
- `temperature` - Creativity control, range 0.0-1.0 (default: 0.7, env: `GEMINI_TEMPERATURE`)
- `max-tokens` - Response length control (default: 2048)

**Interface Options:**
- `theme` - Appearance (auto/light/dark)
- `output-format` - Output format (text/markdown/json)
- `stream` - Enable/disable streaming responses
- `history-limit` - History limit (default: 10)

**Tools and Extensions:**
- `tools-enabled` - Enable/disable tools
- `tool-timeout` - Tool timeout in seconds
- `plugins-dir` - Plugins directory path

**Security and Privacy:**
- `safe-mode` - Enable safety restrictions
- `log-level` - Logging level (error/warn/info/debug)
- `data-collection` - Enable/disable data collection

### Configuration Methods
- Settings files: `~/.gemini/settings.json` (user), `.gemini/settings.json` (project)
- Environment variables: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TEMPERATURE`, etc.
- Command-line arguments (highest precedence)

### Key Commands
- `gemini config set <key> <value>` - Set configuration value
- `gemini config get <key>` - Get configuration value
- `gemini config list` - List all configuration

## Implementation Tasks

### 1. Create GeminiProvider.js
Location: `~/.geese/runners/gemini/GeminiProvider.js` or `src/providers/GeminiProvider.js`

**Required Methods:**
- `getDefaultPath()` - Return `'gemini'`
- `getFrontmatterSchema()` - Define required/optional properties
  - Required: `include`
  - Optional: `exclude`, `model`, `temperature`, `max_tokens`, `output_format`, `stream`, `tools_enabled`, `safe_mode`, `log_level`, `flags`
- `getDefaultFrontmatter()` - Return default configuration object
- `getDefaultTemplate()` - Return default prompt template
- `buildArgs(config)` - Build command-line arguments from config

**Example buildArgs Implementation:**
```javascript
buildArgs(config) {
  const args = [];
  
  // Add model
  if (config.model) {
    args.push('--model', config.model);
  }
  
  // Add temperature
  if (config.temperature !== undefined) {
    args.push('--temperature', String(config.temperature));
  }
  
  // Add max tokens
  if (config.max_tokens) {
    args.push('--max-tokens', String(config.max_tokens));
  }
  
  // Add output format
  if (config.output_format) {
    args.push('--output-format', config.output_format);
  }
  
  // Add streaming
  if (config.stream !== undefined) {
    args.push('--stream', String(config.stream));
  }
  
  // Add tools
  if (config.tools_enabled !== undefined) {
    args.push('--tools-enabled', String(config.tools_enabled));
  }
  
  // Add safe mode
  if (config.safe_mode !== undefined) {
    args.push('--safe-mode', String(config.safe_mode));
  }
  
  // Add log level
  if (config.log_level) {
    args.push('--log-level', config.log_level);
  }
  
  // Add any additional flags
  if (config.flags && Array.isArray(config.flags)) {
    args.push(...config.flags);
  }
  
  return args;
}
```

### 2. Create GeminiRunner.js
Location: `~/.geese/runners/gemini/GeminiRunner.js` or `src/runners/GeminiRunner.js`

**Implementation:**
- Extend or wrap `ToolExecutor` class
- Use `GeminiProvider` for command building
- Support all runner types: `real`, `console`, `memory`, `file`
- Delegate provider methods for convenience

**Key Methods:**
- `constructor()` - Initialize provider and executor
- `initializeExecutor(runnerType, options)` - Set up executor
- `execute(prompt, config, options)` - Execute Gemini with prompt
- `setPath(path)` - Set custom executable path
- Delegate all provider methods

### 3. Create index.js
Location: `~/.geese/runners/gemini/index.js`

```javascript
const GeminiRunner = require('./GeminiRunner');
const GeminiProvider = require('./GeminiProvider');

module.exports = {
  Runner: GeminiRunner,
  Provider: GeminiProvider
};
```

### 4. Integration Points

**Binding to Existing Structure:**
- Follow `IAIToolProvider` interface from `src/interfaces/IAIToolProvider.js`
- Follow `IAIToolRunner` interface from `src/interfaces/IAIToolRunner.js`
- Use `ToolExecutor` from `src/ToolExecutor.js` for command execution
- Register with `ToolRegistry` in `src/tool-registry.js`

**Configuration Loading:**
- Support hierarchical configuration (core → global → local → CLI)
- Read from `~/.geese/config.json` for global defaults
- Read from `./.geese/config.json` for local overrides
- Support environment variables for API keys

**File Processing:**
- Work with `.geese` file format (YAML frontmatter + Handlebars template)
- Support `_include` and `_exclude` patterns
- Process template variables: `{{filename}}`, `{{filepath}}`, `{{content}}`
- Support pipe operations for data transformation

## Testing Checklist

- [ ] Create gemini runner using `geese runner new gemini`
- [ ] Verify provider implements all required methods
- [ ] Test buildArgs with various configurations
- [ ] Create sample .geese file with `geese new test-gemini --tool gemini`
- [ ] Test with dry-run: `geese run --dry-run`
- [ ] Test with actual execution (if Gemini CLI is installed)
- [ ] Verify configuration hierarchy works
- [ ] Test environment variable support
- [ ] Verify error handling for missing API key
- [ ] Test with custom flags

## Example .geese File

```yaml
---
_include:
  - "src/**/*.js"
_exclude:
  - "node_modules/**"
  - "*.test.js"
model: "gemini-pro"
temperature: 0.7
max_tokens: 2048
output_format: "markdown"
stream: true
safe_mode: true
log_level: "info"
---

Please analyze the following JavaScript file.

File: {{filename}}
Path: {{filepath}}

Content:
{{content}}

Please provide:
1. Code quality assessment
2. Potential improvements
3. Security concerns
4. Best practices recommendations
```

## Documentation

After implementation, update:
- `README.md` - Add Gemini to supported tools list
- `docs/CUSTOM_TOOL_RUNNERS.md` - Add Gemini as example
- Create example configurations in `examples/configs/`

## References

- [Gemini CLI Configuration Docs](https://geminicli.com/docs/cli/configuration/)
- [Gemini CLI GitHub](https://github.com/google-gemini/gemini-cli)
- [Geese IAIToolProvider Interface](src/interfaces/IAIToolProvider.js)
- [Geese IAIToolRunner Interface](src/interfaces/IAIToolRunner.js)
- [Goose Provider Implementation](src/providers/GooseProvider.js)
