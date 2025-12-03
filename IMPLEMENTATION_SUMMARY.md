# Implementation Summary: GitHub Issue Templates for AI CLI Tool Runners

## What Was Done

I have created comprehensive GitHub issue templates for implementing three new AI CLI tool runners in the geese project:

1. **Gemini CLI Runner** - Google's Gemini AI tool integration
2. **Codex CLI Runner** - OpenAI's Codex tool integration  
3. **Claude Code CLI Runner** - Anthropic's Claude Code tool integration
4. **Web Research Documentation** - Comprehensive research findings and integration strategies

All issue templates are located in: **`docs/issues/`**

## Files Created

### 1. `docs/issues/README.md` (9.5 KB)
A comprehensive guide that includes:
- Overview of all issue templates
- Detailed descriptions of each tool
- Instructions for creating GitHub issues (manual and CLI methods)
- Implementation order recommendations
- Architecture overview with diagrams
- Key interfaces and patterns
- Configuration hierarchy explanation
- Security considerations
- Testing requirements
- Documentation requirements

### 2. `docs/issues/issue-gemini-cli-runner.md` (6.9 KB)
**Issue Title:** Implement Gemini CLI Runner Provider and Runner

Complete implementation guide including:
- **Research Summary**: Gemini CLI configuration properties, methods, and commands
- **Implementation Tasks**: 
  - GeminiProvider.js with example buildArgs implementation
  - GeminiRunner.js with key methods
  - index.js entry point
  - Integration points with existing architecture
- **Testing Checklist**: 10+ test scenarios
- **Example .geese File**: Ready-to-use template
- **Documentation Requirements**
- **References**: Links to official Gemini CLI docs and geese interfaces

**Key Findings:**
- Configuration via `~/.gemini/settings.json` or environment variables
- Model: gemini-pro, gemini-pro-vision
- Temperature: 0.0-1.0, Max tokens: customizable
- Output formats: text, markdown, json
- Streaming support, tools/plugins system
- Safe mode and log level controls

### 3. `docs/issues/issue-codex-cli-runner.md` (8.6 KB)
**Issue Title:** Implement OpenAI Codex CLI Runner Provider and Runner

Complete implementation guide including:
- **Research Summary**: Codex CLI configuration properties, providers, security features
- **Implementation Tasks**:
  - CodexProvider.js with example buildArgs implementation
  - CodexRunner.js with special considerations
  - Support for OpenAI and Azure backends
  - Profile-based configuration
  - Multimodal input handling
- **Testing Checklist**: 14+ test scenarios including security tests
- **Example .geese Files**: Basic and multimodal examples
- **Documentation Requirements**
- **References**: Links to official Codex docs, Azure integration

**Key Findings:**
- Configuration via `~/.codex/config.toml`
- Models: gpt-5-codex, gpt-4o-mini
- Providers: OpenAI, Azure OpenAI
- Approval policies: on-request, never, untrusted
- Sandbox modes: workspace-write, read-only
- Reasoning effort: low, medium, high
- Profile system for configuration bundles
- Multimodal image support via `--image` flag

### 4. `docs/issues/issue-claude-code-cli-runner.md` (12.9 KB)
**Issue Title:** Implement Claude Code CLI Runner Provider and Runner

Complete implementation guide including:
- **Research Summary**: Claude Code CLI commands, flags, settings structure, context management
- **Implementation Tasks**:
  - ClaudeCodeProvider.js with comprehensive buildArgs
  - ClaudeCodeRunner.js with special considerations
  - Settings.json generation/loading
  - CLAUDE.md context file support
  - Permission and security system
  - Hooks for post-processing
- **Testing Checklist**: 17+ test scenarios
- **Example .geese Files**: Basic, with settings file, and with context file
- **Documentation Requirements**
- **References**: Links to official Claude Code docs, best practices

