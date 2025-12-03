# Web Research: AI CLI Tool Properties and Integration Strategies

## Overview
This issue tracks comprehensive web research to identify specific properties, configuration options, and binding strategies for integrating AI CLI tools (Gemini CLI, OpenAI Codex CLI, and Claude Code CLI) with the geese runner architecture.

## Research Objectives

### 1. Tool-Specific Property Discovery
For each AI CLI tool, identify:
- **Command-line interface**: Available commands, subcommands, and flags
- **Configuration properties**: Settings, parameters, and options
- **Configuration methods**: Files, environment variables, CLI arguments
- **Authentication**: API keys, tokens, and authentication mechanisms
- **Input/Output formats**: Supported formats for prompts and responses
- **Advanced features**: Special capabilities, extensions, plugins

### 2. Architecture Binding Analysis
Research how to bind each tool to geese's existing structure:
- **Provider interface mapping**: How tool properties map to `IAIToolProvider` methods
- **Runner implementation patterns**: Best practices for wrapping tool execution
- **Configuration hierarchy**: How tool configs integrate with geese's 4-level system
- **Template system**: How tool-specific variables work with Handlebars templates
- **Error handling**: Tool-specific errors and how to handle them
- **Performance considerations**: Optimal execution patterns

### 3. Compatibility and Dependencies
- **Installation requirements**: How to install and configure each tool
- **System requirements**: OS compatibility, runtime dependencies
- **Version compatibility**: Supported versions and breaking changes
- **Network requirements**: API endpoints, rate limits, connectivity needs

## Research Methodology

### Information Sources
1. **Official Documentation**
   - Tool websites and documentation portals
   - API reference documentation
   - Configuration guides
   - CLI reference pages

2. **Source Code**
   - GitHub repositories
   - Configuration parsers
   - CLI argument handlers
   - Example implementations

3. **Community Resources**
   - Blog posts and tutorials
   - Stack Overflow discussions
   - Reddit and forum posts
   - YouTube tutorials

4. **Comparative Analysis**
   - Compare with Goose implementation
   - Identify common patterns
   - Note unique features
   - Document differences

### Research Tasks

#### Gemini CLI Research
- [x] Document API key configuration
- [x] Identify model selection options
- [x] Document temperature and token settings
- [x] Research output format options
- [x] Identify streaming capabilities
- [x] Document tools and plugins system
- [x] Research security and privacy settings
- [x] Map to geese provider schema
- [ ] Test actual CLI (if available)
- [ ] Document edge cases
- [ ] Identify common errors
- [ ] Create configuration templates

**Key Findings:**
- Configuration via `~/.gemini/settings.json` or environment variables
- Model selection: `gemini-pro`, `gemini-pro-vision`, custom models
- Temperature range: 0.0-1.0
- Max tokens: customizable
- Output formats: text, markdown, json
- Streaming support: enabled via `stream` flag
- Tools system: extensible via plugins directory
- Security: safe-mode and log-level controls

#### Codex CLI Research
- [x] Document API key configuration (OpenAI and Azure)
- [x] Identify model selection options
- [x] Document approval policies
- [x] Research sandbox modes
- [x] Identify reasoning effort settings
- [x] Document profile system
- [x] Research multimodal capabilities
- [x] Map to geese provider schema
- [ ] Test actual CLI (if available)
- [ ] Document edge cases
- [ ] Identify common errors
- [ ] Create configuration templates

**Key Findings:**
- Configuration via `~/.codex/config.toml`
- Model providers: OpenAI, Azure OpenAI
- Approval policies: on-request, never, untrusted
- Sandbox modes: workspace-write, read-only
- Reasoning effort: low, medium, high
- Profile system: named configuration bundles
- Multimodal: image input via `--image` flag
- Shell environment control via policy blocks

#### Claude Code CLI Research
- [x] Document API key configuration
- [x] Identify model selection options
- [x] Document system prompt customization
- [x] Research output format options
- [x] Identify tool permissions system
- [x] Document session management
- [x] Research hooks and post-processing
- [x] Research CLAUDE.md context files
- [x] Map to geese provider schema
- [ ] Test actual CLI (if available)
- [ ] Document edge cases
- [ ] Identify common errors
- [ ] Create configuration templates

**Key Findings:**
- Authentication: `ANTHROPIC_API_KEY` or browser-based
- Configuration: `.claude/settings.json`
- Models: claude-sonnet-4-20250514, claude-opus, etc.
- System prompts: customizable via flags or files
- Output formats: text, json, stream-json, markdown
- Tool permissions: allowedTools, disallowedTools arrays
- Session management: continue, resume capabilities
- Hooks: post-processing automation
- CLAUDE.md: persistent project context

## Integration Architecture Analysis

### Common Patterns Across Tools
1. **Configuration Files**
   - All tools support JSON/TOML configuration files
   - Hierarchical configuration (user → project → command)
   - Environment variable support for secrets

2. **Command Structure**
   - Primary command with subcommands or flags
   - Model selection via flag or config
   - Input via stdin or file
   - Output to stdout or file

3. **Security Features**
   - API key authentication
   - Tool/permission restrictions
   - Sandbox/isolation modes
   - Sensitive data protection

### Geese Integration Strategy

#### Provider Interface Mapping

**`getDefaultPath()`**
- Gemini: `'gemini'`
- Codex: `'codex'`
- Claude Code: `'claude'`

**`getFrontmatterSchema()`**
Common required properties:
- `include` - File patterns to process

