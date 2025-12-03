/**
 * Prompt Builder
 * Builds interactive prompts for wizard properties
 */

const inquirer = require('inquirer').default || require('inquirer');
const chalk = require('chalk').default || require('chalk');

class PromptBuilder {
  /**
   * Prompt for a single property value
   * @param {string} property - Property name
   * @param {Object} metadata - Property metadata from PropertyMetadata
   * @param {*} currentValue - Current/default value
   * @returns {Promise<*>} User-selected value
   * @throws {Error} If the prompt cannot be displayed or user cancels
   */
  static async promptForProperty(property, metadata, currentValue) {
    const displayName = property.replace(/^[$@]/, '');
    
    console.log(chalk.cyan(`\n📝 ${displayName}`));
    console.log(chalk.gray(`   ${metadata.hint}`));
    
    if (metadata.examples && metadata.examples.length > 0) {
      console.log(chalk.gray(`   Examples: ${metadata.examples.slice(0, 3).join(', ')}`));
    }

    // Handle different property types
    switch (metadata.type) {
      case 'select':
        return await PromptBuilder.promptSelect(displayName, metadata.options, currentValue || metadata.default);
      
      case 'array':
        return await PromptBuilder.promptArray(displayName, currentValue || metadata.default);
      
      case 'number':
        return await PromptBuilder.promptNumber(displayName, metadata, currentValue || metadata.default);
      
      case 'input':
      default:
        return await PromptBuilder.promptInput(displayName, currentValue || metadata.default);
    }
  }

  /**
   * Prompt for a select/choice value
   * @param {string} name - Property name
   * @param {Array} options - Available options
   * @param {string} defaultValue - Default value
   * @returns {Promise<string>} Selected value
   */
  static async promptSelect(name, options, defaultValue) {
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
   * @param {string[]} defaultValue - Default array
   * @returns {Promise<string[]>} Array of values
   */
  static async promptArray(name, defaultValue) {
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
  static async promptNumber(name, metadata, defaultValue) {
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
  static async promptInput(name, defaultValue) {
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
}

module.exports = PromptBuilder;
