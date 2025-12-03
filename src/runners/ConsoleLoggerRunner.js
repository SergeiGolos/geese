const IAIToolRunner = require('../interfaces/IAIToolRunner');
const chalk = require('chalk').default || require('chalk');

/**
 * Console logger runner implementation
 * Logs command details to console for dry-run mode (no file output)
 * 
 * @class
 * @extends IAIToolRunner
 */
class ConsoleLoggerRunner extends IAIToolRunner {
  /**
   * Execute a command by logging details to console
   * 
   * @param {string} executablePath - Path to executable
   * @param {string[]} args - Command-line arguments
   * @param {string} stdin - Input to send to stdin
   * @param {Object} [options] - Execution options (unused in console logger)
   * 
   * @returns {Promise<Object>} Execution result
   */
  async execute(executablePath, args, stdin, options = {}) {
    const startTime = Date.now();
    
    console.log(chalk.cyan('\n📋 Dry-Run Mode (Console Output)'));
    console.log(chalk.gray('─'.repeat(60)));
    
    console.log(chalk.blue('\n🔧 Command:'));
    console.log(chalk.gray(`  ${executablePath} ${args.join(' ')}`));
    
    console.log(chalk.blue('\n📥 Arguments:'));
    if (args.length === 0) {
      console.log(chalk.gray('  (none)'));
    } else {
      args.forEach((arg, index) => {
        console.log(chalk.gray(`  [${index}] ${arg}`));
      });
    }
    
    console.log(chalk.blue('\n📝 Standard Input (stdin):'));
    if (!stdin || stdin.trim().length === 0) {
      console.log(chalk.gray('  (empty)'));
    } else {
      const lines = stdin.split('\n');
      const preview = lines.slice(0, 10);
      const remaining = lines.length - preview.length;
      
      preview.forEach((line, index) => {
        console.log(chalk.gray(`  ${String(index + 1).padStart(3)} | ${line}`));
      });
      
      if (remaining > 0) {
        console.log(chalk.gray(`  ... (${remaining} more lines)`));
      }
      
      console.log(chalk.gray(`\n  Total: ${lines.length} lines, ${stdin.length} characters`));
    }
    
    console.log(chalk.gray('\n' + '─'.repeat(60)));
    console.log(chalk.green('✓ Dry-run complete (no actual execution)'));
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      success: true,
      stdout: '[DRY-RUN] Command logged to console',
      stderr: '',
      exitCode: 0,
      duration
    };
  }

  /**
   * Check if the tool is available (always returns true for dry-run)
   * @param {string} executablePath - Path to executable to check
   * @returns {Promise<boolean>} Always returns true
   */
  async checkAvailable(executablePath) {
    return true;
  }
}

module.exports = ConsoleLoggerRunner;
