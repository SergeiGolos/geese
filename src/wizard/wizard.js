/**
 * Wizard for creating .geese files with interactive prompts
 * Provides guided setup for system properties based on tool schemas
 */

const inquirer = require('inquirer').default || require('inquirer');
const chalk = require('chalk').default || require('chalk');
const PropertyMetadata = require('./property-metadata');
const PromptBuilder = require('./prompt-builder');

class Wizard {
  /**
   * @param {Object} toolRunner - Tool runner instance
   * @param {Class} [promptBuilder=null] - PromptBuilder class (or compatible class with static methods)
   * @param {Class} [metadataProvider=null] - PropertyMetadata class (or compatible class with static methods)
   */
  constructor(toolRunner, promptBuilder = null, metadataProvider = null) {
    this.toolRunner = toolRunner;
    this.schema = toolRunner.getFrontmatterSchema();
    this.promptBuilder = promptBuilder || PromptBuilder;
    this.metadataProvider = metadataProvider || PropertyMetadata;
  }

  /**
   * Get property metadata (options, hints, defaults) from the tool runner.
   * @param {string} property - Property name
   * @returns {Object} Property metadata
   */
  getPropertyMetadata(property) {
    return this.metadataProvider.getMetadata(property, this.toolRunner);
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
    return this.promptBuilder.promptForProperty(property, metadata, currentValue);
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
