# GitHub Issues for New AI CLI Tool Runners

This directory contains detailed issue templates for implementing three new AI CLI tool runners in the geese project: Gemini CLI, OpenAI Codex CLI, and Claude Code CLI.

## Overview

The geese project uses a provider/runner architecture to support multiple AI CLI tools. Currently, only Goose is implemented as a built-in runner. These issues outline the implementation requirements for adding three additional tools.

## Issue Files

### 1. [issue-gemini-cli-runner.md](issue-gemini-cli-runner.md)
**Title:** Implement Gemini CLI Runner Provider and Runner

Implementation guide for Google's Gemini CLI tool integration, including:
- Configuration properties (API key, model, temperature, tokens, output format, streaming, tools, security)
- Command structure and flags
- Provider and runner class implementation
- Integration with geese's architecture
- Example .geese files
- Testing checklist

**Key Properties:**
- Model: `gemini-pro`, custom models
- Configuration: `~/.gemini/settings.json` or environment variables
- Output formats: text, markdown, json
- Streaming support
- Tools and plugins extensibility

### 2. [issue-codex-cli-runner.md](issue-codex-cli-runner.md)
**Title:** Implement OpenAI Codex CLI Runner Provider and Runner

Implementation guide for OpenAI's Codex CLI tool integration, including:
- Configuration properties (model, provider, approval policies, sandbox modes, reasoning effort, profiles)
- Support for both OpenAI and Azure backends
- Command structure and flags
- Provider and runner class implementation
- Security considerations
- Multimodal input support
- Example .geese files
- Testing checklist

**Key Properties:**
- Models: `gpt-5-codex`, `gpt-4o-mini`
- Providers: OpenAI, Azure OpenAI
- Configuration: `~/.codex/config.toml`
- Profile system for configuration bundles
- Sandbox modes for security
- Multimodal image support

### 3. [issue-claude-code-cli-runner.md](issue-claude-code-cli-runner.md)
**Title:** Implement Claude Code CLI Runner Provider and Runner

Implementation guide for Anthropic's Claude Code CLI tool integration, including:
- Configuration properties (model, tokens, system prompts, output format, tool permissions, session management)
- Settings file structure
- Command structure and flags
- Provider and runner class implementation
- Permission and security system
- Hooks for post-processing
- CLAUDE.md context files
- Example .geese files
- Testing checklist

**Key Properties:**
- Models: `claude-sonnet-4-20250514`, `claude-opus`
- Configuration: `.claude/settings.json`
- Print mode for non-interactive execution
- Tool permissions (allowed/disallowed tools)
- Session continuation and resumption
- Hooks for post-processing
- CLAUDE.md for persistent context

### 4. [issue-web-research-runner-integration.md](issue-web-research-runner-integration.md)
**Title:** Web Research: AI CLI Tool Properties and Integration Strategies

Comprehensive research document covering:
- Research objectives and methodology
- Detailed findings for all three tools
- Common patterns across tools
- Integration architecture analysis
- Provider interface mapping
- Runner implementation patterns
- Configuration hierarchy integration
- Binding implementation checklist
- Documentation requirements
- Success criteria

**Status:** Research phase completed with key findings documented

## How to Use These Issue Templates

### Option 1: Copy to GitHub Issues (Manual)
1. Navigate to your GitHub repository: https://github.com/SergeiGolos/geese/issues
2. Click "New Issue"
3. Copy the content from one of the markdown files
4. Paste into the issue body
5. Use the first line as the issue title
6. Add appropriate labels (e.g., `enhancement`, `ai-integration`, `runner`)
7. Create the issue
8. Repeat for all four issues

### Option 2: Create Issues via GitHub CLI (if available)
```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Create Gemini CLI issue
gh issue create \
  --title "Implement Gemini CLI Runner Provider and Runner" \
  --body-file /tmp/geese-issues/issue-gemini-cli-runner.md \
  --label enhancement,ai-integration,runner

# Create Codex CLI issue
gh issue create \
  --title "Implement OpenAI Codex CLI Runner Provider and Runner" \
  --body-file /tmp/geese-issues/issue-codex-cli-runner.md \
  --label enhancement,ai-integration,runner

# Create Claude Code CLI issue
gh issue create \
  --title "Implement Claude Code CLI Runner Provider and Runner" \
  --body-file /tmp/geese-issues/issue-claude-code-cli-runner.md \
  --label enhancement,ai-integration,runner

# Create Web Research issue
gh issue create \
  --title "Web Research: AI CLI Tool Properties and Integration Strategies" \
  --body-file /tmp/geese-issues/issue-web-research-runner-integration.md \
  --label research,documentation,ai-integration
```

