/**
 * Property Metadata
 * Provides metadata for wizard properties (types, hints, defaults)
 */

class PropertyMetadata {
  /**
   * Get property metadata (options, hints, defaults) from the tool runner.
   * Tool runners can optionally implement getPropertyMetadata(property) to provide
   * tool-specific metadata. Falls back to common defaults if not available.
   * @param {string} property - Property name
   * @param {Object} toolRunner - Tool runner instance
   * @returns {Object} Property metadata
   */
  static getMetadata(property, toolRunner) {
    // Check if tool runner provides custom metadata
    if (typeof toolRunner.getPropertyMetadata === 'function') {
      const toolMeta = toolRunner.getPropertyMetadata(property);
      if (toolMeta) {
        return toolMeta;
      }
    }
    
    // Fallback to common metadata for standard properties
    const metadata = {
      include: {
        type: 'array',
        hint: 'Glob patterns for files to include (e.g., src/**/*.js)',
        examples: ['src/**/*.js', 'lib/**/*.ts', '**/*.md'],
        default: ['src/**/*.js']
      },
      exclude: {
        type: 'array',
        hint: 'Glob patterns for files to exclude',
        examples: ['node_modules/**', '*.test.js', 'dist/**', 'build/**'],
        default: ['node_modules/**', '*.test.js']
      },
      recipe: {
        type: 'input',
        hint: 'The recipe to use with the tool (e.g., code-review, documentation)',
        examples: ['code-review', 'documentation', 'refactoring', 'testing'],
        default: 'code-review'
      },
      model: {
        type: 'select',
        hint: 'AI model to use',
        options: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        default: 'gpt-4'
      },
      temperature: {
        type: 'number',
        hint: 'Response temperature (0-1). Lower = more focused, Higher = more creative',
        min: 0,
        max: 1,
        default: 0.7
      },
      max_tokens: {
        type: 'number',
        hint: 'Maximum tokens in response',
        default: 2000
      },
      flags: {
        type: 'array',
        hint: 'Additional CLI flags to pass to the tool',
        examples: ['--verbose', '--no-cache'],
        default: []
      }
    };

    return metadata[property] || { type: 'input', hint: 'Value for ' + property };
  }
}

module.exports = PropertyMetadata;
