# Implement Claude Code CLI Runner Provider and Runner

## Overview
Implement a custom runner provider and runner for Anthropic's Claude Code CLI tool to enable geese to process files using Claude AI models.

## Background
The geese architecture supports multiple AI CLI tools through a provider/runner pattern. Currently, only Goose is implemented as a built-in runner. This issue tracks the implementation of a Claude Code CLI runner following the same architecture.

## Research Summary

### Claude Code CLI Configuration Properties

**Core Commands:**
- `claude` - Interactive REPL session
- `claude "query"` - Start REPL with initial prompt
- `claude -p "query"` - Print (non-interactive) mode
- `claude -c` - Continue most recent session
- `claude -r "<session-id>"` - Resume specific session
- `claude update` - Update CLI
- `claude mcp` - Configure Model Context Protocol servers

**General Flags:**
- `--add-dir <path>` - Add directories Claude can access
- `--agents <JSON>` - Define custom subagents
- `--allowedTools <list>` - Tools allowed without confirmation
- `--disallowedTools <list>` - Tools disallowed without confirmation
- `--print, -p` - Non-interactive output mode
- `--system-prompt <text>` - Replace system prompt
- `--system-prompt-file <path>` - Load system prompt from file
- `--append-system-prompt <text>` - Append to system prompt
- `--output-format <text/json/stream-json/markdown>` - Output format
- `--input-format <text/stream-json>` - Input format
- `--json-schema <JSON>` - Get validated JSON output
- `--include-partial-messages` - Include partial streaming events
- `--verbose` - Detailed logging

**Session Management:**
- `--settings <path>` - Load settings JSON file
- `--mcp-config <path...>` - Configure MCP servers
- `--setting-sources <scope>` - Choose settings scopes
- `--continue` - Resume most recent session
- `--resume` - Interactive session selector

**Settings File Structure (`settings.json`):**
```json
{
  "model": "claude-sonnet-4-20250514",
  "maxTokens": 4096,
  "permissions": {
    "allowedTools": ["Read", "Write", "Bash(git *)"],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Write(./production.config.*)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write(*.py)",
        "hooks": [
          {
            "type": "command",
            "command": "python -m black $file"
          }
        ]
      }
    ]
  }
}
```

**Context & Memory:**
- `CLAUDE.md` files - Automatic project context loading
- Placed in project root or subdirectories
- Contains persistent instructions, code style, workflows

**Authentication:**
- `ANTHROPIC_API_KEY` environment variable
- Browser-based authentication for Pro/Max users

## Implementation Tasks

### 1. Create ClaudeCodeProvider.js
Location: `~/.geese/runners/claudecode/ClaudeCodeProvider.js` or `src/providers/ClaudeCodeProvider.js`

**Required Methods:**
- `getDefaultPath()` - Return `'claude'`
- `getFrontmatterSchema()` - Define required/optional properties
  - Required: `include`
  - Optional: `exclude`, `model`, `max_tokens`, `system_prompt`, `system_prompt_file`, `append_system_prompt`, `output_format`, `input_format`, `allowed_tools`, `disallowed_tools`, `add_dir`, `agents`, `json_schema`, `verbose`, `settings_file`, `mcp_config`, `continue_session`, `resume_session`, `flags`
- `getDefaultFrontmatter()` - Return default configuration object
- `getDefaultTemplate()` - Return default prompt template
- `buildArgs(config)` - Build command-line arguments from config

