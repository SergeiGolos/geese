const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');
const matter = require('gray-matter');
const Wizard = require('../../src/wizard');
const { launchEditor } = require('../utils/editor-launcher');

/**
 * New command handler
 * Creates a new .geese file with optional wizard for configuration
 * 
 * @param {Container} container - Service container
 * @param {string} name - Name of the file to create
 * @param {Object} options - Command options
 */
async function newCommand(container, name, options) {
  const { tool, output } = options;
  
  // Get services from container
  const toolRegistry = container.get('toolRegistry');
  const configManager = container.get('configManager');
  const geeseFileFinder = container.get('geeseFileFinder');
  
  // Validate tool
  if (!toolRegistry.has(tool)) {
    throw new Error(`Unknown tool: ${tool}. Available: ${toolRegistry.getToolNames().join(', ')}`);
  }
  
  // Get tool runner for defaults
  const runner = toolRegistry.getRunner(tool);
  const toolConfig = await configManager.getToolConfig(tool);
  
  // Get default frontmatter and merge with config
  const defaultFrontmatter = runner.getDefaultFrontmatter();
  let frontmatter = { ...defaultFrontmatter, ...toolConfig };
  
  // Run wizard if --wizard flag is present
  if (options.wizard) {
    const wizard = new Wizard(runner);
    frontmatter = await wizard.run(frontmatter);
  }
  
  // Get default template
  const template = runner.getDefaultTemplate();
  
  // Determine output directory - default to .geese/ directory
  const workingDir = process.cwd();
  const outputDir = output 
    ? path.resolve(workingDir, output)
    : geeseFileFinder.getDefaultOutputDir(workingDir);
  
  // Ensure output directory exists
  await fs.ensureDir(outputDir);
  
  // Create .geese file
  const filename = name.endsWith('.geese') ? name : `${name}.geese`;
  const filepath = path.join(outputDir, filename);
  
  // Check if file already exists
  if (await fs.pathExists(filepath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `File ${filename} already exists. Overwrite?`,
        default: false
      }
    ]);
    
    if (!overwrite) {
      console.log(chalk.yellow('Cancelled.'));
      return;
    }
  }
  
  // Build file content with frontmatter
  const fileContent = matter.stringify(template, frontmatter);
  
  // Write file
  await fs.writeFile(filepath, fileContent, 'utf8');
  
  console.log(chalk.green(`✓ Created ${filename}`));
  console.log(chalk.gray(`  Path: ${filepath}`));
  console.log(chalk.gray(`  Tool: ${tool}`));
  
  // Show hint about directory structure
  if (outputDir.endsWith('.geese')) {
    console.log(chalk.gray(`\nℹ  Files in .geese/ directory are discovered automatically`));
  }
  
  // Open in editor if --edit flag is present
  if (options.edit) {
    console.log(chalk.blue('\nOpening file in editor...'));
    await launchEditor(filepath);
    console.log(chalk.green('✓ Editor closed'));
  }
}

module.exports = newCommand;
