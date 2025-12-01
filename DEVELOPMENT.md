# 🛠️ Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 16.0.0 or higher
- npm or yarn package manager
- Git (for cloning)

### Setup

1. **Clone or Setup the Project**
   ```bash
   # If cloning from repository
   git clone <repository-url>
   cd geese
   
   # Or if already in the project directory
   # You're already there!
   ```

2. **Run the Setup Script**
   ```bash
   npm run setup
   ```
   This will:
   - Install all dependencies
   - Create a global symlink for `geese` command
   - Set up test files
   - Verify the installation

3. **Manual Setup (Alternative)**
   ```bash
   # Install dependencies
   npm install
   
   # Create global symlink (may need admin privileges)
   npm link
   
   # Test the CLI
   geese --help
   ```

## 🏗️ Project Structure

```
geese/
├── bin/
│   └── geese.js              # CLI entry point
├── src/
│   ├── geese-parser.js       # .geese file parsing
│   ├── goose-runner.js       # Goose AI integration
│   └── report-generator.js   # Report generation
├── examples/                 # Example .geese files
│   ├── code-review.geese
│   ├── documentation-generator.geese
│   └── refactoring-assistant.geese
├── test-project/             # Test environment
├── lib/                      # Additional utilities (future)
├── package.json
├── README.md
├── REQUIREMENTS.md
└── DEVELOPMENT.md
```

## 🧪 Development Workflow

### 1. Making Changes

Edit the source files in the `src/` directory:
- `geese-parser.js`: File parsing and template logic
- `goose-runner.js`: Goose AI process management
- `report-generator.js`: Report formatting and output

### 2. Testing Changes

```bash
# Test with dry run (recommended during development)
geese --dry-run test-project

# Test specific .geese file
geese -f examples/code-review.geese --dry-run

# Run directly with node (if global link not working)
node bin/geese.js --dry-run test-project
```

### 3. Testing with Real Files

1. Create test files in `test-project/` or any directory
2. Create a `.geese` file with your desired configuration
3. Run: `geese --dry-run` to preview
4. If satisfied, run: `geese` to execute

### 4. Debug Mode

```bash
# Run with verbose output
DEBUG=* geese --dry-run

# Or run with Node.js inspector
node --inspect-brk bin/geese.js --dry-run test-project
```

## 📝 Creating Test Cases

### Test Directory Setup
```bash
mkdir my-test
cd my-test

# Create some source files
echo 'function test() { return "hello"; }' > app.js
echo 'import React from "react"; export default () => <div>Hello</div>;' > component.jsx

# Create a .geese file
cat > test.geese << 'EOF'
---
include:
  - "*.js"
  - "*.jsx"
recipe: "code-review"
temperature: 0.3
project_name: "My Test Project"
---

Please review the following file from {{project_name}}:

File: {{filename}}
Content:
{{content}}

Provide feedback on code quality and best practices.
EOF

# Test it
cd ..
geese --dry-run my-test
```

## 🔧 Debugging Common Issues

### 1. Inquirer/CLI Issues
If the interactive prompts don't work:

```bash
# Try running directly with node
node bin/geese.js --help

# Check Node.js version (must be >= 16)
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### 2. Module Import Issues
If you see ES module errors:

```bash
# Check package.json type field
grep '"type"' package.json
# Should show "commonjs"

# If using ES modules, convert imports:
# Change require() to import statements
# Add "type": "module" to package.json
```

### 3. File Permission Issues
If npm link fails:

```bash
# Try with administrator privileges (Windows)
# Run as Administrator
npm link

# Or use npx to run locally
npx geese --dry-run test-project
```

### 4. Glob Pattern Issues
Test file patterns:

```bash
# Test glob patterns manually
node -e "const glob = require('glob'); console.log(glob.sync('*.js'));"

# Check file permissions
ls -la test-project/
```

## 🧪 Running Tests

### Unit Tests (when implemented)
```bash
npm test
```

### Manual Testing Checklist
- [ ] CLI starts without errors
- [ ] Help command works: `geese --help`
- [ ] Version command works: `geese --version`
- [ ] Dry run mode works: `geese --dry-run`
- [ ] File discovery works
- [ ] Template rendering works
- [ ] Report generation works

### Integration Testing
1. Test with different file types (js, ts, jsx, etc.)
2. Test with different glob patterns
3. Test error handling
4. Test with large files
5. Test with malformed .geese files

## 📦 Building for Distribution

### Before Release
```bash
# Run full test suite
npm test

# Test with different Node.js versions
nvm use 16 && npm test
nvm use 18 && npm test
nvm use 20 && npm test

# Check for security vulnerabilities
npm audit

# Update version if needed
npm version patch  # or minor/major
```

### Publishing to NPM
```bash
# Build (if needed)
npm run build

# Publish
npm publish

# Or for testing
npm publish --dry-run
npm publish --tag beta
```

## 🔄 Development Workflow

### Feature Development
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and test thoroughly
3. Update documentation if needed
4. Test with real scenarios
5. Commit changes: `git commit -m "Add new feature"`
6. Push and create PR: `git push origin feature/new-feature`

### Bug Fixes
1. Reproduce the issue
2. Create minimal test case
3. Fix the issue
4. Test the fix
5. Update tests if needed
6. Commit with clear description

## 📚 Code Style Guidelines

### JavaScript
- Use CommonJS modules (`require()`/`module.exports`)
- Use JSDoc comments for functions
- Use consistent indentation (2 spaces)
- Prefer descriptive variable names
- Handle errors appropriately

### File Naming
- Use kebab-case for files: `geese-parser.js`
- Use camelCase for variables and functions
- Use PascalCase for classes: `GeeseParser`

### Comments and Documentation
- Document function parameters and return values
- Explain complex logic
- Update README.md for user-facing changes
- Update REQUIREMENTS.md for specification changes

## 🚀 Performance Considerations

### Large Files
- Test with files >1MB
- Monitor memory usage
- Consider streaming for very large files
- Add file size warnings

### Concurrent Processing
- Consider parallel processing for multiple files
- Implement progress indicators
- Handle rate limiting for API calls

### Error Handling
- Graceful degradation
- Clear error messages
- Recovery options where possible
- Logging for troubleshooting

## 🤝 Contributing

### Before Contributing
1. Read REQUIREMENTS.md thoroughly
2. Understand the project architecture
3. Set up development environment
4. Test existing functionality

### Submitting Changes
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Update documentation
5. Submit pull request with clear description

### Code Review Process
- All changes require review
- Tests must pass
- Documentation must be updated
- Breaking changes require discussion

## 🐛 Troubleshooting

### Environment Issues
```bash
# Check Node.js and npm versions
node --version
npm --version

# Clear npm cache
npm cache clean --force

# Reinstall everything
rm -rf node_modules package-lock.json
npm install
```

### Debug Logs
```bash
# Enable debug logging
DEBUG=geese:* geese --dry-run

# Or create custom logging
DEBUG=geese:* node bin/geese.js --dry-run test-project
```

### File System Issues
- Check file permissions
- Verify file paths
- Test with absolute paths
- Check for special characters in filenames

## 📞 Getting Help

### Resources
- **README.md**: General usage and documentation
- **REQUIREMENTS.md**: Detailed specifications
- **GitHub Issues**: Bug reports and feature requests
- **NPM Page**: Package information and updates

### Support Channels
- Create GitHub issue for bugs
- Start discussion for feature requests
- Check existing issues before creating new ones
- Provide detailed reproduction steps for bugs

Happy coding! 🎉
