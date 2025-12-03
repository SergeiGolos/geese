const inquirer = require('inquirer').default || require('inquirer');
const chalk = require('chalk').default || require('chalk');

/**
 * Wizard for creating .geese files with interactive prompts
 * Provides guided setup for system properties based on tool schemas
 */
class Wizard {
  constructor(toolRunner) {
    this.toolRunner = toolRunner;
    this.schema = toolRunner.getFrontmatterSchema();
  }

  /**
   * Get property metadata (options, hints, defaults) from the tool runner.
   * Tool runners can optionally implement getPropertyMetadata(property) to provide
   * tool-specific metadata. Falls back to common defaults if not available.
   * @param {string} property - Property name
   * @returns {Object} Property metadata
   */
  getPropertyMetadata(property) {
    // Check if tool runner provides custom metadata
    if (typeof this.toolRunner.getPropertyMetadata === 'function') {
      const toolMeta = this.toolRunner.getPropertyMetadata(property);
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

  /**
   * Prompt for a single property value
   * @param {string} property - Property name
   * @param {*} currentValue - Current/default value
   * @returns {Promise<*>} User-selected value
   * @throws {Error} If the prompt cannot be displayed or user cancels
   */
  async promptForProperty(property, currentValue) {
    const metadata = this.getPropertyMetadata(property);
    const displayName = property.replace(/^[$@]/, '');
    
    console.log(chalk.cyan(`\n📝 ${displayName}`));
    console.log(chalk.gray(`   ${metadata.hint}`));
    
    if (metadata.examples && metadata.examples.length > 0) {
      console.log(chalk.gray(`   Examples: ${metadata.examples.slice(0, 3).join(', ')}`));
    }

    // Handle different property types
    switch (metadata.type) {
      case 'select':
        return await this.promptSelect(displayName, metadata.options, currentValue || metadata.default);
      
      case 'array':
        return await this.promptArray(displayName, currentValue || metadata.default);
      
      case 'number':
        return await this.promptNumber(displayName, metadata, currentValue || metadata.default);
      
      case 'input':
      default:
        return await this.promptInput(displayName, currentValue || metadata.default);
    }
  }

  /**
   * Prompt for a select/choice value
   * @param {string} name - Property name
   * @param {Array} options - Available options
   * @param {*} defaultValue - Default value
   * @returns {Promise<string>} Selected value
   */
  async promptSelect(name, options, defaultValue) {
    // Add "Other..." option and current value if not in list
    const choices = [...options];
    if (defaultValue && !choices.includes(defaultValue)) {
      choices.push(defaultValue);
    }
    choices.push('Other...');

    const { value } = await inquirer.prompt([
      {
        type: 'list',
        name: 'value',
        message: `Select ${name}:`,
        choices: choices,
        default: defaultValue
      }
    ]);

    // If user selected "Other...", prompt for custom input
    if (value === 'Other...') {
      const { customValue } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customValue',
          message: `Enter custom ${name}:`,
          default: defaultValue
        }
      ]);
      return customValue;
    }

