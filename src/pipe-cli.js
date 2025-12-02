/**
 * CLI Handler for Pipe Operations
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');

class PipeCLI {
  /**
   * Get the default pipes directory
   */
  static getPipesDirectory() {
    const homeDir = require('os').homedir();
    return path.join(homeDir, '.geese', 'pipes');
  }

  /**
   * Ensure pipes directory exists
   */
  static ensurePipesDirectory() {
    const pipesDir = this.getPipesDirectory();
    if (!fs.existsSync(pipesDir)) {
      fs.mkdirSync(pipesDir, { recursive: true });
    }
    return pipesDir;
  }

  /**
   * Create a new custom pipe operation
   * @param {string} name - Name of the pipe operation
   * @param {Object} options - Command options
   */
  static async createPipe(name, options) {
    try {
      // Validate pipe name
      if (!name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        console.error(chalk.red('Error: Pipe name must be a valid JavaScript identifier'));
        process.exit(1);
      }

      const pipesDir = this.ensurePipesDirectory();
      const pipeFile = path.join(pipesDir, `${name}.js`);

      // Check if file already exists
      if (fs.existsSync(pipeFile) && !options.force) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Pipe "${name}" already exists. Overwrite?`,
            default: false
          }
        ]);

        if (!overwrite) {
          console.log(chalk.yellow('Cancelled.'));
          return;
        }
      }

      // Generate pipe template
      const template = this.generatePipeTemplate(name, options.description || '');

      // Write file
      fs.writeFileSync(pipeFile, template, 'utf8');

      console.log(chalk.green('✓') + ` Created pipe operation: ${chalk.cyan(name)}`);
      console.log(chalk.gray(`  Location: ${pipeFile}`));
      console.log();
      console.log('Edit the file to implement your custom operation.');
      console.log('The pipe will be automatically loaded when geese runs.');
    } catch (error) {
      console.error(chalk.red('Error creating pipe:'), error.message);
      process.exit(1);
    }
  }

  /**
   * List all available pipe operations
   */
  static async listPipes(showSources = false) {
    const pipeOps = require('./pipe-operations');
    
    console.log(chalk.bold('\n📦 Available Pipe Operations\n'));

    if (showSources) {
      // Show with source information
      const allOps = pipeOps.listWithSources();
      
      // Group by source
      const bySource = {
        builtin: [],
        global: [],
        local: []
      };
      
      for (const op of allOps) {
        if (bySource[op.source]) {
          bySource[op.source].push(op.name);
        }
      }
      
      // Display by source
      if (bySource.builtin.length > 0) {
        console.log(chalk.cyan('Built-in Operations:'));
        this.displayOperationsList(bySource.builtin);
      }
      
      if (bySource.global.length > 0) {
        console.log();
        console.log(chalk.cyan('Global Custom Operations:'));
        const globalPipesDir = path.join(require('os').homedir(), '.geese', 'pipes');
        console.log(chalk.gray(`  Location: ${globalPipesDir}`));
        this.displayOperationsList(bySource.global);
      }
      
      if (bySource.local.length > 0) {
        console.log();
        console.log(chalk.cyan('Local Custom Operations:'));
        console.log(chalk.gray(`  Location: ./.geese/pipes/`));
        this.displayOperationsList(bySource.local);
      }
    } else {
      // Original simple listing
      const allOps = pipeOps.list();
      
      // Get custom operations
      const pipesDir = this.getPipesDirectory();
      let customOps = [];
      if (fs.existsSync(pipesDir)) {
        customOps = fs.readdirSync(pipesDir)
          .filter(f => f.endsWith('.js'))
          .map(f => path.basename(f, '.js'));
      }

      // Display built-in operations
      console.log(chalk.cyan('Built-in Operations:'));
      const builtinOps = allOps.filter(op => !customOps.includes(op));
      this.displayOperationsList(builtinOps);

      // Display custom operations
      if (customOps.length > 0) {
        console.log();
        console.log(chalk.cyan('Custom Operations:'));
        console.log(chalk.gray(`  Location: ${pipesDir}`));
        this.displayOperationsList(customOps);
      }
    }

    console.log();
    console.log(chalk.gray('Use "geese pipe new <name>" to create a custom pipe operation.'));
    console.log(chalk.gray('Use "geese pipe list --sources" to see operation sources.'));
  }

  /**
   * Display a list of operations in a formatted way
   * @param {string[]} operations - Array of operation names
   */
  static displayOperationsList(operations) {
    const columns = 4;
    const sorted = operations.sort();
    
    for (let i = 0; i < sorted.length; i += columns) {
      const row = sorted.slice(i, i + columns);
      console.log('  ' + row.map(op => chalk.green(op.padEnd(20))).join(''));
    }
  }

  /**
   * Remove a custom pipe operation
   * @param {string} name - Name of the pipe to remove
   */
  static async removePipe(name) {
    try {
      const pipesDir = this.getPipesDirectory();
      const pipeFile = path.join(pipesDir, `${name}.js`);

      if (!fs.existsSync(pipeFile)) {
        console.error(chalk.red(`Error: Pipe "${name}" not found`));
        process.exit(1);
      }

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Delete pipe "${name}"?`,
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Cancelled.'));
        return;
      }

      fs.unlinkSync(pipeFile);
      console.log(chalk.green('✓') + ` Removed pipe: ${chalk.cyan(name)}`);
    } catch (error) {
      console.error(chalk.red('Error removing pipe:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Generate a pipe operation template
   * @param {string} name - Pipe name
   * @param {string} description - Pipe description
   * @returns {string} Template code
   */
  static generatePipeTemplate(name, description) {
    return `/**
 * Custom Pipe Operation: ${name}
 * ${description || 'Description: Add your description here'}
 * 
 * This pipe operation is automatically loaded by geese.
 * 
 * @param {any} value - The input value from the previous pipe operation or initial value
 * @param {string[]} args - Array of arguments passed to the pipe operation
 * @param {Object} context - The context object containing all properties
 * @returns {any} The output value that will be passed to the next pipe or stored
 * 
 * Example usage in .geese file:
 *   my_var: "initial value" ~> ${name} arg1 arg2
 */

module.exports = function ${name}(value, args, context) {
  // TODO: Implement your pipe operation logic here
  
  // Example: Convert value to uppercase and append arguments
  // const result = String(value).toUpperCase();
  // if (args.length > 0) {
  //   return result + ' ' + args.join(' ');
  // }
  // return result;
  
  // For now, just return the value unchanged
  return value;
};

// Alternative export format with metadata:
// module.exports = {
//   name: '${name}',
//   description: '${description || 'Add description'}',
//   fn: function(value, args, context) {
//     return value;
//   }
// };
`;
  }

  /**
   * Show help for pipe operations
   */
  static showHelp() {
    console.log(`
${chalk.bold('geese pipe')} - Manage custom pipe operations

${chalk.cyan('Usage:')}
  geese pipe list                    List all available pipe operations
  geese pipe new <name>              Create a new custom pipe operation
  geese pipe remove <name>           Remove a custom pipe operation

${chalk.cyan('Options:')}
  -d, --description <text>           Description for the new pipe
  -f, --force                        Overwrite existing pipe without confirmation

${chalk.cyan('Examples:')}
  geese pipe list
  geese pipe new myPipe -d "My custom operation"
  geese pipe remove myPipe

${chalk.cyan('Pipe Operations in .geese Files:')}
  
  User properties support pipe operations using the ~> operator:
  
  ${chalk.gray('---')}
  ${chalk.gray('$include:')}
  ${chalk.gray('  - "src/**/*.js"')}
  ${chalk.gray('$recipe: "code-review"')}
  ${chalk.gray('my_value: "  hello world  " ~> trim ~> toUpperCase')}
  ${chalk.gray('file_content: "./data.txt" ~> readFile')}
  ${chalk.gray('list_items: "a,b,c" ~> split , ~> join " | "')}
  ${chalk.gray('---')}

${chalk.cyan('Built-in Operations:')}
  String:     trim, substring, toUpperCase, toLowerCase, replace, split, join
  File:       readFile, loadFile
  Regex:      match, test
  List:       filter, map, select, first, last, length
  Type:       parseJson, stringify, parseYaml, parseInt, parseFloat
  Utility:    default, echo

${chalk.cyan('Custom Pipe Location:')}
  ${chalk.gray(this.getPipesDirectory())}
    `);
  }
}

module.exports = PipeCLI;