### Option 3: Store as Documentation in Repository
If you prefer to keep these as documentation rather than issues, you can:
1. Create a `docs/issues/` or `docs/roadmap/` directory in your repository
2. Copy these files there
3. Commit and push to your repository
4. Reference them in your project planning documents

## Implementation Order

Recommended implementation order:

1. **Start with Web Research Issue** - Review and validate all research findings
2. **Implement Gemini CLI** - Simpler configuration, good starting point
3. **Implement Codex CLI** - More complex with profile system and multimodal support
4. **Implement Claude Code CLI** - Most complex with permissions, hooks, and context files

## Common Implementation Steps

For each runner:

1. **Create Runner Structure**
   ```bash
   geese runner new <tool-name> -d "Description"
   ```

2. **Implement Provider** (`<Tool>Provider.js`)
   - Extend `IAIToolProvider`
   - Implement all required methods
   - Map configuration properties to CLI arguments

3. **Implement Runner** (`<Tool>Runner.js`)
   - Wrap `ToolExecutor`
   - Delegate provider methods
   - Handle tool-specific initialization

4. **Create Entry Point** (`index.js`)
   - Export both Provider and Runner

5. **Test**
   - Unit tests for provider and runner
   - Integration tests with actual CLI (if available)
   - Dry-run tests
   - Configuration hierarchy tests

6. **Document**
   - Update README.md
   - Add examples
   - Create configuration templates

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│          Geese CLI Application               │
└─────────────────┬───────────────────────────┘
                  │
         ┌────────▼────────┐
         │  ToolRegistry   │
         │  (manages all   │
         │   runners)      │
         └────────┬────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼────┐   ┌───▼────┐   ┌───▼────┐
│ Goose  │   │ Gemini │   │ Codex  │
│ Runner │   │ Runner │   │ Runner │
└───┬────┘   └───┬────┘   └───┬────┘
    │             │             │
┌───▼────┐   ┌───▼────┐   ┌───▼────┐
│ Goose  │   │ Gemini │   │ Codex  │
│Provider│   │Provider│   │Provider│
└───┬────┘   └───┬────┘   └───┬────┘
    │             │             │
    └─────────────┼─────────────┘
                  │
         ┌────────▼────────┐
         │  ToolExecutor   │
         │  (executes CLI  │
         │   commands)     │
         └─────────────────┘
```

## Key Interfaces

All providers must implement `IAIToolProvider`:
- `getDefaultPath()` - Executable name/path
- `getFrontmatterSchema()` - Required/optional properties
- `getDefaultFrontmatter()` - Default configuration
- `getDefaultTemplate()` - Default prompt template
- `buildArgs(config)` - Convert config to CLI arguments

All runners should wrap `ToolExecutor` and provide:
- `execute(prompt, config, options)` - Execute tool
- `initializeExecutor(type, options)` - Set up executor
- Provider method delegation

## Configuration Hierarchy

All runners support geese's 4-level configuration:
1. **Core Defaults** - Provider's `getDefaultFrontmatter()`
2. **Global Config** - `~/.geese/config.json`
3. **Local Config** - `./.geese/config.json`
4. **CLI Arguments** - Runtime overrides

## Security Considerations

Each tool has specific security features:
- **Gemini**: Safe mode, log level control
- **Codex**: Sandbox modes, approval policies, shell environment restrictions
- **Claude Code**: Tool permissions, file deny patterns, hooks

Always document and test security features thoroughly.

## Testing

Each implementation should include:
- Unit tests for provider methods
- Unit tests for runner methods
- Integration tests (if CLI is available)
- Dry-run tests
- Configuration hierarchy tests
- Error handling tests
- Security feature tests

## Documentation

Each implementation needs:
- README updates
- Example .geese files
- Configuration guides
- Troubleshooting guides
- API reference documentation

## Questions or Issues?

If you have questions about these implementation plans, please:
1. Comment on the specific GitHub issue
2. Review the linked reference documentation
3. Compare with the existing Goose implementation
4. Ask in project discussions

## Research Sources

All research was conducted via web search on 2025-12-03 and includes:
- Official documentation from each tool vendor
- Community resources and tutorials
- Configuration guides and CLI references
- Best practices and security guidelines

See the web research issue for detailed findings and citations.