**Key Findings:**
- Authentication: ANTHROPIC_API_KEY or browser-based
- Configuration: `.claude/settings.json`
- Models: claude-sonnet-4-20250514, claude-opus
- Print mode (`-p`) for non-interactive execution
- System prompts: customizable via flags or files
- Output formats: text, json, stream-json, markdown
- Tool permissions: allowedTools, disallowedTools arrays
- Session management: continue, resume capabilities
- Hooks: post-processing automation
- CLAUDE.md: persistent project context

### 5. `docs/issues/issue-web-research-runner-integration.md` (11.9 KB)
**Issue Title:** Web Research: AI CLI Tool Properties and Integration Strategies

Comprehensive research documentation including:
- **Research Objectives**: Tool-specific properties, architecture binding, compatibility
- **Research Methodology**: Sources, approach, tasks
- **Detailed Findings**: Complete research summary for all three tools with checkboxes
- **Integration Architecture Analysis**:
  - Common patterns across tools
  - Provider interface mapping
  - Runner implementation pattern with code example
  - Configuration hierarchy integration
- **Binding Implementation Checklist**: Per-tool and cross-tool validation
- **Documentation Requirements**
- **Success Criteria**: With progress tracking
- **References**: Complete list of sources with URLs
- **Next Steps**: Clear action items

**Research Status:**
- ✅ Web search completed for all three tools (Dec 3, 2025)
- ✅ Key properties and configuration methods documented
- ✅ Integration patterns identified
- ✅ Common patterns extracted
- ✅ Tool-specific considerations documented
- ✅ Security considerations documented

## Web Research Conducted

I performed comprehensive web searches to gather information about each CLI tool:

### Gemini CLI Research Sources:
- [Official Configuration Docs](https://geminicli.com/docs/cli/configuration/)
- [GitHub Repository](https://github.com/google-gemini/gemini-cli)
- Configuration Guide documentation
- Commands Reference documentation

### Codex CLI Research Sources:
- [Official OpenAI Codex Documentation](https://developers.openai.com/codex/local-config)
- [GitHub Repository](https://github.com/openai/codex)
- [Azure Integration Guide](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/codex)
- Multiple technical blog posts and guides

### Claude Code CLI Research Sources:
- [Official CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Best Practices Guide](https://www.anthropic.com/engineering/claude-code-best-practices)
- [CLI Cheatsheet](https://shipyard.build/blog/claude-code-cheat-sheet/)
- Developer reference guides

All research findings are documented with proper citations in the web research issue.

## Architecture Integration

All three runners follow the same integration pattern:

```
┌─────────────────────────────────────────────┐
│          Geese CLI Application               │
└─────────────────┬───────────────────────────┘
                  │
         ┌────────▼────────┐
         │  ToolRegistry   │
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
         └─────────────────┘
```

## How to Create GitHub Issues

Since I cannot directly create GitHub issues (this is a restricted operation), you have three options:

### Option 1: Manual Creation (Recommended)
1. Go to https://github.com/SergeiGolos/geese/issues
2. Click "New Issue" 
3. Copy content from one of the markdown files in `docs/issues/`
4. Paste into issue body
5. Use the first line as the title
6. Add labels: `enhancement`, `ai-integration`, `runner`
7. Create the issue
8. Repeat for all four issues

### Option 2: GitHub CLI
If you have GitHub CLI installed:
```bash
cd /home/runner/work/geese/geese

gh issue create \
  --title "Implement Gemini CLI Runner Provider and Runner" \
  --body-file docs/issues/issue-gemini-cli-runner.md \
  --label enhancement,ai-integration,runner

gh issue create \
  --title "Implement OpenAI Codex CLI Runner Provider and Runner" \
  --body-file docs/issues/issue-codex-cli-runner.md \
  --label enhancement,ai-integration,runner

gh issue create \
  --title "Implement Claude Code CLI Runner Provider and Runner" \
  --body-file docs/issues/issue-claude-code-cli-runner.md \
  --label enhancement,ai-integration,runner

gh issue create \
  --title "Web Research: AI CLI Tool Properties and Integration Strategies" \
  --body-file docs/issues/issue-web-research-runner-integration.md \
  --label research,documentation,ai-integration
```

### Option 3: Keep as Documentation
Alternatively, these files can serve as implementation documentation in your repository without creating separate issues.

## Recommended Implementation Order

1. **Review Web Research Issue** - Validate findings and approach
2. **Implement Gemini CLI** - Simplest configuration, good starting point
3. **Implement Codex CLI** - More complex with profiles and multimodal
4. **Implement Claude Code CLI** - Most complex with permissions, hooks, contexts

## Key Integration Points

All runners integrate with geese through:

1. **IAIToolProvider Interface** (`src/interfaces/IAIToolProvider.js`)
   - `getDefaultPath()` - Executable name
   - `getFrontmatterSchema()` - Required/optional properties
   - `getDefaultFrontmatter()` - Default configuration
   - `getDefaultTemplate()` - Default prompt template
   - `buildArgs(config)` - Convert config to CLI arguments

2. **IAIToolRunner Interface** (`src/interfaces/IAIToolRunner.js`)
   - `execute()` - Run the tool
   - `checkAvailable()` - Verify tool is installed

3. **ToolExecutor** (`src/ToolExecutor.js`)
   - Provides consistent execution wrapper
   - Supports multiple runner types (real, console, memory, file)

4. **ToolRegistry** (`src/tool-registry.js`)
   - Manages all registered runners
   - Supports hierarchical loading (builtin → global → local)

## Configuration Hierarchy

All tools support geese's 4-level configuration:
1. **Core Defaults** - From provider's `getDefaultFrontmatter()`
2. **Global Config** - `~/.geese/config.json`
3. **Local Config** - `./.geese/config.json`
4. **CLI Arguments** - Runtime overrides (highest precedence)

## Security Considerations

Each tool has specific security features that must be implemented:
- **Gemini**: Safe mode, log level control
- **Codex**: Sandbox modes, approval policies, shell environment restrictions
- **Claude Code**: Tool permissions, file deny patterns, hooks for validation

## Testing Requirements

Each implementation must include:
- Unit tests for provider methods
- Unit tests for runner methods
- Integration tests (if CLI tool is available)
- Dry-run tests
- Configuration hierarchy tests
- Error handling tests
- Security feature tests

## Documentation Requirements

Each implementation must update:
- `README.md` - Add tool to supported list
- `docs/CUSTOM_TOOL_RUNNERS.md` - Add as example
- `examples/configs/` - Add example configurations
- Create tool-specific documentation

## Next Steps

1. ✅ **COMPLETED**: Create issue templates with comprehensive implementation details
2. **TODO**: Create GitHub issues from templates (manual step by user)
3. **TODO**: Review and validate research findings
4. **TODO**: Implement Gemini CLI runner
5. **TODO**: Implement Codex CLI runner
6. **TODO**: Implement Claude Code CLI runner
7. **TODO**: Test all implementations
8. **TODO**: Update documentation
9. **TODO**: Create example configurations

## Files in This PR

- `docs/issues/README.md` - Main guide for using issue templates
- `docs/issues/issue-gemini-cli-runner.md` - Gemini CLI implementation issue
- `docs/issues/issue-codex-cli-runner.md` - Codex CLI implementation issue
- `docs/issues/issue-claude-code-cli-runner.md` - Claude Code CLI implementation issue
- `docs/issues/issue-web-research-runner-integration.md` - Research documentation
- `IMPLEMENTATION_SUMMARY.md` - This summary document

All files have been committed and pushed to the `copilot/create-runner-provider-issues` branch.

## References

- [Geese Repository](https://github.com/SergeiGolos/geese)
- [Geese Runner Architecture](docs/CUSTOM_TOOL_RUNNERS.md)
- [Goose Provider Implementation](src/providers/GooseProvider.js) - Reference implementation
