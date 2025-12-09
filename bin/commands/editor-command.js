/**
 * @fileoverview Editor command handler
 * Launches the web-based editor interface for Geese
 */

const chalk = require('chalk').default || require('chalk');
const { startEditorServer } = require('../../src/editor/server');
const path = require('path');

/**
 * Open URL in default browser
 * @param {string} url - URL to open
 */
function openBrowser(url) {
  const platform = process.platform;
  let command;
  let args;

  // Validate URL to prevent injection
  if (!url.startsWith('http://localhost:') && !url.startsWith('http://127.0.0.1:')) {
    console.log(chalk.yellow(`Invalid URL. Please open manually: ${url}`));
    return;
  }

  if (platform === 'darwin') {
    command = 'open';
    args = [url];
  } else if (platform === 'win32') {
    command = 'cmd.exe';
    args = ['/c', 'start', url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  const { spawn } = require('child_process');
  const proc = spawn(command, args, { detached: true, stdio: 'ignore' });
  proc.unref();
  proc.on('error', (error) => {
    console.log(chalk.yellow(`Could not open browser automatically. Please open: ${url}`));
  });
}

/**
 * Editor command handler
 * @param {Object} container - Dependency injection container
 * @param {string} directory - Project directory
 * @param {Object} options - Command options
 */
async function editorCommand(container, directory, options) {
  console.log(chalk.blue('🦢 Starting Geese Editor...'));
  
  const port = options.port || 3000;
  const projectDir = path.resolve(directory || '.');
  const noBrowser = options.noBrowser || false;

  try {
    const { server, url } = await startEditorServer(container, {
      port,
      directory: projectDir
    });

    // Open browser unless --no-browser flag is set
    if (!noBrowser) {
      setTimeout(() => {
        openBrowser(url);
      }, 1000);
    }

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\nShutting down Geese Editor...'));
      server.close(() => {
        console.log(chalk.green('✓ Editor closed'));
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      server.close(() => {
        process.exit(0);
      });
    });

  } catch (error) {
    console.error(chalk.red('Error starting editor:'), error.message);
    process.exit(1);
  }
}

module.exports = editorCommand;