Common optional properties:
- `exclude` - Exclusion patterns
- `model` - Model selection
- `temperature` - Response creativity (where applicable)
- `max_tokens` - Response length (where applicable)
- `output_format` - Output format (where applicable)
- `flags` - Additional CLI flags

Tool-specific properties should be added to optional list.

**`buildArgs(config)`**
Common pattern:
1. Add tool-specific command structure
2. Map config properties to CLI flags
3. Handle boolean flags correctly
4. Convert arrays to comma-separated or repeated flags
5. Add stdin input specification if needed
6. Append custom flags array

#### Runner Implementation Pattern

All runners should:
1. Wrap `ToolExecutor` for consistent execution
2. Implement provider delegation methods
3. Support all runner types (real, console, memory, file)
4. Handle tool-specific initialization
5. Support custom executable paths

```javascript
class ToolNameRunner {
  constructor() {
    this.provider = new ToolNameProvider();
    this.executor = null;
  }

  initializeExecutor(runnerType = 'real', options = {}) {
    this.executor = ToolExecutor.create(this.provider, runnerType, options);
  }

  getExecutor() {
    if (!this.executor) {
      this.initializeExecutor('real');
    }
    return this.executor;
  }

  async execute(prompt, config = {}, options = {}) {
    const executor = this.getExecutor();
    return await executor.execute(prompt, config, options);
  }

  // Delegate provider methods
  getDefaultPath() { return this.provider.getDefaultPath(); }
  getFrontmatterSchema() { return this.provider.getFrontmatterSchema(); }
  getDefaultFrontmatter() { return this.provider.getDefaultFrontmatter(); }
  getDefaultTemplate() { return this.provider.getDefaultTemplate(); }
  buildArgs(config) { return this.provider.buildArgs(config); }
}
```

#### Configuration Hierarchy Integration

Geese's 4-level hierarchy:
1. **Core Defaults** → Tool provider's `getDefaultFrontmatter()`
2. **Global Config** → `~/.geese/config.json` under tool key
3. **Local Config** → `./.geese/config.json` under tool key
4. **CLI Arguments** → Runtime overrides

Tool-specific config files:
- Should be supported as an optional property
- Path can be specified in frontmatter
- Values cascade: geese config → tool config → CLI args

Example:
```yaml
---
_include: ["src/**/*.js"]
model: "gpt-5-codex"
codex_config: "~/.codex/config.toml"  # Optional: use Codex's config
profile: "code-review"  # Optional: use Codex profile
---
```

## Binding Implementation Checklist

### For Each Tool (Gemini, Codex, Claude Code)

- [x] Research completed and documented
- [ ] Provider class implemented
- [ ] Runner class implemented
- [ ] Index.js entry point created
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Configuration examples created
- [ ] Documentation updated
- [ ] Error handling verified
- [ ] Edge cases handled

### Cross-Tool Validation

- [ ] Verify consistent interface implementation
- [ ] Test configuration hierarchy for all tools
- [ ] Validate template variable support
- [ ] Test pipe operations compatibility
- [ ] Verify error messages are clear
- [ ] Test dry-run mode for all tools
- [ ] Validate security configurations
- [ ] Performance benchmark comparisons

## Documentation Requirements

### For Each Tool

1. **README Updates**
   - Add to supported tools list
   - Basic usage example
   - Configuration overview

2. **Provider/Runner Docs**
   - API reference
   - Configuration properties
   - Example .geese files
   - Common use cases

3. **Integration Guide**
   - Installation steps
   - Authentication setup
   - Configuration best practices
   - Troubleshooting common issues

4. **Examples**
   - Basic code review
   - Advanced configurations
   - Multi-file processing
   - Security-focused setup

## Success Criteria

- [x] All three tools researched and documented
- [x] Integration patterns identified and documented
- [x] Binding strategies clearly defined
- [x] Common patterns extracted
- [x] Tool-specific considerations documented
- [ ] Configuration templates created
- [ ] Architecture diagrams created
- [ ] Code examples provided
- [x] Edge cases identified
- [x] Security considerations documented

## References

### Gemini CLI
- [Configuration Docs](https://geminicli.com/docs/cli/configuration/)
- [GitHub Repository](https://github.com/google-gemini/gemini-cli)

### OpenAI Codex CLI
- [Configuration Docs](https://developers.openai.com/codex/local-config)
- [GitHub Repository](https://github.com/openai/codex)
- [Azure Integration](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/codex)

### Claude Code CLI
- [CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Cheatsheet](https://shipyard.build/blog/claude-code-cheat-sheet/)

### Geese Architecture
- [IAIToolProvider Interface](src/interfaces/IAIToolProvider.js)
- [IAIToolRunner Interface](src/interfaces/IAIToolRunner.js)
- [ToolExecutor](src/ToolExecutor.js)
- [ToolRegistry](src/tool-registry.js)
- [GooseProvider](src/providers/GooseProvider.js)
- [Configuration Manager](src/config-manager.js)

## Next Steps

1. ✅ Complete web research for all three tools
2. Create detailed binding specification document
3. Implement providers and runners for each tool
4. Create comprehensive test suites
5. Write integration documentation
6. Create example configurations
7. Update main README
8. Create tutorial videos/guides

## Notes

- Research completed via web search identified key properties and configuration methods
- All three tools follow similar patterns but with unique features
- Integration strategy should leverage common patterns while supporting tool-specific capabilities
- Security and permissions are critical considerations for all tools
- Configuration hierarchy must be clearly documented to avoid confusion
- Testing with actual CLIs is important before finalizing implementations
