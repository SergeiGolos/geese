# Implement OpenAI Codex CLI Runner Provider and Runner

## Overview
Implement a custom runner provider and runner for OpenAI's Codex CLI tool to enable geese to process files using OpenAI Codex models.

## Background
The geese architecture supports multiple AI CLI tools through a provider/runner pattern. Currently, only Goose is implemented as a built-in runner. This issue tracks the implementation of a Codex CLI runner following the same architecture.

## Research Summary

### Codex CLI Configuration Properties

**Main Configuration File:**
- `~/.codex/config.toml` - Main config file used by Codex CLI

**Model Configuration:**
- `model` - Default model (e.g., `gpt-5-codex`, `gpt-4o-mini`)
- `model_provider` - Backend service (`openai`, `azure`)
- `model_reasoning_effort` - Thinking depth (low/medium/high)

**Azure OpenAI Configuration:**
```toml
model = "gpt-5-codex"
model_provider = "azure"
[model_providers.azure]
name = "Azure OpenAI"
base_url = "https://YOUR_RESOURCE_NAME.openai.azure.com/openai/v1"
env_key = "AZURE_OPENAI_API_KEY"
wire_api = "responses"
```

**Security and Approval:**
- `approval_policy` - When to ask for approval (on-request/never/untrusted)
- `sandbox_mode` - Restricts filesystem/network access (workspace-write/read-only)

**Shell Environment:**
- `[shell_environment_policy]` - Controls which environment variables are passed

**Profiles:**
- Named configuration bundles for easy swapping
- Example:
  ```toml
  [profiles.deep-review]
  model = "gpt-5-pro"
  approval_policy = "never"
  ```

### Environment Variables
- `OPENAI_API_KEY` - OpenAI API key
- `AZURE_OPENAI_API_KEY` - Azure OpenAI API key

### Key Commands and Flags
- `codex` - Interactive mode
- `codex --model <model>` - Specify model
- `codex --config <key>="<value>"` - Override config
- `codex --ask-for-approval <policy>` - Set approval policy
- `codex --sandbox <mode>` - Set sandbox mode
- `codex --profile <name>` - Use profile
- `codex --image <path>` - Multimodal input

## Implementation Tasks

### 1. Create CodexProvider.js
Location: `~/.geese/runners/codex/CodexProvider.js` or `src/providers/CodexProvider.js`

**Required Methods:**
- `getDefaultPath()` - Return `'codex'`
- `getFrontmatterSchema()` - Define required/optional properties
  - Required: `include`
  - Optional: `exclude`, `model`, `model_provider`, `reasoning_effort`, `approval_policy`, `sandbox_mode`, `profile`, `image`, `flags`
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
  
  // Add model provider config
  if (config.model_provider) {
    args.push('--config', `model_provider="${config.model_provider}"`);
  }
  
  // Add reasoning effort
  if (config.reasoning_effort) {
    args.push('--config', `model_reasoning_effort="${config.reasoning_effort}"`);
  }
  
  // Add approval policy
  if (config.approval_policy) {
    args.push('--ask-for-approval', config.approval_policy);
  }
  
  // Add sandbox mode
  if (config.sandbox_mode) {
    args.push('--sandbox', config.sandbox_mode);
  }
  
  // Add profile
  if (config.profile) {
    args.push('--profile', config.profile);
  }
  
  // Add image for multimodal input
  if (config.image) {
    args.push('--image', config.image);
  }
  
  // Add any additional flags
  if (config.flags && Array.isArray(config.flags)) {
    args.push(...config.flags);
  }
  
  return args;
}
```

### 2. Create CodexRunner.js
Location: `~/.geese/runners/codex/CodexRunner.js` or `src/runners/CodexRunner.js`

**Implementation:**
- Extend or wrap `ToolExecutor` class
- Use `CodexProvider` for command building
- Support all runner types: `real`, `console`, `memory`, `file`
- Delegate provider methods for convenience

**Key Methods:**
- `constructor()` - Initialize provider and executor
- `initializeExecutor(runnerType, options)` - Set up executor
- `execute(prompt, config, options)` - Execute Codex with prompt
- `setPath(path)` - Set custom executable path
- Delegate all provider methods

**Special Considerations:**
- Handle interactive vs non-interactive modes
- Support CI/CD pipeline mode
- Handle multimodal inputs (images)
- Support profile-based configuration

### 3. Create index.js
Location: `~/.geese/runners/codex/index.js`

```javascript
const CodexRunner = require('./CodexRunner');
const CodexProvider = require('./CodexProvider');

