# 🦢 Geese - AI-Powered File Processing Tool

**Batch prompt engineering made simple.** Use Handlebars templates, glob patterns, and JavaScript pipes to process multiple files with AI tools automatically.

## Why Geese?

Transform how you work with AI assistants by processing entire codebases at once:

- **Handlebars Templates**: Create dynamic, reusable prompts with template variables
- **Glob Include/Exclude**: Target exactly the files you want with powerful pattern matching
- **JavaScript Pipes**: Transform data on-the-fly with chainable operations (like Unix pipes, but for prompts)
- **Batch Processing**: Apply the same prompt to dozens of files with one command

Instead of manually pasting code into AI tools file-by-file, define your pattern once and let Geese handle the rest.

## 🚀 Getting Started

### Installation

```bash
npm install -g geese
```

### Quick Example

1. **Create a `.geese` file** to define your prompt template:
   ```bash
   geese new code-review
   ```

2. **Edit the file** (`.geese/code-review.geese`):
   ```yaml
   ---
   _include:
     - "src/**/*.js"
   _exclude:
     - "*.test.js"
   _recipe: "code-review"
   review_focus: "security and performance"
   ---
   
   Review this file for {{review_focus}}.
   
   File: {{filename}}
   {{content}}
   ```

3. **Run it**:
   ```bash
   geese
   ```

That's it! Geese will:
- Find all matching files (`src/**/*.js`, excluding tests)
- Generate a custom prompt for each file
- Process them with your AI tool
- Create a detailed markdown report

### What You Get

```yaml
project_name: "My App" ~> toUpperCase
files: "*.json" ~> readFile ~> parseJson ~> jqSelect users ~> jqMap name
errors: "app.log" ~> readFile ~> grep "^ERROR" ~> grepCount
```

This gives you:
- `project_name` → `"MY APP"`
- `files` → Array of user names from JSON
- `errors` → Count of error lines in log file

**Pipes** are JavaScript operations that transform data. Chain them with `~>` like Unix pipes.

## 📋 Core Features

### Hierarchical Configuration

Set defaults once, override when needed:
- **Core** → **Global** (`~/.geese/config.json`) → **Local** (`./.geese/config.json`) → **CLI**

```bash
# Set global defaults
geese config --set goose.model gpt-4

# Override per-project in .geese/config.json
# Override per-file in .geese frontmatter
# Override per-run with CLI flags
```

**→ [Configuration Guide](docs/CONFIGURATION.md)** - Full details on multi-level configuration

### JavaScript Pipes

Transform data with chainable operations using the `~>` operator:

```yaml
# String operations
text: "hello world" ~> toUpperCase ~> trim

# File operations  
data: "./config.json" ~> readFile ~> parseJson ~> jqSelect version

# Log analysis
errors: "./app.log" ~> readFile ~> grep "^ERROR" ~> grepCount

# Array operations
items: "a,b,c" ~> split , ~> join " | "
```

**Built-in pipes**: `trim`, `toUpperCase`, `readFile`, `parseJson`, `grep`, `jqSelect`, `split`, `join`, and [40+ more operations](docs/PIPES.md)

**Custom pipes**: Create your own operations

```bash
geese pipe new formatName -d "Format names in title case"
# Edit ~/.geese/pipes/formatName.js
```

**→ [Pipes Reference](docs/PIPES.md)** - Complete list of built-in operations  
**→ [Custom Pipes Guide](docs/CUSTOM_PIPES.md)** - Build your own transformations

### .geese File Format

YAML frontmatter + Handlebars template:

```yaml
---
# System properties (_prefix) control Geese
_include:
  - "src/**/*.js"
_exclude:
  - "*.test.js"
_recipe: "code-review"
_model: "gpt-4"

# User properties become template variables
project_name: "My App"
review_focus: "security"
---

Review {{filename}} from {{project_name}}.
Focus: {{review_focus}}

{{content}}
```