    return value;
  }

  /**
   * Prompt for an array value
   * @param {string} name - Property name
   * @param {Array} defaultValue - Default array
   * @returns {Promise<Array>} Array of values
   */
  async promptArray(name, defaultValue) {
    // Handle undefined or non-array defaultValue
    const safeDefault = Array.isArray(defaultValue) ? defaultValue : [];
    
    const { useDefaults } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useDefaults',
        message: `Use default ${name}? [${safeDefault.join(', ')}]`,
        default: true
      }
    ]);

    if (useDefaults) {
      return safeDefault;
    }

    const items = [];
    let adding = true;

    while (adding) {
      const { item } = await inquirer.prompt([
        {
          type: 'input',
          name: 'item',
          message: `Enter ${name} item (or leave empty to finish):`,
        }
      ]);

      if (item.trim()) {
        items.push(item.trim());
      } else {
        adding = false;
      }
    }

    return items.length > 0 ? items : safeDefault;
  }

  /**
   * Prompt for a number value
   * @param {string} name - Property name
   * @param {Object} metadata - Property metadata with min/max
   * @param {number} defaultValue - Default value
   * @returns {Promise<number>} Number value
   */
  async promptNumber(name, metadata, defaultValue) {
    const { value } = await inquirer.prompt([
      {
        type: 'input',
        name: 'value',
        message: `Enter ${name}:`,
        default: String(defaultValue),
        validate: (input) => {
          const num = parseFloat(input);
          if (isNaN(num)) {
            return 'Please enter a valid number';
          }
          if (metadata.min !== undefined && num < metadata.min) {
            return `Value must be at least ${metadata.min}`;
          }
          if (metadata.max !== undefined && num > metadata.max) {
            return `Value must be at most ${metadata.max}`;
          }
          return true;
        }
      }
    ]);

    return parseFloat(value);
  }

  /**
   * Prompt for a text input value
   * @param {string} name - Property name
   * @param {string} defaultValue - Default value
   * @returns {Promise<string>} Text value
   */
  async promptInput(name, defaultValue) {
    const { value } = await inquirer.prompt([
      {
        type: 'input',
        name: 'value',
        message: `Enter ${name}:`,
        default: defaultValue
      }
    ]);

    return value;
  }

  /**
   * Get current value for a property, checking all possible prefixes
   * @param {Object} frontmatter - Frontmatter object
   * @param {string} prop - Property name
   * @returns {*} Current value or undefined
   */
  getCurrentValue(frontmatter, prop) {
    return frontmatter[prop] || frontmatter[`$${prop}`] || frontmatter[`@${prop}`];
  }

  /**
   * Clean up legacy @ prefixes and migrate to $ prefix
   * For backward compatibility with old .geese files
   * @param {Object} frontmatter - Frontmatter object to clean
   * @returns {Object} Cleaned frontmatter object
   */
  cleanupLegacyPrefixes(frontmatter) {
    for (const key of Object.keys(frontmatter)) {
      if (key.startsWith('@')) {
        const newKey = `$${key.slice(1)}`;
        // Use existing $ value if present, otherwise use @ value
        frontmatter[newKey] = frontmatter[newKey] || frontmatter[key];
        delete frontmatter[key];
      }
    }
    return frontmatter;
  }

  /**
   * Run the wizard to collect all frontmatter properties
   * @param {Object} initialFrontmatter - Initial frontmatter values
   * @returns {Promise<Object>} Complete frontmatter object
   * @throws {Error} If prompts fail or wizard is cancelled
   */
  async run(initialFrontmatter = {}) {
    try {
      console.log(chalk.blue('\n🧙 Geese File Wizard'));
      console.log(chalk.gray('This wizard will help you create a .geese file with proper configuration.\n'));

      const frontmatter = { ...initialFrontmatter };
      const { required, optional } = this.schema;

      // Prompt for required properties
      console.log(chalk.yellow('📋 Required Properties'));
      for (const prop of required) {
        const currentValue = this.getCurrentValue(frontmatter, prop);
        const value = await this.promptForProperty(prop, currentValue);
        frontmatter[`$${prop}`] = value;
        // Remove non-prefixed version if it exists
        if (frontmatter[prop] !== undefined) {
          delete frontmatter[prop];
        }
      }

      // Ask if user wants to configure optional properties
      console.log(chalk.yellow('\n⚙️  Optional Properties'));
      const { configureOptional } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'configureOptional',
          message: 'Would you like to configure optional properties?',
          default: true
        }
      ]);

      if (configureOptional) {
        // Let user select which optional properties to configure
        const { selectedOptional } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'selectedOptional',
            message: 'Select optional properties to configure:',
            choices: optional.map(prop => ({
              name: prop,
              value: prop,
              checked: frontmatter[prop] !== undefined || frontmatter[`$${prop}`] !== undefined
            }))
          }
        ]);

        // Prompt for selected optional properties
        for (const prop of selectedOptional) {
          const currentValue = this.getCurrentValue(frontmatter, prop);
          const value = await this.promptForProperty(prop, currentValue);
          frontmatter[`$${prop}`] = value;
          // Remove non-prefixed version if it exists
          if (frontmatter[prop] !== undefined) {
            delete frontmatter[prop];
          }
        }
      }

      // Clean up legacy @ prefixes for backward compatibility
      this.cleanupLegacyPrefixes(frontmatter);

      console.log(chalk.green('\n✅ Configuration complete!'));
      return frontmatter;
    } catch (error) {
      if (error.isTtyError) {
        throw new Error('Wizard cannot run in non-interactive environment');
      } else if (error.name === 'ExitPromptError') {
        console.log(chalk.yellow('\n✗ Wizard cancelled'));
        throw error;
      }
      throw error;
    }
  }
}

module.exports = Wizard;
