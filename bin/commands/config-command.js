const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk').default || require('chalk');
const { launchEditor } = require('../utils/editor-launcher');

/**
 * Config command handler
 * Manages configuration settings including global and local configurations
 * 
 * @param {Container} container - Service container
 * @param {Object} options - Command options
 */
async function configCommand(container, options) {
  const configManager = container.get('configManager');

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
    const SimpleUI = require('../../src/simple-ui');
    const workingDir = typeof options.inspect === 'string' ? options.inspect : process.cwd();
    const hierarchicalConfig = await configManager.loadHierarchicalConfig(workingDir);
    
    // Build content for display
    let content = `{gray-fg}Working Directory: ${workingDir}{/gray-fg}\n\n`;
    
    // Show sources
    content += '{cyan-fg}Configuration Sources:{/cyan-fg}\n';
    content += '  0. Core Defaults (built-in)\n';
    content += `  1. Global: ${configManager.globalConfigFile}\n`;
    const localConfigDir = configManager.getLocalConfigDir(workingDir);
    if (localConfigDir) {
      content += `  2. Local: ${path.join(localConfigDir, 'config.json')}\n`;
    } else {
      content += '  2. Local: (not configured)\n';
    }
    content += '  3. .geese File: (varies per file)\n';
    content += '  4. CLI Arguments: (runtime overrides)\n\n';
    
    // Show merged config
    content += '{cyan-fg}Effective Configuration:{/cyan-fg}\n';
    content += JSON.stringify(hierarchicalConfig.config, null, 2);
    
    await SimpleUI.showBox('📊 Configuration Hierarchy', content);
    return;
  }

  if (options.show) {
    const SimpleUI = require('../../src/simple-ui');
    const workingDir = process.cwd();
    const hierarchicalConfig = await configManager.loadHierarchicalConfig(workingDir);
    
    await SimpleUI.showConfig('Effective Configuration', hierarchicalConfig.config);
    return;
  }

  if (options.list) {
    const SimpleUI = require('../../src/simple-ui');
    const config = await configManager.loadConfig();
    await SimpleUI.showConfig('Current Configuration', config);
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

  // No options provided, show current config with usage info
  const SimpleUI = require('../../src/simple-ui');
  const config = await configManager.loadConfig();
  
  let content = '{cyan-fg}Configuration:{/cyan-fg}\n';
  content += JSON.stringify(config, null, 2);
  content += `\n\n{gray-fg}Config file: ${configManager.getConfigPath()}{/gray-fg}`;
  content += '\n\n{cyan-fg}Usage:{/cyan-fg}\n';
  content += '  geese config --list\n';
  content += '  geese config --get <key>\n';
  content += '  geese config --set <key> <value>\n';
  content += '  geese config --delete <key>\n';
  content += '  geese config --inspect [directory]\n';
  content += '  geese config --show\n';
  content += '  geese config --init-local';
  
  await SimpleUI.showBox('Current Configuration', content);
}

module.exports = configCommand;