**Example buildArgs Implementation:**
```javascript
buildArgs(config) {
  const args = [];
  
  // Use print mode for non-interactive execution
  args.push('-p');
  
  // Add model (through settings or direct config)
  if (config.model) {
    // Note: Model is typically set in settings.json
    // May need to be passed via --settings or environment
  }
  
  // Add system prompt
  if (config.system_prompt) {
    args.push('--system-prompt', config.system_prompt);
  } else if (config.system_prompt_file) {
    args.push('--system-prompt-file', config.system_prompt_file);
  }
  
  // Append to system prompt
  if (config.append_system_prompt) {
    args.push('--append-system-prompt', config.append_system_prompt);
  }
  
  // Add output format
  if (config.output_format) {
    args.push('--output-format', config.output_format);
  }
  
  // Add input format
  if (config.input_format) {
    args.push('--input-format', config.input_format);
  }
  
  // Add allowed tools
  if (config.allowed_tools && Array.isArray(config.allowed_tools)) {
    args.push('--allowedTools', config.allowed_tools.join(','));
  }
  
  // Add disallowed tools
  if (config.disallowed_tools && Array.isArray(config.disallowed_tools)) {
    args.push('--disallowedTools', config.disallowed_tools.join(','));
  }
  
  // Add directories
  if (config.add_dir) {
    if (Array.isArray(config.add_dir)) {
      config.add_dir.forEach(dir => args.push('--add-dir', dir));
    } else {
      args.push('--add-dir', config.add_dir);
    }
  }
  
  // Add agents
  if (config.agents) {
    args.push('--agents', JSON.stringify(config.agents));
  }
  
  // Add JSON schema
  if (config.json_schema) {
    args.push('--json-schema', JSON.stringify(config.json_schema));
  }
  
  // Add verbose flag
  if (config.verbose) {
    args.push('--verbose');
  }
  
  // Add settings file
  if (config.settings_file) {
    args.push('--settings', config.settings_file);
  }
  
  // Add MCP config
  if (config.mcp_config) {
    if (Array.isArray(config.mcp_config)) {
      config.mcp_config.forEach(cfg => args.push('--mcp-config', cfg));
    } else {
      args.push('--mcp-config', config.mcp_config);
    }
  }
  
  // Session management
  if (config.continue_session) {
    args.push('--continue');
  } else if (config.resume_session) {
    args.push('--resume', config.resume_session);
  }
  
  // Add any additional flags
  if (config.flags && Array.isArray(config.flags)) {
    args.push(...config.flags);
  }
  
  return args;
}
```

### 2. Create ClaudeCodeRunner.js
Location: `~/.geese/runners/claudecode/ClaudeCodeRunner.js` or `src/runners/ClaudeCodeRunner.js`

**Implementation:**
- Extend or wrap `ToolExecutor` class
- Use `ClaudeCodeProvider` for command building
- Support all runner types: `real`, `console`, `memory`, `file`
- Delegate provider methods for convenience

**Key Methods:**
- `constructor()` - Initialize provider and executor
- `initializeExecutor(runnerType, options)` - Set up executor
- `execute(prompt, config, options)` - Execute Claude Code with prompt
- `setPath(path)` - Set custom executable path
- Delegate all provider methods

**Special Considerations:**
- Handle print mode for non-interactive execution
- Support session continuation and resumption
- Implement settings.json generation/loading
- Support CLAUDE.md context files
- Handle permissions and tool restrictions
- Support hooks for post-processing

### 3. Create index.js
Location: `~/.geese/runners/claudecode/index.js`

```javascript
const ClaudeCodeRunner = require('./ClaudeCodeRunner');
const ClaudeCodeProvider = require('./ClaudeCodeProvider');

module.exports = {
  Runner: ClaudeCodeRunner,
  Provider: ClaudeCodeProvider
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
- Support environment variable `ANTHROPIC_API_KEY`
- Support `.claude/settings.json` for Claude-specific settings
- Consider auto-generating settings.json from geese config

**Context Management:**
- Optionally generate `CLAUDE.md` files for persistent context
- Support project-level and directory-level context files
- Enable users to specify custom context in frontmatter

**File Processing:**
- Work with `.geese` file format (YAML frontmatter + Handlebars template)
- Support `_include` and `_exclude` patterns
- Process template variables: `{{filename}}`, `{{filepath}}`, `{{content}}`
- Support pipe operations for data transformation

**Security and Permissions:**
- Default to safe tool restrictions
- Support allowedTools and disallowedTools configuration
- Document security best practices
- Support deny patterns for sensitive files

## Testing Checklist

- [ ] Create claudecode runner using `geese runner new claudecode`
- [ ] Verify provider implements all required methods
- [ ] Test buildArgs with various configurations
- [ ] Create sample .geese file with `geese new test-claude --tool claudecode`
- [ ] Test with dry-run: `geese run --dry-run`
- [ ] Test with actual execution (if Claude Code CLI is installed)
- [ ] Verify configuration hierarchy works
- [ ] Test environment variable support (ANTHROPIC_API_KEY)
- [ ] Test settings.json integration
- [ ] Test CLAUDE.md context loading
- [ ] Verify tool permissions enforcement
- [ ] Test session continuation
- [ ] Test hooks functionality
- [ ] Verify error handling for missing API key
- [ ] Test with custom flags
- [ ] Test output format options
- [ ] Test agents configuration

## Example .geese File

```yaml
---
_include:
  - "src/**/*.js"
  - "src/**/*.ts"
