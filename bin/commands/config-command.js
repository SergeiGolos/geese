const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk').default || require('chalk');
const ConfigManager = require('../../src/config-manager');
const { launchEditor } = require('../utils/editor-launcher');

/**
 * Config command handler
 * Manages configuration settings including global and local configurations
 */
async function configCommand(options) {
  const configManager = new ConfigManager();

  if (options.edit) {
    const configPath = configManager.getConfigPath();
    
    // Ensure config file exists
    if (!await fs.pathExists(configPath)) {
      // Create default config
      const config = await configManager.loadConfig();
      await configManager.saveConfig(config);
      console.log(chalk.green(`✓ Created configuration file: ${configPath}`));
    }
    
    console.log(chalk.blue('Opening configuration file in editor...'));
    await launchEditor(configPath);
    console.log(chalk.green('✓ Editor closed'));
    return;
  }

  if (options.initLocal) {
    const workingDir = process.cwd();
    const localConfigDir = await configManager.createLocalConfig(workingDir);
    const localConfigPath = path.join(localConfigDir, 'config.json');
    console.log(chalk.green(`✓ Initialized local configuration`));
    console.log(chalk.gray(`  Location: ${localConfigPath}`));
    
    // If --edit flag is present along with --init-local, open the file
    if (options.edit) {
      console.log(chalk.blue('\nOpening local configuration file in editor...'));
      await launchEditor(localConfigPath);
      console.log(chalk.green('✓ Editor closed'));
    } else {
      console.log(chalk.gray('\nEdit this file to add project-specific settings.'));
      console.log(chalk.gray('Tip: Use "geese config --edit" to open the global config in your editor'));
    }
    return;
  }

  if (options.inspect !== undefined) {
    const workingDir = typeof options.inspect === 'string' ? options.inspect : process.cwd();
    const hierarchicalConfig = await configManager.loadHierarchicalConfig(workingDir);
    
    console.log(chalk.blue('📊 Configuration Hierarchy'));
    console.log(chalk.gray(`Working Directory: ${workingDir}\n`));
    
    // Show sources
    console.log(chalk.cyan('Configuration Sources:'));
    console.log(chalk.gray('  0. Core Defaults (built-in)'));
    console.log(chalk.gray(`  1. Global: ${configManager.globalConfigFile}`));
    const localConfigDir = configManager.getLocalConfigDir(workingDir);
    if (localConfigDir) {
      console.log(chalk.gray(`  2. Local: ${path.join(localConfigDir, 'config.json')}`));
    } else {
      console.log(chalk.gray('  2. Local: (not configured)'));
    }
    console.log(chalk.gray('  3. .geese File: (varies per file)'));
    console.log(chalk.gray('  4. CLI Arguments: (runtime overrides)\n'));
    
    // Show merged config
    console.log(chalk.cyan('Effective Configuration:'));
    console.log(JSON.stringify(hierarchicalConfig.config, null, 2));
    return;
  }

  if (options.show) {
    const workingDir = process.cwd();
    const hierarchicalConfig = await configManager.loadHierarchicalConfig(workingDir);
    
    console.log(chalk.blue('Effective Configuration:'));
    console.log(JSON.stringify(hierarchicalConfig.config, null, 2));
    return;
  }

  if (options.list) {
    const config = await configManager.loadConfig();
    console.log(chalk.blue('Current configuration:'));
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (options.get) {
    const value = await configManager.get(options.get);
    if (value === undefined) {
      console.log(chalk.yellow(`No value found for key: ${options.get}`));
    } else {
      console.log(JSON.stringify(value, null, 2));
    }
    return;
  }

  if (options.set) {
    const setIndex = process.argv.indexOf('--set');
    if (setIndex === -1 || setIndex >= process.argv.length - 2) {
      throw new Error('--set requires both key and value arguments');
    }
    
    const [key, ...valueParts] = process.argv.slice(setIndex + 1);
    let value = valueParts.join(' ');
    
    // Try to parse as JSON for objects/arrays/numbers/booleans
    try {
      value = JSON.parse(value);
    } catch (e) {
      // Keep as string if not valid JSON
    }
    
    await configManager.set(key, value);
    console.log(chalk.green(`✓ Set ${key} = ${JSON.stringify(value)}`));
    console.log(chalk.gray(`Config saved to: ${configManager.getConfigPath()}`));
    return;
  }

  if (options.delete) {
    await configManager.delete(options.delete);
    console.log(chalk.green(`✓ Deleted ${options.delete}`));
    return;
  }

  // No options provided, show current config
  const config = await configManager.loadConfig();
  console.log(chalk.blue('Current configuration:'));
  console.log(JSON.stringify(config, null, 2));
  console.log(chalk.gray(`\nConfig file: ${configManager.getConfigPath()}`));
  console.log(chalk.gray('\nUsage:'));
  console.log(chalk.gray('  geese config --list'));
  console.log(chalk.gray('  geese config --get <key>'));
  console.log(chalk.gray('  geese config --set <key> <value>'));
  console.log(chalk.gray('  geese config --delete <key>'));
  console.log(chalk.gray('  geese config --inspect [directory]'));
  console.log(chalk.gray('  geese config --show'));
  console.log(chalk.gray('  geese config --init-local'));
}

module.exports = configCommand;
