#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');
const matter = require('gray-matter');
const { spawn } = require('child_process');

// Import our modules
const ConfigManager = require('../src/config-manager');
const ToolRegistry = require('../src/tool-registry');
const GeeseParser = require('../src/geese-parser');
const ReportGenerator = require('../src/report-generator');
const PipeCLI = require('../src/pipe-cli');
const GeeseFileFinder = require('../src/geese-file-finder');
const CLIArgumentParser = require('../src/cli-argument-parser');
const Wizard = require('../src/wizard');

const program = new Command();

/**
 * Check if a command is available in the system
 * Cross-platform alternative to 'which' command
 * @param {string} command - Command to check
 * @returns {Promise<boolean>}
 */
async function isCommandAvailable(command) {
  return new Promise((resolve) => {
    const testProc = spawn(command, ['--version'], { 
      stdio: 'pipe',
      shell: false 
    });
    testProc.on('close', (code) => resolve(code === 0));
    testProc.on('error', () => resolve(false));
  });
}

/**
 * Launch file editor for a given file path
 * Uses $VISUAL or $EDITOR environment variable, or falls back to common editors
 * @param {string} filePath - Path to file to edit
 * @returns {Promise<void>}
 */
async function launchEditor(filePath) {
  // Determine editor to use
  const editor = process.env.VISUAL || process.env.EDITOR;
  
  if (!editor) {
    // Try common editors (works on Unix-like systems)
    const commonEditors = ['nano', 'vim', 'vi', 'emacs'];
    
    console.log(chalk.yellow('⚠️  No $EDITOR or $VISUAL environment variable set.'));
    console.log(chalk.gray('   Available editors will be checked in this order: ' + commonEditors.join(', ')));
    
    // Check which editor is available
    let availableEditor = null;
    for (const ed of commonEditors) {
      if (await isCommandAvailable(ed)) {
        availableEditor = ed;
        break;
      }
    }
    
    if (!availableEditor) {
      console.log(chalk.yellow('   No common editors found. Please set $EDITOR or $VISUAL.'));
      console.log(chalk.gray(`   File location: ${filePath}`));
      return;
    }
    
    console.log(chalk.green(`   Using: ${availableEditor}`));
    
    // Launch the editor
    return new Promise((resolve, reject) => {
      const editorProc = spawn(availableEditor, [filePath], {
        stdio: 'inherit',
        shell: false
      });
      
      editorProc.on('exit', (code) => {
        if (code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`Editor exited with code ${code}`));
        }
      });
      
      editorProc.on('error', (err) => {
        reject(new Error(`Failed to launch editor: ${err.message}`));
      });
    });
  } else {
    // Use specified editor - use shell mode to properly handle complex editor commands
    // This allows editors like "code --wait" or even shell scripts to work correctly
    return new Promise((resolve, reject) => {
      // Use shell mode to properly parse the editor command with arguments
      // This handles quoted strings and complex commands correctly
      const editorProc = spawn(editor, [filePath], {
        stdio: 'inherit',
        shell: true
      });
      
      editorProc.on('exit', (code) => {
        if (code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`Editor exited with code ${code}`));
        }
      });
      
      editorProc.on('error', (err) => {
        reject(new Error(`Failed to launch editor: ${err.message}`));
      });
    });
  }
}

program
  .name('geese')
  .description('CLI tool for processing .geese files with AI-powered transformations')
  .version('1.0.0');