**System Properties** (`_` prefix):
- `_include` (required): Glob patterns for files
- `_recipe` (required): AI tool recipe/mode
- `_exclude`: Files to skip
- `_model`, `_temperature`, `_max_tokens`: AI settings
- `_config`, `_profile`, `_resume`: Advanced options

**Template Variables**:
- `{{filename}}`, `{{filepath}}`, `{{content}}`: Auto-provided
- Any custom frontmatter property (after pipes run)

**→ [File Format Reference](docs/FILE_FORMAT.md)** - Complete syntax guide

## 🛠️ Usage

### Basic Commands

```bash
# Run (interactive file selection)
geese

# Create new .geese file
geese new code-review

# Use creation wizard
geese new my-task --wizard

# Process specific file
geese -f my-review.geese

# Preview without running
geese --dry-run

# Set defaults
geese config --set goose.model gpt-4
```

**→ [CLI Reference](docs/CLI.md)** - All commands and options

### Custom Tool Runners

Integrate any AI CLI tool (Aider, Claude, etc.):

```bash
# Create custom runner
geese runner new aider -d "Aider AI assistant"

# Edit the generated files to match your tool's CLI
# ~/.geese/runners/aider/AiderProvider.js

# Use it
geese new my-task --tool aider
```

**→ [Custom Runners Guide](docs/CUSTOM_RUNNERS.md)** - Build integrations for any AI tool

### Reporting

Automatic markdown reports for every session:

```
./logs/geese_session_2024-01-15T14-30-22-123Z.log.md
```

Includes:
- Summary table of all processed files
- Full prompts and AI responses
- Token usage and timing
- Configuration details

**→ [Reports Guide](docs/REPORTS.md)** - Customize report output

## 📖 Examples

### Code Review
```yaml
---
_include: ["src/**/*.js"]
_exclude: ["*.test.js"]
_recipe: "code-review"
_temperature: 0.3
---
Review {{filename}} for security and performance.
{{content}}
```

### Log Analysis
```yaml
---
_include: ["logs/**/*.log"]
_recipe: "analyze-logs"
errors: "{{filepath}}" ~> readFile ~> grepCount "ERROR"
---
Found {{errors}} errors in {{filename}}. Analyze and suggest fixes.
```

### JSON Processing
```yaml
---
_include: ["data/**/*.json"]
_recipe: "process-json"
users: "{{content}}" ~> parseJson ~> jqSelect users ~> jqMap name
---
User summary for {{filename}}: {{users}}
```

**→ [More Examples](examples/)** - Real-world use cases

## 📚 Documentation

Complete guides for each feature:

- **[Getting Started](docs/GETTING_STARTED.md)** - Detailed walkthrough
- **[File Format](docs/FILE_FORMAT.md)** - .geese file syntax
- **[Pipes Reference](docs/PIPES.md)** - All built-in operations
- **[Custom Pipes](docs/CUSTOM_PIPES.md)** - Build your own
- **[Custom Runners](docs/CUSTOM_RUNNERS.md)** - Integrate other AI tools
- **[Configuration](docs/CONFIGURATION.md)** - Multi-level config system
- **[CLI Reference](docs/CLI.md)** - All commands
- **[Reports](docs/REPORTS.md)** - Output customization

## 🐛 Troubleshooting

```bash
# Preview without running
geese --dry-run

# Check what's installed
geese pipe list
geese runner list

# Verify configuration
geese config --list
```

**Common issues:**
- **"goose not found"**: Use `geese -g /path/to/goose`
- **No files matched**: Check glob patterns with `--dry-run`
- **Template errors**: Verify Handlebars syntax

**→ [Troubleshooting Guide](docs/TROUBLESHOOTING.md)** - Detailed solutions

## 🔗 Resources

- [Goose AI Assistant](https://github.com/block/goose) - Default AI tool
- [Handlebars.js](https://handlebarsjs.com/) - Template engine
- [Glob Patterns](https://github.com/isaacs/node-glob#glob-primer) - File matching syntax

## 📄 License

ISC License - see LICENSE file for details.
