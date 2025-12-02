# 🦢 Geese - AI-Powered File Processing Tool

Geese is a powerful CLI tool that processes `.geese` files to apply AI-powered transformations to your codebase. It allows you to define recipes, prompts, and file patterns, then automatically processes matching files with your AI assistant.

## 🚀 Features

- **Template-based Processing**: Use Handlebars templates to create dynamic prompts
- **File Pattern Matching**: Include/exclude files with glob patterns
- **Interactive Selection**: Choose which files to process with an intuitive CLI interface
- **Comprehensive Logging**: Automatic markdown reports with detailed session information
- **Configurable AI Integration**: Works with Goose AI assistant
- **Dry Run Mode**: Preview what would be processed without executing
- **Configuration Management**: Store default settings in `~/.geese/config.json`
- **Multiple Tools Support**: Extensible architecture for different AI CLI tools
- **Easy File Creation**: Generate new .geese files with `geese new` command

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

1. (Optional) Set up your configuration defaults:
   ```bash
   geese config --set goose.model gpt-4
   geese config --set goose.temperature 0.7
   ```

2. Create a `.geese` file in your project directory:
   ```bash
   geese new code-review
   ```

3. Edit the `.geese` file to customize the template and file patterns

4. Run `geese` to process files interactively:
   ```bash
   geese
   ```

5. Review the generated report in the `./logs` directory

## 📄 .geese File Format

`.geese` files use YAML frontmatter with Handlebars template content:

```yaml
---
# System properties use $ prefix for visual distinction
$include:
  - "src/**/*.js"
  - "*.md"
$exclude:
  - "node_modules/**"
  - "*.test.js"
$recipe: "code-review"
$model: "gpt-4"
$temperature: 0.7
$max_tokens: 2000

# User properties - can use pipe operations for data transformation
project_name: "My Awesome Project"
review_focus: "performance and security"
formatted_date: "2024-01-15" ~> default "Not Set"
---

Please review the following file from {{project_name}}.

File: {{filename}}
Path: {{filepath}}

Focus on: {{review_focus}}

Content:
{{content}}
```

### Frontmatter Properties

#### System Properties ($ prefix)
System properties control Geese behavior and are parsed once per file. They use the `$` prefix for visual distinction:

- **Required:**
  - `$include`: Array of glob patterns for files to process
  - `$recipe`: The Goose recipe to use

- **Optional:**
  - `$exclude`: Array of glob patterns for files to exclude
  - `$model`: AI model to use (e.g., "gpt-4", "claude-3")
  - `$temperature`: AI response temperature (0-1)
  - `$max_tokens`: Maximum tokens in response
  - `$flags`: Array of additional CLI flags

**Note:** For backward compatibility, properties with `@` prefix (like `@include`) are automatically converted to `$` prefix.

#### User Properties (no prefix)
User properties become available as template variables and support pipe operations for data transformation:

```yaml
# Simple value
project_name: My Project

# With pipe operations - quotes optional for simple values
formatted_title: code review ~> toUpperCase
list_items: a,b,c ~> split , ~> join " | "
file_content: ./data.txt ~> readFile
trimmed_value: hello ~> trim ~> toUpperCase
```

### Pipe Operations

Pipe operations allow you to transform property values using the `~>` operator. Operations are chained left-to-right. The parser automatically quotes pipe expressions, so you typically don't need quotes unless your value contains special YAML characters:

```yaml
# No quotes needed for simple values
my_value: initial value ~> operation1 ~> operation2 arg1 arg2

# Quotes recommended for values with special YAML characters
complex: "value: with colons" ~> operation
```

#### Built-in Operations

**String Operations:**
- `trim` - Remove whitespace from both ends
- `substring start [end]` - Extract substring
- `toUpperCase` - Convert to uppercase
- `toLowerCase` - Convert to lowercase
- `replace pattern replacement` - Replace all occurrences
- `split separator` - Split string into array
- `join separator` - Join array into string

**File Operations:**
- `readFile [encoding]` - Read file content (default: utf8)
- `loadFile [encoding]` - Alias for readFile

**List Operations:**
- `filter pattern` - Filter array by regex pattern
- `map property` - Extract property from objects
- `select index` - Get item at index
- `first` - Get first item
- `last` - Get last item
- `length` - Get array/string length

**Type Operations:**
- `parseJson` - Parse JSON string
- `stringify [indent]` - Convert to JSON string
- `parseYaml` - Parse simple YAML
- `parseInt [radix]` - Parse integer
- `parseFloat` - Parse float

**Regex Operations:**
- `match pattern [flags]` - Match regex pattern
- `test pattern [flags]` - Test regex pattern

**Utility Operations:**
- `default fallback` - Use fallback if empty
- `echo` - Debug output (prints to console)

#### Custom Pipe Operations

Create custom pipe operations for your specific needs:

```bash
# Create a new pipe operation
geese pipe new myOperation -d "My custom operation"

# List available operations
geese pipe list

# Remove a custom operation
geese pipe remove myOperation
```

