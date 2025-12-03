/**
 * CLI Handler for Runner Operations
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');

class RunnerCLI {
  /**
   * Get the default runners directory
   */
  static getRunnersDirectory(scope = 'global') {
    if (scope === 'global') {
      const homeDir = require('os').homedir();
      return path.join(homeDir, '.geese', 'runners');
    } else {
      return path.join(process.cwd(), '.geese', 'runners');
    }
  }

  /**
   * Ensure runners directory exists
   */
  static ensureRunnersDirectory(scope = 'global') {
    const runnersDir = this.getRunnersDirectory(scope);
    if (!fs.existsSync(runnersDir)) {
      fs.mkdirSync(runnersDir, { recursive: true });
    }
    return runnersDir;
  }

  /**
   * Create a new custom runner pair (provider + runner)
   * @param {string} name - Name of the runner (e.g., 'aider')
   * @param {Object} options - Command options
   * @returns {Object} Paths to created files
   */
  static async createRunner(name, options) {
    try {
      // Validate runner name
      if (!name || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
        console.error(chalk.red('Error: Runner name must start with a letter and contain only letters, numbers, hyphens, and underscores'));
        process.exit(1);
      }

      // Determine scope
      const scope = options.local ? 'local' : 'global';
      const runnersDir = this.ensureRunnersDirectory(scope);
      
      // Create runner directory
      const runnerDir = path.join(runnersDir, name);
      
      // Check if directory already exists
      if (fs.existsSync(runnerDir) && !options.force) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Runner "${name}" already exists. Overwrite?`,
            default: false
          }
        ]);

        if (!overwrite) {
          console.log(chalk.yellow('Cancelled.'));
          return null;
        }
      }

      // Create directory
      await fs.ensureDir(runnerDir);

      // Generate provider and runner templates
      const providerTemplate = this.generateProviderTemplate(name, options.description || '');
      const runnerTemplate = this.generateRunnerTemplate(name, options.description || '');
      
      // File paths
      const providerFile = path.join(runnerDir, `${this.capitalize(name)}Provider.js`);
      const runnerFile = path.join(runnerDir, `${this.capitalize(name)}Runner.js`);
      const indexFile = path.join(runnerDir, 'index.js');

      // Write files
      fs.writeFileSync(providerFile, providerTemplate, 'utf8');
      fs.writeFileSync(runnerFile, runnerTemplate, 'utf8');
      fs.writeFileSync(indexFile, this.generateIndexTemplate(name), 'utf8');

      console.log(chalk.green('✓') + ` Created custom runner: ${chalk.cyan(name)}`);
      console.log(chalk.gray(`  Location: ${runnerDir}`));
      console.log(chalk.gray(`  Provider: ${this.capitalize(name)}Provider.js`));
      console.log(chalk.gray(`  Runner: ${this.capitalize(name)}Runner.js`));
      console.log();
      console.log('Edit the files to implement your custom tool integration.');
      console.log('The runner will be automatically loaded when geese starts.');
      
      return { providerFile, runnerFile, indexFile };
    } catch (error) {
      console.error(chalk.red('Error creating runner:'), error.message);
      process.exit(1);
    }
  }

  /**
   * List all available runners
   * @param {Container} container - Service container
   * @param {boolean} showSources - Whether to show runner sources
   */
  static async listRunners(container, showSources = false) {
    const SimpleUI = require('./simple-ui');
    const toolRegistry = container.get('toolRegistry');
    
    let content = '';
    const allRunners = toolRegistry.getToolNames();
    const builtinRunners = ['goose']; // Default built-in
    
    if (showSources) {
      // Get custom runners
      const globalRunnersDir = this.getRunnersDirectory('global');
      const localRunnersDir = this.getRunnersDirectory('local');
      
      let globalCustom = [];
      let localCustom = [];
      
      if (fs.existsSync(globalRunnersDir)) {
        globalCustom = fs.readdirSync(globalRunnersDir)
          .filter(f => fs.statSync(path.join(globalRunnersDir, f)).isDirectory())
          .filter(f => !builtinRunners.includes(f));
      }
      
      if (fs.existsSync(localRunnersDir)) {
        localCustom = fs.readdirSync(localRunnersDir)
          .filter(f => fs.statSync(path.join(localRunnersDir, f)).isDirectory())
          .filter(f => !builtinRunners.includes(f));
      }
      
      // Build content by source
      if (builtinRunners.length > 0) {
        content += '{cyan-fg}Built-in Runners:{/cyan-fg}\n';
        content += this.formatRunnersList(builtinRunners);
      }
      
      if (globalCustom.length > 0) {
        if (content) content += '\n';
        content += '{cyan-fg}Global Custom Runners:{/cyan-fg}\n';
        content += `{gray-fg}Location: ${globalRunnersDir}{/gray-fg}\n`;
        content += this.formatRunnersList(globalCustom);
      }
      
      if (localCustom.length > 0) {
        if (content) content += '\n';
        content += '{cyan-fg}Local Custom Runners:{/cyan-fg}\n';
        content += `{gray-fg}Location: ${localRunnersDir}{/gray-fg}\n`;
        content += this.formatRunnersList(localCustom);
      }
    } else {
      // Simple listing
      content += '{cyan-fg}Registered Runners:{/cyan-fg}\n';
      content += this.formatRunnersList(allRunners);
    }

    content += '\n{gray-fg}Use "geese runner new <name>" to create a custom runner.{/gray-fg}\n';
    content += '{gray-fg}Use "geese runner list --sources" to see runner sources.{/gray-fg}';
    
    await SimpleUI.showBox('🔧 Available Tool Runners', content);
  }

  /**
   * Display a list of runners in a formatted way
   * @param {string[]} runners - Array of runner names
   */
  static displayRunnersList(runners) {
    const columns = 4;
    const sorted = runners.sort();
    
    for (let i = 0; i < sorted.length; i += columns) {
      const row = sorted.slice(i, i + columns);
      console.log('  ' + row.map(op => chalk.green(op.padEnd(20))).join(''));
    }
  }

  /**
   * Format a list of runners for TUI display
   * @param {string[]} runners - Array of runner names
   * @returns {string} Formatted string
   */
  static formatRunnersList(runners) {
    const columns = 4;
    const sorted = runners.sort();
    let result = '';
    
    for (let i = 0; i < sorted.length; i += columns) {
      const row = sorted.slice(i, i + columns);
      result += '  ' + row.map(op => `{green-fg}${op.padEnd(20)}{/green-fg}`).join('') + '\n';
    }
    
    return result;
  }

  /**
   * Remove a custom runner
   * @param {string} name - Name of the runner to remove
   * @param {Object} options - Command options
   */
  static async removeRunner(name, options) {
    try {
      const scope = options.local ? 'local' : 'global';
      const runnersDir = this.getRunnersDirectory(scope);
      const runnerDir = path.join(runnersDir, name);

      if (!fs.existsSync(runnerDir)) {
        console.error(chalk.red(`Error: Runner "${name}" not found in ${scope} runners`));
        process.exit(1);
      }

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Delete ${scope} runner "${name}"?`,
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Cancelled.'));
        return;
      }

      await fs.remove(runnerDir);
      console.log(chalk.green('✓') + ` Removed runner: ${chalk.cyan(name)}`);
    } catch (error) {
      console.error(chalk.red('Error removing runner:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Capitalize first letter of string
   */
  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generate a provider template
   * @param {string} name - Runner name
   * @param {string} description - Runner description
   * @returns {string} Template code
   */
  static generateProviderTemplate(name, description) {
    const className = this.capitalize(name) + 'Provider';
    const interfacesPath = this.getPathToInterfaces();
    
    return `const IAIToolProvider = require('${interfacesPath}/IAIToolProvider');

/**
 * ${this.capitalize(name)} tool provider implementation
 * ${description || 'Manages command structure for the ' + name + ' AI tool'}
 * 
 * @class
 * @extends IAIToolProvider
 */
class ${className} extends IAIToolProvider {
  /**
   * Get the default executable path for ${name}
   * @returns {string} Default executable path
   */
  getDefaultPath() {
    return '${name}'; // Assumes ${name} is in PATH
  }

  /**
   * Get the required frontmatter properties for .geese files
   * @returns {Object} Object with required and optional properties
   */
  getFrontmatterSchema() {
    return {
      required: ['include', 'recipe'],
      optional: ['exclude', 'model', 'temperature', 'max_tokens', 'flags']
    };
  }

  /**
   * Get the default frontmatter template for new .geese files
   * @returns {Object} Default frontmatter object
   */
  getDefaultFrontmatter() {
    return {
      include: ['src/**/*.js'],
      exclude: ['node_modules/**', '*.test.js'],
      recipe: 'code-review',
      temperature: 0.7,
      max_tokens: 2000
    };
  }

  /**
   * Get the default template content for new .geese files
   * @returns {string} Default template content
   */
  getDefaultTemplate() {
    return \`Please analyze the following file.

File: {{filename}}
Path: {{filepath}}

Content:
{{content}}

Please provide:
1. Analysis of the code
2. Suggestions for improvement
3. Any issues found\`;
  }

  /**
   * Build ${name}-specific command-line arguments from configuration
   * @param {Object} config - Configuration object
   * @returns {Array} Array of command-line arguments
   */
  buildArgs(config) {
    const args = [];
    
    // TODO: Add ${name}-specific argument building logic
    // Example:
    // if (config.model) {
    //   args.push('--model', config.model);
    // }
    
    if (config.recipe) {
      args.push('--recipe', config.recipe);
    }
    
    if (config.temperature !== undefined) {
      args.push('--temperature', String(config.temperature));
    }
    
    if (config.max_tokens !== undefined) {
      args.push('--max-tokens', String(config.max_tokens));
    }
    
    // Add any additional flags from config
    if (config.flags && Array.isArray(config.flags)) {
      args.push(...config.flags);
    }
    
    return args;
  }
}

module.exports = ${className};
`;
  }

  /**
   * Generate a runner template (wrapper around ToolExecutor)
   * @param {string} name - Runner name
   * @param {string} description - Runner description
   * @returns {string} Template code
   */
  static generateRunnerTemplate(name, description) {
    const className = this.capitalize(name) + 'Runner';
    const providerClass = this.capitalize(name) + 'Provider';
    const srcPath = this.getPathToSrc();
    
    return `const ToolExecutor = require('${srcPath}/ToolExecutor');
const ${providerClass} = require('./${providerClass}');

/**
 * ${this.capitalize(name)} runner implementation
 * ${description || 'Executes ' + name + ' tool commands'}
 * 
 * This is a wrapper around ToolExecutor that uses ${providerClass}.
 * It provides a consistent interface for executing ${name} commands.
 * 
 * @class
 */
class ${className} {
  constructor() {
    this.provider = new ${providerClass}();
    this.executor = null;
  }

  /**
   * Initialize executor with a runner type
   * @param {string} runnerType - Type of runner ('real', 'console', 'memory', 'file')
   * @param {Object} options - Runner options
   */
  initializeExecutor(runnerType = 'real', options = {}) {
    this.executor = ToolExecutor.create(this.provider, runnerType, options);
  }

  /**
   * Get the tool executor (creates default if not initialized)
   * @returns {ToolExecutor}
   */
  getExecutor() {
    if (!this.executor) {
      this.initializeExecutor('real');
    }
    return this.executor;
  }

  /**
   * Execute ${name} with a prompt
   * @param {string} prompt - The prompt to send to ${name}
   * @param {Object} config - Configuration for ${name}
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async execute(prompt, config = {}, options = {}) {
    const executor = this.getExecutor();
    return await executor.execute(prompt, config, options);
  }

  /**
   * Set custom executable path
   * @param {string} path - Path to executable
   */
  setPath(path) {
    const executor = this.getExecutor();
    executor.setPath(path);
  }

  /**
   * Delegate provider methods for convenience
   */
  getDefaultPath() {
    return this.provider.getDefaultPath();
  }

  getFrontmatterSchema() {
    return this.provider.getFrontmatterSchema();
  }

  getDefaultFrontmatter() {
    return this.provider.getDefaultFrontmatter();
  }

  getDefaultTemplate() {
    return this.provider.getDefaultTemplate();
  }

  buildArgs(config) {
    return this.provider.buildArgs(config);
  }
}

module.exports = ${className};
`;
  }

  /**
   * Generate index.js template
   * @param {string} name - Runner name
   * @returns {string} Template code
   */
  static generateIndexTemplate(name) {
    const className = this.capitalize(name) + 'Runner';
    const providerClass = this.capitalize(name) + 'Provider';
    
    return `/**
 * Custom runner entry point for ${name}
 * 
 * This module exports both the runner and provider for the ${name} tool.
 * The tool registry will load this module to register the runner.
 */

const ${className} = require('./${className}');
const ${providerClass} = require('./${providerClass}');

module.exports = {
  Runner: ${className},
  Provider: ${providerClass}
};
`;
  }

  /**
   * Get absolute path to interfaces directory in geese installation
   */
  static getPathToInterfaces() {
    // Find the geese installation root by resolving from this file
    const thisFilePath = __filename;
    const geeseRoot = path.dirname(path.dirname(thisFilePath)); // From src/runner-cli.js to root
    return path.join(geeseRoot, 'src', 'interfaces');
  }

  /**
   * Get absolute path to src directory in geese installation
   */
  static getPathToSrc() {
    const thisFilePath = __filename;
    const geeseRoot = path.dirname(path.dirname(thisFilePath)); // From src/runner-cli.js to root
    return path.join(geeseRoot, 'src');
  }

  /**
   * Show help for runner operations
   */
  static showHelp() {
    console.log(`
${chalk.bold('geese runner')} - Manage custom tool runners

${chalk.cyan('Usage:')}
  geese runner list                    List all available runners
  geese runner new <name>              Create a new custom runner
  geese runner remove <name>           Remove a custom runner

${chalk.cyan('Options:')}
  -d, --description <text>             Description for the new runner
  -f, --force                          Overwrite existing runner without confirmation
  --local                              Create/remove in local .geese directory
  --sources                            Show runner sources (for list action)

${chalk.cyan('Examples:')}
  geese runner list
  geese runner list --sources
  geese runner new aider -d "Aider AI coding assistant"
  geese runner new myTool --local
  geese runner remove aider

${chalk.cyan('Custom Runner Location:')}
  Global:  ${chalk.gray(this.getRunnersDirectory('global'))}
  Local:   ${chalk.gray(this.getRunnersDirectory('local'))}

${chalk.cyan('What Gets Created:')}
  When you create a custom runner, geese creates a directory with:
  - ${chalk.gray('<Name>Provider.js')} - Defines tool configuration and command structure
  - ${chalk.gray('<Name>Runner.js')} - Wraps ToolExecutor for your tool
  - ${chalk.gray('index.js')} - Entry point that exports both classes

${chalk.cyan('How It Works:')}
  Custom runners are automatically discovered and loaded when geese starts.
  They follow the same pattern as the built-in Goose runner, allowing you
  to integrate any CLI AI tool with geese's workflow.
    `);
  }
}

module.exports = RunnerCLI;
