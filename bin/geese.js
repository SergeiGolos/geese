#!/usr/bin/env node

/**
 * @fileoverview Main CLI entry point for the Geese tool.
 * Provides commands for managing .geese files, configuration, custom pipes, and tool runners.
 * Supports AI-powered file processing and transformation workflows.
 */

const { Command } = require('commander');
const chalk = require('chalk').default || require('chalk');

// Import our modules
const PipeCLI = require('../src/pipe-cli');
const RunnerCLI = require('../src/runner-cli');
const { createContainer } = require('../src/container-setup');

// Create global service container
const container = createContainer();

// Import command handlers
const configCommand = require('./commands/config-command');
const newCommand = require('./commands/new-command');
const runCommand = require('./commands/run-command-simple');
const { launchEditor } = require('./utils/editor-launcher');

const program = new Command();

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
      await configCommand(container, options);
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
      await newCommand(container, name, options);
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
        await PipeCLI.listPipes(container, options.sources);
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

// Runner command
const runnerCommand = program
  .command('runner <action> [name]')
  .description('Manage custom tool runners')
  .option('-d, --description <text>', 'Description for new runner')
  .option('-f, --force', 'Overwrite existing runner without confirmation')
  .option('--local', 'Create/remove in local .geese directory instead of global')
  .option('-s, --sources', 'Show runner sources (for list action)')
  .option('--edit', 'Open the created runner files in editor (for new action)')
  .action(async (action, name, options) => {
    try {
      if (action === 'list') {
        await RunnerCLI.listRunners(container, options.sources);
      } else if (action === 'new' && name) {
        const files = await RunnerCLI.createRunner(name, options);
        
        // Open in editor if --edit flag is present and files were created
        if (options.edit && files) {
          console.log(chalk.blue('\nOpening runner files in editor...'));
          await launchEditor(files.providerFile);
          await launchEditor(files.runnerFile);
          console.log(chalk.green('✓ Editor closed'));
        }
      } else if (action === 'remove' && name) {
        await RunnerCLI.removeRunner(name, options);
      } else if (action === 'help') {
        RunnerCLI.showHelp();
      } else {
        console.error(chalk.red('Invalid runner command'));
        console.log('Usage: geese runner <list|new|remove|help> [name]');
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
  .option('--dry-run-file <file>', 'Dry-run and write command details to file')
  .option('--debug-config', 'Show configuration hierarchy debug information')
  .action(async (directory, options) => {
    try {
      await runCommand(container, directory || '.', options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });



// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled error:'), reason);
  process.exit(1);
});

program.parse();