_exclude:
  - "node_modules/**"
  - "*.test.js"
  - ".env*"
model: "claude-sonnet-4-20250514"
max_tokens: 4096
output_format: "markdown"
allowed_tools:
  - "Read"
  - "Write"
  - "Bash(git *)"
disallowed_tools: []
add_dir:
  - "src"
  - "lib"
verbose: true
append_system_prompt: "Focus on code quality, security, and best practices."
---

Please perform a comprehensive code review of the following file.

File: {{filename}}
Path: {{filepath}}

Content:
{{content}}

Please provide:
1. Code quality assessment
2. Security vulnerabilities and concerns
3. Performance optimization opportunities
4. Best practices compliance
5. Specific, actionable recommendations
6. Potential bugs or edge cases
```

## Example with Settings File

```yaml
---
_include:
  - "src/**/*.py"
_exclude:
  - "**/__pycache__/**"
  - "*.pyc"
settings_file: "./.claude/python-review.json"
output_format: "json"
---

Analyze this Python file for quality and security.

File: {{filename}}

Content:
{{content}}
```

**Referenced settings file (`.claude/python-review.json`):**
```json
{
  "model": "claude-sonnet-4-20250514",
  "maxTokens": 8192,
  "permissions": {
    "allowedTools": ["Read", "Write", "Bash(python -m *)"],
    "deny": [
      "Read(./.env)",
      "Write(./production.py)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write(*.py)",
        "hooks": [
          {
            "type": "command",
            "command": "python -m black $file && python -m pylint $file"
          }
        ]
      }
    ]
  }
}
```

## Example with Context File

Create `.claude/CLAUDE.md` in project root:
```markdown
# Project Context for Code Reviews

## Code Style
- Use PEP 8 for Python
- Use ESLint for JavaScript
- Prefer functional programming patterns

## Security Requirements
- Never log sensitive data
- Sanitize all user inputs
- Use parameterized queries for SQL

## Testing Standards
- Minimum 80% code coverage
- Unit tests for all public APIs
- Integration tests for critical paths
```

## Documentation

After implementation, update:
- `README.md` - Add Claude Code to supported tools list
- `docs/CUSTOM_TOOL_RUNNERS.md` - Add Claude Code as example
- Create example configurations in `examples/configs/`
- Document permissions and security best practices
- Add CLAUDE.md usage examples
- Document hooks and post-processing
- Add settings.json templates

## References

- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Claude Code CLI Cheatsheet](https://shipyard.build/blog/claude-code-cheat-sheet/)
- [Geese IAIToolProvider Interface](src/interfaces/IAIToolProvider.js)
- [Geese IAIToolRunner Interface](src/interfaces/IAIToolRunner.js)
- [Goose Provider Implementation](src/providers/GooseProvider.js)

## Notes

- Claude Code has sophisticated permission and security features
- Settings files provide fine-grained control over behavior
- CLAUDE.md files enable persistent project context
- Hooks allow automatic post-processing of tool outputs
- Session management enables continuing conversations
- Print mode (`-p`) is ideal for non-interactive geese workflows
- Consider creating templates for common settings.json configurations
- MCP (Model Context Protocol) support enables advanced integrations
