# Custom Tool Runners Guide

This guide explains how to create custom tool runners to integrate any CLI AI tool with Geese, following the same pattern as the built-in Goose runner.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Runner Architecture](#runner-architecture)
4. [Creating a Custom Runner](#creating-a-custom-runner)
5. [Provider Implementation](#provider-implementation)
6. [Runner Implementation](#runner-implementation)
7. [Testing Your Runner](#testing-your-runner)
8. [Advanced Usage](#advanced-usage)
9. [Examples](#examples)

---

## Overview

Custom tool runners allow you to integrate any CLI AI tool (like Aider, Claude CLI, ChatGPT CLI, etc.) with Geese's workflow. Each runner consists of two main components:

- **Provider**: Defines how to structure commands for your tool
- **Runner**: Wraps the ToolExecutor to execute commands

Custom runners are automatically discovered and loaded from:
- **Global**: `~/.geese/runners/` - Available across all projects
- **Local**: `./.geese/runners/` - Project-specific (highest priority)

## Quick Start

### Creating a New Runner

```bash
# Create a new runner
geese runner new aider -d "Aider AI coding assistant"

# Create a local project-specific runner
geese runner new myTool --local -d "My custom AI tool"
```

This creates a directory structure:
```
~/.geese/runners/aider/
├── AiderProvider.js    # Command structure and configuration
├── AiderRunner.js      # Execution wrapper
└── index.js           # Entry point
```

### Listing Available Runners

```bash
# Simple list
geese runner list

# Show where each runner comes from
geese runner list --sources
```

### Removing a Runner

```bash
# Remove a global runner
geese runner remove aider

# Remove a local runner
geese runner remove myTool --local
```

## Runner Architecture

Geese's runner architecture follows these design principles:

1. **Provider Pattern**: Separates command structure from execution
2. **Strategy Pattern**: Different execution strategies (real, dry-run, memory, file)
3. **Hierarchical Loading**: Local runners override global runners
4. **Interface-Based**: All runners implement the same interface

```
┌─────────────────────────────────────────────┐
│           Tool Registry                      │
│  (Manages all available runners)             │
└──────────────┬──────────────────────────────┘
               │
               ├─ Built-in: goose
               ├─ Global: ~/.geese/runners/
               └─ Local: ./.geese/runners/
                         │
        ┌────────────────┴────────────────┐
        │                                 │
   ┌────▼─────┐                    ┌─────▼────┐
   │ Provider │◄───────────────────┤  Runner  │
   └──────────┘                    └──────────┘
   │                                     │
   │ - getDefaultPath()                 │ - execute()
   │ - getFrontmatterSchema()           │ - setPath()
   │ - getDefaultFrontmatter()          │ - initializeExecutor()
   │ - getDefaultTemplate()             │
   │ - buildArgs()                      │
   │                                     │
   └─────────────────┬───────────────────┘
                     │
              ┌──────▼───────┐
              │ ToolExecutor │
              └──────┬───────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼───┐  ┌────▼───┐  ┌────▼────┐
   │ Real   │  │Console │  │ Memory  │
   │Runner  │  │Logger  │  │ Runner  │
   └────────┘  └────────┘  └─────────┘
```

## Creating a Custom Runner

### Step 1: Generate the Runner

```bash
geese runner new myTool -d "Description of my tool"
```

This creates three files with template code that you'll customize.

### Step 2: Edit the Provider

The provider defines how your tool works. Edit `MyToolProvider.js`:

```javascript
const IAIToolProvider = require('...');

class MyToolProvider extends IAIToolProvider {
  // Return the executable name or path
  getDefaultPath() {
    return 'mytool'; // Must match your CLI tool
  }

  // Define required and optional frontmatter fields
  getFrontmatterSchema() {
    return {
      required: ['include', 'recipe'],
      optional: ['exclude', 'model', 'temperature', 'max_tokens', 'flags']
    };
  }

  // Default values for new .geese files
  getDefaultFrontmatter() {
    return {
      include: ['src/**/*.js'],
      exclude: ['node_modules/**'],
      recipe: 'code-review',
      temperature: 0.7
    };
  }

  // Default template content
  getDefaultTemplate() {
    return `Analyze this file:
{{filename}}

{{content}}`;
  }

  // Build command-line arguments
  buildArgs(config) {
    const args = [];
    
    // Add your tool-specific flags
    if (config.model) {
      args.push('--model', config.model);
    }
    
    if (config.temperature !== undefined) {
      args.push('--temperature', String(config.temperature));
    }
    
    // Add custom flags from config
    if (config.flags && Array.isArray(config.flags)) {
      args.push(...config.flags);
    }
    
    return args;
  }
}

module.exports = MyToolProvider;
```

### Step 3: The Runner (Usually No Changes Needed)

The generated runner wraps ToolExecutor and typically doesn't need modification:

```javascript
class MyToolRunner {
  constructor() {
    this.provider = new MyToolProvider();
    this.executor = null;
  }

  // Initialize with execution strategy
  initializeExecutor(runnerType = 'real', options = {}) {
    this.executor = ToolExecutor.create(this.provider, runnerType, options);
  }

  // Execute with prompt and config
  async execute(prompt, config = {}, options = {}) {
    const executor = this.getExecutor();
    return await executor.execute(prompt, config, options);
  }

  // Delegate to provider
  getDefaultPath() {
    return this.provider.getDefaultPath();
  }
  
  // ... other delegation methods
}
```

## Provider Implementation

### Required Methods

#### `getDefaultPath()`

Returns the default executable path or name.

```javascript
getDefaultPath() {
  return 'aider'; // Tool must be in PATH
  // or return '/usr/local/bin/aider'; // Absolute path
}
```

#### `getFrontmatterSchema()`

Defines required and optional frontmatter properties.

```javascript
getFrontmatterSchema() {
  return {
    required: ['include', 'prompt'],
    optional: ['exclude', 'model', 'max_tokens']
  };
}
```

#### `getDefaultFrontmatter()`

Provides default values for new .geese files.

```javascript
getDefaultFrontmatter() {
  return {
    include: ['src/**/*.js'],
    exclude: ['node_modules/**', '*.test.js'],
    prompt: 'Review this code',
    model: 'gpt-4'
  };
}
```

#### `getDefaultTemplate()`

Returns the default template content.

```javascript
getDefaultTemplate() {
  return `Review the following file:

File: {{filename}}
Path: {{filepath}}

Content:
{{content}}

Please provide feedback.`;
}
```

#### `buildArgs(config)`

Builds command-line arguments from configuration.

```javascript
buildArgs(config) {
  const args = [];
  
  // Map config to CLI flags
  if (config.model) {
    args.push('--model', config.model);
  }
  
  if (config.temperature !== undefined) {
    args.push('--temp', String(config.temperature));
  }
  
  // Include custom flags
  if (config.flags) {
    args.push(...config.flags);
  }
  
  return args;
}
```

### Best Practices

1. **Use Standard Property Names**: Stick to common properties like `model`, `temperature`, `max_tokens` for consistency
2. **Validate in buildArgs**: Check config values and provide sensible defaults
3. **Document Tool-Specific Flags**: Comment on any tool-specific behavior
4. **Handle Missing Config**: Gracefully handle undefined config properties

## Runner Implementation

The runner is typically a thin wrapper and rarely needs modification. The generated template handles most use cases.

### When to Customize the Runner

Customize the runner if you need:

1. **Custom Initialization**: Special setup before execution
2. **Post-Processing**: Transform output before returning
3. **State Management**: Track execution history or state
4. **Advanced Features**: Tool-specific capabilities

Example customization:

```javascript
class CustomRunner {
  constructor() {
    this.provider = new CustomProvider();
    this.executor = null;
    this.executionHistory = []; // Custom state
  }

  async execute(prompt, config = {}, options = {}) {
    // Pre-processing
    const enhancedPrompt = this.enhancePrompt(prompt);
    
    // Execute
    const executor = this.getExecutor();
    const result = await executor.execute(enhancedPrompt, config, options);
    
    // Post-processing
    this.executionHistory.push({
      timestamp: Date.now(),
      success: result.success
    });
    
    return this.transformOutput(result);
  }

  enhancePrompt(prompt) {
    // Add custom pre-processing
    return `[Enhanced]\n${prompt}`;
  }

  transformOutput(result) {
    // Add custom post-processing
    return {
      ...result,
      metadata: { executionCount: this.executionHistory.length }
    };
  }
}
```

## Testing Your Runner

### Manual Testing

1. **Create a test runner**:
   ```bash
   geese runner new testTool --local
   ```

2. **Create a test .geese file**:
   ```bash
   geese new test-run --tool testTool
   ```

3. **Test in dry-run mode**:
   ```bash
   geese run --dry-run
   ```

4. **Test actual execution**:
   ```bash
   geese run  # If tool is available
   ```

### Validation Checklist

- [ ] Runner loads without errors: `geese runner list`
- [ ] Provider methods return correct types
- [ ] `buildArgs()` produces valid command-line arguments
- [ ] Default template renders correctly
- [ ] Dry-run mode works: `geese run --dry-run`
- [ ] Tool executes successfully (if installed)

### Debugging

```bash
# Show configuration hierarchy
geese run --debug-config

# Dry-run with file output for inspection
geese run --dry-run-file debug.txt

# Check runner source
geese runner list --sources
```

## Advanced Usage

### Tool-Specific Configuration

Create tool-specific configuration in `~/.geese/config.json`:

```json
{
  "myTool": {
    "model": "gpt-4",
    "temperature": 0.7,
    "customFlag": "value"
  },
  "defaultTool": "myTool"
}
```

### Environment Variables

Use environment variables in your provider:

```javascript
getDefaultPath() {
  return process.env.MYTOOL_PATH || 'mytool';
}

buildArgs(config) {
  const args = [];
  
  const apiKey = process.env.MYTOOL_API_KEY;
  if (apiKey) {
    args.push('--api-key', apiKey);
  }
  
  // ... rest of args
  return args;
}
```

### Multiple Execution Strategies

Switch execution strategies programmatically:

```javascript
// In run command
if (options.dryRun) {
  toolRunner.initializeExecutor('console');
} else if (options.test) {
  toolRunner.initializeExecutor('memory', { 
    mockResponse: { success: true, stdout: 'Test output' }
  });
} else {
  toolRunner.initializeExecutor('real');
}
```

## Examples

### Example 1: Aider Integration

```javascript
// AiderProvider.js
class AiderProvider extends IAIToolProvider {
  getDefaultPath() {
    return 'aider';
  }

  getFrontmatterSchema() {
    return {
      required: ['include', 'message'],
      optional: ['exclude', 'model', 'edit_format', 'auto_commits']
    };
  }

  getDefaultFrontmatter() {
    return {
      include: ['src/**/*.js'],
      exclude: ['node_modules/**'],
      message: 'Review and suggest improvements',
      model: 'gpt-4-turbo',
      edit_format: 'whole',
      auto_commits: false
    };
  }

  getDefaultTemplate() {
    return `{{message}}

File: {{filename}}

{{content}}`;
  }

  buildArgs(config) {
    const args = [];
    
    if (config.model) {
      args.push('--model', config.model);
    }
    
    if (config.edit_format) {
      args.push('--edit-format', config.edit_format);
    }
    
    if (config.auto_commits) {
      args.push('--auto-commits');
    }
    
    if (config.message) {
      args.push('--message', config.message);
    }
    
    return args;
  }
}
```

### Example 2: Claude CLI Integration

```javascript
// ClaudeProvider.js
class ClaudeProvider extends IAIToolProvider {
  getDefaultPath() {
    return process.env.CLAUDE_CLI_PATH || 'claude';
  }

  getFrontmatterSchema() {
    return {
      required: ['include', 'task'],
      optional: ['exclude', 'model', 'max_tokens', 'thinking_mode']
    };
  }

  getDefaultFrontmatter() {
    return {
      include: ['**/*.py'],
      exclude: ['**/__pycache__/**'],
      task: 'code-review',
      model: 'claude-3-opus',
      max_tokens: 4000,
      thinking_mode: true
    };
  }

  getDefaultTemplate() {
    return `Task: {{task}}

File: {{filename}}
Location: {{filepath}}

Code to analyze:
\`\`\`
{{content}}
\`\`\`

Please provide detailed analysis.`;
  }

  buildArgs(config) {
    const args = [];
    
    if (config.model) {
      args.push('--model', config.model);
    }
    
    if (config.max_tokens) {
      args.push('--max-tokens', String(config.max_tokens));
    }
    
    if (config.thinking_mode) {
      args.push('--thinking');
    }
    
    return args;
  }
}
```

### Example 3: Generic OpenAI CLI

```javascript
// OpenAIProvider.js
class OpenAIProvider extends IAIToolProvider {
  getDefaultPath() {
    return 'openai';
  }

  getFrontmatterSchema() {
    return {
      required: ['include', 'system_prompt'],
      optional: ['exclude', 'model', 'temperature', 'max_tokens', 'top_p']
    };
  }

  getDefaultFrontmatter() {
    return {
      include: ['src/**/*'],
      exclude: ['node_modules/**', 'dist/**'],
      system_prompt: 'You are a code reviewer',
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 2000
    };
  }

  getDefaultTemplate() {
    return `{{system_prompt}}

Review this file:
{{filename}}

{{content}}`;
  }

  buildArgs(config) {
    const args = ['api', 'chat.completions.create'];
    
    args.push('-m', config.model || 'gpt-4');
    
    if (config.temperature !== undefined) {
      args.push('-t', String(config.temperature));
    }
    
    if (config.max_tokens) {
      args.push('--max-tokens', String(config.max_tokens));
    }
    
    if (config.top_p !== undefined) {
      args.push('--top-p', String(config.top_p));
    }
    
    return args;
  }
}
```

## Troubleshooting

### Runner Not Loading

1. Check runner directory structure:
   ```bash
   ls -la ~/.geese/runners/myTool/
   # Should contain: index.js, MyToolProvider.js, MyToolRunner.js
   ```

2. Verify index.js exports:
   ```javascript
   module.exports = {
     Runner: MyToolRunner,
     Provider: MyToolProvider
   };
   ```

3. Check for syntax errors:
   ```bash
   node -c ~/.geese/runners/myTool/MyToolProvider.js
   node -c ~/.geese/runners/myTool/MyToolRunner.js
   ```

### "Unknown tool" Error

The tool hasn't been loaded. Ensure:
- Runner directory is in `~/.geese/runners/` or `./.geese/runners/`
- Directory name matches the tool name
- `index.js` exports correctly

### Command Line Arguments Not Working

Debug the buildArgs method:

```javascript
buildArgs(config) {
  const args = [];
  
  // Log for debugging
  console.log('Building args from config:', config);
  
  // ... build args
  
  console.log('Generated args:', args);
  return args;
}
```

Run in dry-run mode to see generated commands:
```bash
geese run --dry-run
```

## Summary

Custom tool runners provide a powerful way to integrate any CLI AI tool with Geese's workflow:

1. **Create**: `geese runner new <name>`
2. **Customize**: Edit the Provider to match your tool's CLI
3. **Test**: Use `--dry-run` to verify
4. **Use**: Run with `geese run` or create tool-specific .geese files

The hierarchical loading system (built-in → global → local) ensures flexibility while maintaining consistency across projects.
