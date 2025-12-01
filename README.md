# 🦢 Geese - AI-Powered File Processing Tool

Geese is a powerful CLI tool that processes `.geese` files to apply AI-powered transformations to your codebase. It allows you to define recipes, prompts, and file patterns, then automatically processes matching files with your AI assistant.

## 🚀 Features

- **Template-based Processing**: Use Handlebars templates to create dynamic prompts
- **File Pattern Matching**: Include/exclude files with glob patterns
- **Interactive Selection**: Choose which files to process with an intuitive CLI interface
- **Comprehensive Logging**: Automatic markdown reports with detailed session information
- **Configurable AI Integration**: Works with Goose AI assistant
- **Dry Run Mode**: Preview what would be processed without executing

## 📦 Installation

```bash
npm install -g geese
```

Or for development:

```bash
git clone <repository>
cd geese
npm install
npm link
```

## 🎯 Quick Start

1. Create a `.geese` file in your project directory
2. Run `geese` to process files interactively
3. Review the generated report in the `./logs` directory

## 📄 .geese File Format

`.geese` files use YAML frontmatter with Handlebars template content:

```yaml
---
include:
  - "src/**/*.js"
  - "*.md"
exclude:
  - "node_modules/**"
  - "*.test.js"
recipe: "code-review"
model: "gpt-4"
@temperature: 0.7
@max_tokens: 2000
project_name: "My Awesome Project"
review_focus: "performance and security"
---

Please review the following file from {{project_name}}.

File: {{filename}}
Path: {{filepath}}

Focus on: {{review_focus}}

Content:
{{content}}
```

### Frontmatter Properties

#### Required Properties
- `include`: Array of glob patterns for files to process
- `recipe`: The Goose recipe to use

#### Optional Properties
- `exclude`: Array of glob patterns for files to exclude
- `model`: AI model to use (e.g., "gpt-4", "claude-3")
- **Custom Properties**: Any other properties become available as template variables

#### Goose Configuration (with @ prefix)
- `@temperature`: AI response temperature (0-1)
- `@max_tokens`: Maximum tokens in response
- `@flags`: Array of additional CLI flags

### Available Template Variables

- `{{filename}}`: Target filename (e.g., "app.js")
- `{{filepath}}`: Full path to target file
- `{{content}}`: File content
- `{{geese_file}}`: Name of the .geese file (without extension)
- Any custom properties from frontmatter

## 🛠️ Usage

### Basic Usage

```bash
# Process all .geese files in current directory
geese

# Process specific directory
geese ./my-project

# Process specific .geese file
geese -f code-review.geese

# Custom output directory for logs
geese -o ./reports

# Custom goose executable path
geese -g /path/to/goose

# Dry run (preview only)
geese --dry-run
```

### Command Line Options

```
Usage: geese [directory] [options]

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

### Interactive File Selection

When multiple `.geese` files are found, you'll see an interactive selection:

```
? Select .geese files to process: (Press <space> to select, <a> to toggle all, <i> to invert selection)
❯◯ code-review.geese (1.2 KB)
 ◯ documentation-update.geese (856 B)
 ◯ refactoring-assistant.geese (2.1 KB)
```

### Target File Selection

When a `.geese` file matches multiple target files, you can select specific files:

```
? Select target files to process:
❯◯ src/components/Button.jsx (4.5 KB)
 ◯ src/components/Input.jsx (3.2 KB)
 ◯ src/utils/helpers.js (8.1 KB)
```

## 📊 Reports

Geese automatically generates comprehensive markdown reports for each processing session:

```
./logs/geese_session_2024-01-15T14-30-22-123Z.log.md
```

### Report Contents

- **Summary Table**: Overview of all processed files
- **Session Details**: For each file:
  - Goose configuration used
  - Context variables and values
  - Generated prompt
  - AI response
  - Token usage (when available)
  - Processing duration

### Sample Report Structure

```markdown
# Geese Processing Report

**Generated:** 2024-01-15T14:30:22.123Z
**Total Sessions:** 3
**Total Duration:** 15,432ms

## Summary

| Geese File | Target File | Duration | Status |
|------------|-------------|----------|---------|
| code-review.geese | Button.jsx | 5,123ms | ✅ Success |
| code-review.geese | Input.jsx | 4,891ms | ✅ Success |
| code-review.geese | helpers.js | 5,418ms | ✅ Success |

## Session 1: code-review.geese → Button.jsx

**Start Time:** 2024-01-15T14:30:22.123Z
**Duration:** 5,123ms
**Status:** Success

### Goose Configuration

```json
{
  "temperature": 0.7,
  "max_tokens": 2000
}
```

### Context Variables

```json
{
  "filename": "Button.jsx",
  "project_name": "My Awesome Project",
  "review_focus": "performance and security"
}
```

... (detailed prompt, response, and token info)
```

## 🔧 Development

### Local Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd geese

# Install dependencies
npm install

# Create a symlink for global testing
npm link

# Run the tool locally
geese --help
```

### Project Structure

```
geese/
├── bin/
│   └── geese.js          # CLI entry point
├── src/
│   ├── geese-parser.js   # .geese file parser
│   ├── goose-runner.js   # Goose process executor
│   └── report-generator.js # Report generator
├── lib/                  # Additional utilities
├── package.json
└── README.md
```

### Running Tests

```bash
npm test
```

### Example .geese Files

#### Code Review Template

```yaml
---
include:
  - "src/**/*.js"
  - "src/**/*.jsx"
exclude:
  - "*.test.js"
  - "node_modules/**"
recipe: "code-review"
@temperature: 0.3
review_type: "security and performance"
---

Please perform a {{review_type}} review of the following file.

File: {{filename}}
Size: {{content.length}} characters

Focus areas:
- Security vulnerabilities
- Performance optimizations
- Code quality
- Best practices

Code to review:
{{content}}

Please provide:
1. Security issues found
2. Performance recommendations
3. Code quality improvements
4. Overall assessment
```

#### Documentation Generator

```yaml
---
include:
  - "src/**/*.js"
  - "src/**/*.ts"
exclude:
  - "*.test.js"
  - "dist/**"
recipe: "documentation"
@model: "gpt-4"
@temperature: 0.1
project: "My Library"
version: "2.1.0"
---

Generate comprehensive documentation for this {{project}} source file.

File: {{filename}}
Path: {{filepath}}

Source Code:
{{content}}

Please provide:
1. File overview and purpose
2. Function/class documentation
3. Parameter descriptions
4. Return value documentation
5. Usage examples
6. Dependencies and requirements

Format the output in Markdown suitable for inclusion in API docs.
```

## 🐛 Troubleshooting

### Common Issues

1. **"goose not found in PATH"**
   - Ensure Goose is installed and accessible
   - Use `-g` option to specify custom path: `geese -g /path/to/goose`

2. **No .geese files found**
   - Check that files have `.geese` extension
   - Verify you're in the correct directory
   - Use `-f` to specify a specific file

3. **Template rendering errors**
   - Check Handlebars syntax in your template
   - Verify all required frontmatter properties are present
   - Use `--dry-run` to preview generated prompts

### Debug Mode

Use the `--dry-run` flag to see what would be processed without executing Goose:

```bash
geese --dry-run
```

This will show:
- Which .geese files would be processed
- Which target files would be selected
- Generated prompts for each file

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details.

## 🔗 Related Tools

- [Goose AI Assistant](https://github.com/block/goose) - The AI assistant this tool integrates with
- [Handlebars.js](https://handlebarsjs.com/) - Template engine used for prompt generation
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) - Interactive command line prompts