module.exports = {
  Runner: CodexRunner,
  Provider: CodexProvider
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
- Consider supporting `.codex/config.toml` format for Codex-specific settings

**File Processing:**
- Work with `.geese` file format (YAML frontmatter + Handlebars template)
- Support `_include` and `_exclude` patterns
- Process template variables: `{{filename}}`, `{{filepath}}`, `{{content}}`
- Support pipe operations for data transformation

**Security Considerations:**
- Default to safe sandbox mode
- Provide clear approval policy options
- Document security implications
- Support shell environment restrictions

## Testing Checklist

- [ ] Create codex runner using `geese runner new codex`
- [ ] Verify provider implements all required methods
- [ ] Test buildArgs with various configurations
- [ ] Create sample .geese file with `geese new test-codex --tool codex`
- [ ] Test with dry-run: `geese run --dry-run`
- [ ] Test with actual execution (if Codex CLI is installed)
- [ ] Verify configuration hierarchy works
- [ ] Test environment variable support (OPENAI_API_KEY)
- [ ] Test profile-based configuration
- [ ] Verify sandbox mode enforcement
- [ ] Test approval policy settings
- [ ] Verify error handling for missing API key
- [ ] Test with custom flags
- [ ] Test multimodal input support (images)

## Example .geese File

```yaml
---
_include:
  - "src/**/*.js"
  - "src/**/*.ts"
_exclude:
  - "node_modules/**"
  - "*.test.js"
  - "dist/**"
model: "gpt-5-codex"
model_provider: "openai"
reasoning_effort: "medium"
approval_policy: "on-request"
sandbox_mode: "workspace-write"
profile: "code-review"
---

Please review and analyze the following code file.

File: {{filename}}
Path: {{filepath}}

Content:
{{content}}

Please provide:
1. Code quality assessment
2. Security vulnerabilities
3. Performance optimizations
4. Best practices compliance
5. Specific recommendations for improvement
```

## Example with Multimodal Input

```yaml
---
_include:
  - "designs/**/*.png"
  - "mockups/**/*.jpg"
model: "gpt-5-codex"
image: "{{filepath}}"
---

Please analyze this design file and provide implementation guidance.

Image: {{filename}}
Path: {{filepath}}

Please provide:
1. Component structure recommendations
2. CSS/styling approach
3. Accessibility considerations
4. Responsive design notes
5. Implementation code snippets
```

## Documentation

After implementation, update:
- `README.md` - Add Codex to supported tools list
- `docs/CUSTOM_TOOL_RUNNERS.md` - Add Codex as example
- Create example configurations in `examples/configs/`
- Document security best practices
- Add multimodal usage examples

## References

- [OpenAI Codex CLI Documentation](https://developers.openai.com/codex/local-config)
- [Codex CLI GitHub](https://github.com/openai/codex)
- [Azure Codex Integration](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/codex)
- [Geese IAIToolProvider Interface](src/interfaces/IAIToolProvider.js)
- [Geese IAIToolRunner Interface](src/interfaces/IAIToolRunner.js)
- [Goose Provider Implementation](src/providers/GooseProvider.js)

## Notes

- Codex CLI supports both OpenAI and Azure OpenAI backends
- Profile-based configuration enables easy switching between different use cases
- Sandbox mode is crucial for security in production environments
- Multimodal support allows processing images alongside code
- Consider creating multiple profile examples for common use cases
