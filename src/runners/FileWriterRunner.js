const IAIToolRunner = require('../interfaces/IAIToolRunner');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk').default || require('chalk');

/**
 * File writer runner implementation
 * Writes command details to a file for dry-run mode with file output
 * Uses frontmatter format for command arguments and body for stdin
 * 
 * @class
 * @extends IAIToolRunner
 */
class FileWriterRunner extends IAIToolRunner {
  /**
   * Create a FileWriterRunner
   * @param {string} outputPath - Path to output file
   */
  constructor(outputPath) {
    super();
    this.outputPath = outputPath;
  }

  /**
   * Execute a command by writing details to a file
   * 
   * @param {string} executablePath - Path to executable
   * @param {string[]} args - Command-line arguments
   * @param {string} stdin - Input to send to stdin
   * @param {Object} [options] - Execution options (unused in file writer)
   * 
   * @returns {Promise<Object>} Execution result
   */
  async execute(executablePath, args, stdin, options = {}) {
    const startTime = Date.now();
    
    // Build frontmatter for command arguments
    const frontmatter = {
      executable: executablePath,
      args: args,
      timestamp: new Date().toISOString(),
      mode: 'dry-run'
    };
    
    // Build file content with frontmatter and body
    const content = this._buildFileContent(frontmatter, stdin);
    
    // Ensure output directory exists
    await fs.ensureDir(path.dirname(this.outputPath));
    
    // Write to file
    await fs.writeFile(this.outputPath, content, 'utf-8');
    
    console.log(chalk.cyan('\n📋 Dry-Run Mode (File Output)'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.blue('\n🔧 Command:'));
    console.log(chalk.gray(`  ${executablePath} ${args.join(' ')}`));
    console.log(chalk.blue('\n💾 Output file:'));
    console.log(chalk.gray(`  ${this.outputPath}`));
    console.log(chalk.gray('\n' + '─'.repeat(60)));
    console.log(chalk.green(`✓ Dry-run complete (command written to file)`));
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      success: true,
      stdout: `[DRY-RUN] Command written to: ${this.outputPath}`,
      stderr: '',
      exitCode: 0,
      duration
    };
  }

  /**
   * Build file content with frontmatter and body
   * @private
   * @param {Object} frontmatter - Frontmatter data
   * @param {string} body - Body content (stdin)
   * @returns {string} Complete file content
   */
  _buildFileContent(frontmatter, body) {
    const frontmatterYaml = this._objectToYaml(frontmatter);
    
    return `---
${frontmatterYaml}---

${body || '(no stdin content)'}
`;
  }

  /**
   * Convert object to YAML format
   * @private
   * @param {Object} obj - Object to convert
   * @param {number} indent - Indentation level
   * @returns {string} YAML string
   */
  _objectToYaml(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    let yaml = '';
    
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach(item => {
          if (typeof item === 'object') {
            yaml += `${spaces}  -\n`;
            yaml += this._objectToYaml(item, indent + 2).replace(/^/gm, '  ');
          } else {
            yaml += `${spaces}  - ${this._escapeYamlValue(item)}\n`;
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        yaml += `${spaces}${key}:\n`;
        yaml += this._objectToYaml(value, indent + 1);
      } else {
        yaml += `${spaces}${key}: ${this._escapeYamlValue(value)}\n`;
      }
    }
    
    return yaml;
  }

  /**
   * Escape YAML value if needed
   * @private
   * @param {*} value - Value to escape
   * @returns {string} Escaped value
   */
  _escapeYamlValue(value) {
    if (value === null || value === undefined) {
      return 'null';
    }
    
    const str = String(value);
    
    // Quote if contains special characters
    if (str.includes(':') || str.includes('#') || str.includes('\n')) {
      return `"${str.replace(/"/g, '\\"')}"`;
    }
    
    return str;
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

module.exports = FileWriterRunner;