// Config command
program
  .command('config')
  .description('Manage configuration settings')
  .option('--get <key>', 'Get a configuration value')
  .option('--set <key> <value>', 'Set a configuration value')
  .option('--delete <key>', 'Delete a configuration value')
  .option('--list', 'List all configuration')
  .option('--inspect [directory]', 'Show configuration hierarchy')
  .option('--show', 'Show effective configuration for current directory')
  .option('--init-local', 'Initialize local project configuration')
  .option('--edit', 'Open configuration file in editor')
  .action(async (options) => {
    try {
      await configCommand(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// New command
program
  .command('new <name>')
  .description('Create a new .geese file (defaults to .geese/ directory)')
  .option('-t, --tool <tool>', 'CLI tool to use (default: goose)', 'goose')
  .option('-o, --output <dir>', 'Output directory (default: .geese/)')
  .option('--wizard', 'Interactive wizard to configure system properties')
  .option('--edit', 'Open the created file in editor')
  .action(async (name, options) => {
    try {
      await newCommand(name, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Pipe command
const pipeCommand = program
  .command('pipe <action> [name]')
  .description('Manage custom pipe operations')
  .option('-d, --description <text>', 'Description for new pipe')
  .option('-f, --force', 'Overwrite existing pipe without confirmation')
  .option('-s, --sources', 'Show operation sources (for list action)')
  .option('--edit', 'Open the created pipe file in editor (for new action)')
  .action(async (action, name, options) => {
    try {
      if (action === 'list') {
        await PipeCLI.listPipes(options.sources);
      } else if (action === 'new' && name) {
        const pipeFile = await PipeCLI.createPipe(name, options);
        
        // Open in editor if --edit flag is present and file was created
        if (options.edit && pipeFile) {
          console.log(chalk.blue('\nOpening pipe file in editor...'));
          await launchEditor(pipeFile);
          console.log(chalk.green('✓ Editor closed'));
        }
      } else if (action === 'remove' && name) {
        await PipeCLI.removePipe(name);
      } else if (action === 'help') {
        PipeCLI.showHelp();
      } else {
        console.error(chalk.red('Invalid pipe command'));
        console.log('Usage: geese pipe <list|new|remove|help> [name]');
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Run command (can be used explicitly or as default)
const runCommandDefinition = program
  .command('run [directory]', { isDefault: true })
  .description('Process .geese files (discovers from global, local, and root)')
  .option('-f, --file <file>', 'Process a specific .geese file')
  .option('-o, --output <dir>', 'Output directory for logs (default: "./logs")')
  .option('-g, --goose-path <path>', 'Path to goose executable')
  .option('--dry-run', 'Show what would be processed without executing')
  .option('--debug-config', 'Show configuration hierarchy debug information')
  .action(async (directory, options) => {
    try {
      await runCommand(directory || '.', options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

/**
 * Config command handler
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

/**
 * New command handler
 */
async function newCommand(name, options) {
  const { tool, output } = options;
  
  // Validate tool
  if (!ToolRegistry.has(tool)) {
    throw new Error(`Unknown tool: ${tool}. Available: ${ToolRegistry.getToolNames().join(', ')}`);
  }
  
  // Get tool runner for defaults
  const runner = ToolRegistry.getRunner(tool);
  const configManager = new ConfigManager();
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
    : GeeseFileFinder.getDefaultOutputDir(workingDir);
  
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

/**
 * Run command handler
 */
async function runCommand(directory, options) {
  console.log(chalk.blue('🦢 Geese - AI-powered file processing tool'));
  const workingDir = path.resolve(directory);
  console.log(chalk.gray(`Working directory: ${workingDir}`));
  
  // Parse CLI arguments into config overrides
  const cliConfig = CLIArgumentParser.parseToConfig(process.argv);
  
  // Load hierarchical configuration
  const configManager = new ConfigManager();
  const hierarchicalConfig = await configManager.loadHierarchicalConfig(workingDir, {}, cliConfig);
  const config = hierarchicalConfig.config;
  
  // Show debug info if requested
  if (options.debugConfig || cliConfig.debugConfig) {
    console.log(chalk.cyan('\n🔍 Configuration Debug Info:'));
    console.log(JSON.stringify(hierarchicalConfig, null, 2));
    console.log();
  }
  
  // Initialize components
  const parser = new GeeseParser();
  const pipeOps = require('../src/pipe-operations');
  
  // Initialize pipe operations with hierarchical loading
  await pipeOps.initializeHierarchy(workingDir);
  
  // Also load from old location for backward compatibility
  const homeDir = require('os').homedir();
  const pipesDir = path.join(homeDir, '.geese', 'pipes');
  parser.loadCustomPipes(pipesDir);
  
  const reportGenerator = new ReportGenerator(options.output || './logs');
  
  // Determine tool and get runner
  const tool = config.defaultTool || 'goose';
  const toolRunner = ToolRegistry.getRunner(tool);
  
  // Apply config overrides
  const toolConfig = config[tool] || {};
  if (options.goosePath || toolConfig.path) {
    toolRunner.setPath(options.goosePath || toolConfig.path);
  }
  
  // Check if tool is available (unless dry run)
  if (!options.dryRun) {
    const isAvailable = await toolRunner.checkAvailable();
    if (!isAvailable) {
      console.log(chalk.yellow(`⚠️  Warning: ${tool} not found in PATH.`));
      const { continueAnyway } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueAnyway',
          message: 'Continue in dry-run mode?',
          default: true
        }
      ]);
      
      if (continueAnyway) {
        options.dryRun = true;
      } else {
        process.exit(1);
      }
    }
  }
  
  // Find .geese files
  let geeseFiles = [];
  
  if (options.file) {
    // Process specific file
    const filePath = path.resolve(workingDir, options.file);
    if (!await fs.pathExists(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    geeseFiles = [filePath];
    console.log(chalk.blue(`📄 Processing file: ${path.basename(filePath)}`));
  } else {
    // Use hierarchical file discovery
    geeseFiles = await GeeseFileFinder.discoverGeeseFiles(workingDir);
    
    // Fallback to old method if no files found with new method
    if (geeseFiles.length === 0) {
      geeseFiles = parser.findGeeseFiles(workingDir);
    }
    
    if (geeseFiles.length === 0) {
      console.log(chalk.yellow('No .geese files found in the specified directory.'));
      console.log(chalk.gray('Tip: Use "geese new <name>" to create a new .geese file'));
      return;
    }
    
    // Auto-run if only one file
    if (geeseFiles.length === 1) {
      console.log(chalk.blue(`📄 Found one .geese file: ${path.basename(geeseFiles[0])}`));
    } else {
      // Show selection screen for multiple files
      console.log(chalk.blue(`📋 Found ${geeseFiles.length} .geese file(s)`));
      
      const { selectedFiles } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedFiles',
          message: 'Select .geese files to process:',
          choices: geeseFiles.map(file => ({
            name: `${path.basename(file)} (${getFileSize(file)})`,
            value: file,
            checked: false
          })),
          pageSize: 10,
          validate: (answer) => {
            if (answer.length === 0) {
              return 'You must select at least one file';
            }
            return true;
          }
        }
      ]);
      
      geeseFiles = selectedFiles;
    }
  }
  
  if (geeseFiles.length === 0) {
    console.log(chalk.yellow('No files selected for processing.'));
    return;
  }
  
  // Process each .geese file
  const allSessions = [];
  
  for (const geeseFile of geeseFiles) {
    console.log(chalk.blue(`\n📖 Processing: ${path.basename(geeseFile)}`));
    
    try {
      // Parse .geese file with base configuration from hierarchy
      const baseConfig = hierarchicalConfig.config[tool] || {};
      const geeseData = parser.parseGeeseFile(geeseFile, baseConfig);
      parser.validateGeeseFile(geeseData.frontmatter);
      
      // Collect target files
      const targetFiles = parser.collectTargetFiles(
        geeseData.frontmatter,
        path.dirname(geeseFile)
      );
      
      if (targetFiles.length === 0) {
        console.log(chalk.yellow('  ⚠️  No target files found'));
        continue;
      }
      
      console.log(chalk.green(`  📁 Found ${targetFiles.length} target file(s)`));
      
      // Show target file selection
      let selectedTargets = targetFiles;
      if (targetFiles.length > 1) {
        const { targets } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'targets',
            message: 'Select target files to process:',
            choices: targetFiles.map(file => ({
              name: `${path.relative(path.dirname(geeseFile), file)} (${getFileSize(file)})`,
              value: file,
              checked: true
            })),
            pageSize: 10
          }
        ]);
        
        selectedTargets = targets;
      }
      
      if (selectedTargets.length === 0) {
        console.log(chalk.yellow('  No target files selected'));
        continue;
      }
      
      // Process selected target files
      for (const targetFile of selectedTargets) {
        const relativePath = path.relative(path.dirname(geeseFile), targetFile);
        console.log(chalk.cyan(`  🔄 Processing: ${relativePath}`));
        
        const session = await processTargetFile(
          parser,
          toolRunner,
          reportGenerator,
          geeseData,
          targetFile,
          options.dryRun
        );
        
        if (session) {
          allSessions.push(session);
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`  ❌ Error: ${error.message}`));
    }
  }
  
  // Generate final report
  if (allSessions.length > 0) {
    console.log(chalk.blue('\n📊 Generating report...'));
    const report = await reportGenerator.saveReport(allSessions);
    console.log(chalk.green(`✅ Complete! Processed ${allSessions.length} session(s)`));
    console.log(chalk.gray(`   Report: ${report}`));
  } else {
    console.log(chalk.yellow('\n⚠️  No sessions were processed'));
  }
}

/**
 * Process a single target file
 */
async function processTargetFile(parser, toolRunner, reportGenerator, geeseData, targetFile, dryRun = false) {
  const startTime = Date.now();
  
  reportGenerator.logSessionStart(geeseData.filePath, targetFile);
  
  try {
    // Prepare context
    const context = parser.prepareContext(geeseData, targetFile);
    
    // Generate prompt
    const prompt = parser.renderTemplate(geeseData.template, context);
    
    if (dryRun) {
      console.log(chalk.cyan(`    📝 Dry run - prompt preview:`));
      console.log(chalk.gray('    ' + prompt.substring(0, 150).replace(/\n/g, '\n    ') + '...'));
      return null;
    }
    
    // Execute tool
    const result = await toolRunner.processFile(targetFile, prompt, context._gooseConfig);
    const endTime = Date.now();
    
    // Create session entry
    const session = reportGenerator.createSessionEntry(
      geeseData.filePath,
      targetFile,
      context,
      prompt,
      result.success ? result.output : result.error,
      startTime,
      endTime
    );
    
    session.success = result.success;
    
    reportGenerator.logSessionEnd(
      geeseData.filePath,
      targetFile,
      endTime - startTime,
      result.success
    );
    
    return session;
    
  } catch (error) {
    const endTime = Date.now();
    console.error(chalk.red(`    ❌ Error: ${error.message}`));
    
    const session = reportGenerator.createSessionEntry(
      geeseData.filePath,
      targetFile,
      {},
      '',
      error.message,
      startTime,
      endTime
    );
    
    session.success = false;
    
    reportGenerator.logSessionEnd(
      geeseData.filePath,
      targetFile,
      endTime - startTime,
      false
    );
    
    return session;
  }
}

/**
 * Get human-readable file size
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const bytes = stats.size;
    
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  } catch {
    return 'unknown';
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled error:'), reason);
  process.exit(1);
});

program.parse();