Custom pipes are stored in `~/.geese/pipes/` and automatically loaded. They follow this signature:

```javascript
module.exports = function myOperation(value, args, context) {
  // value: input from previous operation
  // args: array of arguments passed to the operation
  // context: object with all properties (including filename, content, etc.)
  
  // Your transformation logic here
  return transformedValue;
};
```

### Available Template Variables

- `{{filename}}`: Target filename (e.g., "app.js")
- `{{filepath}}`: Full path to target file
- `{{content}}`: File content
- `{{geese_file}}`: Name of the .geese file (without extension)
- Any custom properties from frontmatter (after pipe operations are applied)

## 🛠️ Usage

Geese provides four main commands:

- **run** - Process .geese files (default command)
- **new** - Create a new .geese file
- **config** - Manage configuration settings
- **pipe** - Manage custom pipe operations

### Running Geese (Process Files)

```bash
# Process all .geese files in current directory (interactive selection)
geese
# or explicitly
geese run

# Process specific directory
geese run ./my-project

# Process specific .geese file
geese -f code-review.geese
# or
geese run -f code-review.geese

# Custom output directory for logs
geese run -o ./reports

# Custom goose executable path
geese run -g /path/to/goose

# Dry run (preview only)
geese run --dry-run
```

### Creating New .geese Files

```bash
# Create a new .geese file with default settings
geese new my-review

# Create with specific tool (defaults to goose)
geese new my-review --tool goose

# Create in a specific directory
geese new my-review -o ./templates
```

The `new` command creates a .geese file with:
- Default frontmatter properties from your config
- Standard template content for the selected tool
- Proper YAML formatting

### Managing Configuration

```bash
# View all configuration
geese config
# or
geese config --list

# Get a specific configuration value
geese config --get goose.model

# Set a configuration value
geese config --set goose.model gpt-4

# Set nested properties
geese config --set goose.temperature 0.7

# Set arrays (use JSON format)
geese config --set goose.include '["src/**/*.js", "lib/**/*.js"]'

# Delete a configuration value
geese config --delete goose.temperature
```

Configuration is stored in `~/.geese/config.json` and provides default values for new .geese files.

### Command Line Options

#### Run Command
```
Usage: geese run [directory] [options]

Arguments:
  directory                 Directory to search for .geese files (default: ".")

Options:
  -f, --file <file>        Process a specific .geese file
  -o, --output <dir>       Output directory for logs (default: "./logs")
  -g, --goose-path <path>  Path to goose executable
  --dry-run                Show what would be processed without executing
  -h, --help               Display help for command
```

#### New Command
```
Usage: geese new [options] <name>

Arguments:
  name                  Name of the .geese file to create

Options:
  -t, --tool <tool>     CLI tool to use (default: "goose")
  -o, --output <dir>    Output directory (default: ".")
  -h, --help            Display help for command
```

#### Config Command
```
Usage: geese config [options]

Options:
  --get <key>          Get a configuration value
  --set <key> <value>  Set a configuration value
  --delete <key>       Delete a configuration value
  --list               List all configuration
  -h, --help           Display help for command
```

#### Pipe Command
```
Usage: geese pipe <action> [name] [options]

Actions:
  list                 List all available pipe operations
  new <name>           Create a new custom pipe operation
  remove <name>        Remove a custom pipe operation
  help                 Show detailed pipe help

Options:
  -d, --description <text>  Description for new pipe operation
  -f, --force              Overwrite existing pipe without confirmation
  -h, --help               Display help for command

Examples:
  geese pipe list
  geese pipe new myPipe -d "My custom operation"
  geese pipe remove myPipe
  geese pipe help
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

## ⚙️ Configuration System

Geese supports a configuration system that allows you to set default values for your .geese files. Configuration is stored in `~/.geese/config.json` and is automatically applied when creating new files.

### Configuration Structure

Configuration is organized by tool name (e.g., `goose`, `aider`):

```json
{
  "goose": {
    "model": "gpt-4",
    "temperature": 0.7,
    "recipe": "code-review",
    "include": ["src/**/*.js", "lib/**/*.js"],
    "exclude": ["node_modules/**", "*.test.js"]
  },
  "defaultTool": "goose"
}
```

### Setting Configuration

Use the `geese config` command to manage your configuration:

```bash
# Set individual properties
geese config --set goose.model gpt-4
geese config --set goose.temperature 0.7

# Set arrays (use JSON format)
geese config --set goose.include '["src/**/*.js", "lib/**/*.js"]'

# Set nested objects (use dot notation)
geese config --set goose.max_tokens 2000
```

### Getting Configuration

```bash
# View all configuration
geese config --list

# Get a specific value
geese config --get goose.model

# Get a nested object
geese config --get goose
```

### How Configuration is Applied

When you create a new .geese file with `geese new`, the tool:

1. Loads the default frontmatter from the tool's template
2. Merges it with configuration from `~/.geese/config.json` for that tool
3. Writes the combined configuration to the new file

This allows you to set project-wide or machine-wide defaults without manually editing each file.

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
