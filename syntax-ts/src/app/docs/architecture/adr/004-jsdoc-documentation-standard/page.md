---
title: "ADR 004: JSDoc Standard"
nextjs:
  metadata:
    title: "ADR 004: JSDoc Standard"
    description: "Documentation for ADR 004: JSDoc Standard"
---

## Status
Accepted (2024-12-03)

## Context

Documentation in the Geese project was inconsistent:
- Some files had JSDoc comments, others didn't
- No standard format for documenting functions
- Public API not clearly distinguished from internal methods
- Parameter types and return values not consistently documented
- No examples in documentation

This made it difficult for developers to:
- Understand how to use the API
- Know what parameters are expected
- Understand what values are returned
- Find usage examples

## Decision

We have adopted a comprehensive JSDoc documentation standard for all public APIs:

### 1. Documentation Requirements

**All public classes, methods, and functions must have JSDoc comments including:**

- Description of what the code does
- `@param` tags for all parameters with types and descriptions
- `@returns` tag with type and description
- `@throws` tag for any errors that may be thrown
- `@example` tag with at least one usage example
- `@deprecated` tag if applicable

### 2. Standard Format

```javascript
/**
 * Brief description of what this does
 *
 * Detailed description if needed, explaining concepts,
 * usage patterns, or important notes.
 *
 * @param {string} filePath - Absolute path to .geese file
 * @param {Object} [options={}] - Optional configuration
 * @param {string[]} [options.include] - File patterns to include
 * @param {string[]} [options.exclude] - File patterns to exclude
 *
 * @returns {ParsedGeeseFile} Parsed file data
 * @returns {Object} returns.frontmatter - Parsed frontmatter
 * @returns {string} returns.template - Template content
 *
 * @throws {Error} If file doesn't exist
 * @throws {ValidationError} If frontmatter is invalid
 *
 * @example
 * const parser = new GeeseParser();
 * const data = parser.parseGeeseFile('./review.geese', {
 *   include: ['src/*.js']
 * });
 * console.log(data.frontmatter.$recipe);
 *
 * @example
 * // With error handling
 * try {
 *   const data = parser.parseGeeseFile('./file.geese');
 * } catch (error) {
 *   console.error('Parse failed:', error);
 * }
 */
parseGeeseFile(filePath, options = {}) {
  // Implementation
}
```

### 3. Type Annotations

Use proper JSDoc types:
- Primitives: `{string}`, `{number}`, `{boolean}`
- Arrays: `{string[]}`, `{Array<string>}`
- Objects: `{Object}`, `{MyClass}`
- Optional: `{string}` with `[param]` or `{string=}`
- Union: `{string|number}`
- Any: `{*}`
- Promises: `{Promise<string>}`
- Functions: `{Function}` or `{(param: string) => number}`

### 4. Implementation Priority

1. ✅ All interface classes (IConfigProvider, IFileFinder, etc.)
2. ✅ Container and EventEmitter infrastructure
3. Public methods in core classes (ConfigManager, GeeseParser, etc.)
4. Utility classes (ObjectPathHelper, DirectoryWalker, etc.)
5. Command handlers
6. Private/internal methods (optional but encouraged)

### 5. Documentation Generation

JSDoc comments enable:
- IDE autocompletion and inline help
- Automated documentation generation
- Type checking with TypeScript/Flow
- Better code navigation

## Consequences

### Positive
- **Better Developer Experience**: Clear API documentation in IDEs
- **Fewer Bugs**: Type information catches mistakes early
- **Easier Onboarding**: New developers understand API quickly
- **Self-Documenting**: Code documents itself
- **Generated Docs**: Can generate HTML documentation automatically
- **Type Safety**: Enables type checking tools

### Negative
- **More Maintenance**: Documentation needs updates when code changes
- **Extra Effort**: Takes time to write comprehensive documentation
- **Inconsistency Risk**: Docs can become outdated if not maintained
- **Verbosity**: Files become longer with documentation

### Neutral
- Standard in JavaScript community
- Required for professional projects
- Improves code review quality

## Examples

### Class Documentation
```javascript
/**
 * Manages application configuration with hierarchical loading
 *
 * Supports loading configuration from multiple sources:
 * - Global config (~/.geese/config.json)
 * - Local config (./.geese/config.json)
 * - .geese file frontmatter
 * - CLI arguments
 *
 * @class ConfigManager
 * @extends IConfigProvider
 */
class ConfigManager extends IConfigProvider {
  // ...
}
```

### Method with Multiple Examples
```javascript
/**
 * Set a configuration value
 *
 * @param {string} key - Dot-separated key path
 * @param {*} value - Value to set
 * @returns {Promise<void>}
 *
 * @example
 * // Set a simple value
 * await config.set('goose.model', 'gpt-4');
 *
 * @example
 * // Set a nested value
 * await config.set('tools.goose.temperature', 0.7);
 */
async set(key, value) {
  // ...
}
```

## Tools

Recommended tools for JSDoc:
- **jsdoc**: Generate HTML documentation
- **documentation.js**: Modern JSDoc generator
- **TypeScript**: Type checking from JSDoc
- **VSCode**: Built-in JSDoc support

## Maintenance

- Review documentation during code reviews
- Update docs when changing function signatures
- Add examples when common usage patterns emerge
- Use `@deprecated` to mark old APIs

## References

- [JSDoc Documentation](https://jsdoc.app/)
- [Google JavaScript Style Guide - Comments](https://google.github.io/styleguide/jsguide.html#jsdoc)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)