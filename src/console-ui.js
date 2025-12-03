const readline = require('readline');
const chalk = require('chalk').default || require('chalk');

/**
 * ConsoleUI - A simple terminal UI manager that uses standard console output
 * with a fixed "stream window" at the bottom for real-time output
 * 
 * Design:
 * - Main flow: Regular console.log that scrolls normally
 * - Stream window: Fixed 4-line area at bottom that shows latest stream output
 * - Stream window is cleared when streaming completes
 */
class ConsoleUI {
  constructor(options = {}) {
    this.streamLines = [];
    this.maxStreamLines = options.maxStreamLines || 4;
    this.streamBoxWidth = options.streamBoxWidth || process.stdout.columns || 80;
    this.isStreaming = false;
    this.streamLabel = options.streamLabel || 'Output Stream';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Box Drawing Characters
  // ═══════════════════════════════════════════════════════════════════════════
  
  static BOX = {
    TOP_LEFT: '┌',
    TOP_RIGHT: '┐',
    BOTTOM_LEFT: '└',
    BOTTOM_RIGHT: '┘',
    HORIZONTAL: '─',
    VERTICAL: '│',
    // Double line variants
    D_TOP_LEFT: '╔',
    D_TOP_RIGHT: '╗',
    D_BOTTOM_LEFT: '╚',
    D_BOTTOM_RIGHT: '╝',
    D_HORIZONTAL: '═',
    D_VERTICAL: '║'
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Main Flow Output (permanent, scrolls normally)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Print a boxed header section with colored output
   * @param {string} title - Title for the box
   * @param {Object} data - Key-value pairs to display
   */
  printBox(title, data) {
    const width = this.streamBoxWidth - 2;
    const { TOP_LEFT, TOP_RIGHT, BOTTOM_LEFT, BOTTOM_RIGHT, HORIZONTAL, VERTICAL } = ConsoleUI.BOX;
    
    // Top border with title (cyan border, bold yellow title)
    const titleText = ` ${title} `;
    const titlePad = Math.floor((width - titleText.length) / 2);
    console.log(
      chalk.cyan(TOP_LEFT + HORIZONTAL.repeat(titlePad)) + 
      chalk.yellow.bold(titleText) + 
      chalk.cyan(HORIZONTAL.repeat(width - titlePad - titleText.length) + TOP_RIGHT)
    );
    
    // Content
    for (const [key, value] of Object.entries(data)) {
      const formattedValue = this.formatValueWithPipes(value);
      const line = ` ${chalk.bold.white(key)}: ${formattedValue}`;
      // Calculate visible length (without ANSI codes) for padding
      const visibleLength = ` ${key}: ${this.stripAnsi(formattedValue)}`.length;
      const padding = Math.max(0, width - visibleLength);
      console.log(chalk.cyan(VERTICAL) + line + ' '.repeat(padding) + chalk.cyan(VERTICAL));
    }
    
    // Bottom border
    console.log(chalk.cyan(BOTTOM_LEFT + HORIZONTAL.repeat(width) + BOTTOM_RIGHT));
  }

  /**
   * Format a value, highlighting pipe operations with visual indicators
   * @param {*} value - Value to format
   * @returns {string} Formatted and colored string
   */
  formatValueWithPipes(value) {
    const strValue = this.formatValue(value);
    
    // Check if value contains pipe indicator (~>)
    if (strValue.includes('~>')) {
      // Split on ~> and colorize
      const parts = strValue.split('~>');
      return parts.map((part, i) => {
        if (i === parts.length - 1) {
          return chalk.green(part.trim());
        }
        return chalk.white(part.trim());
      }).join(chalk.magenta.bold(' ⟹  '));
    }
    
    // Color arrays in cyan
    if (Array.isArray(value)) {
      return chalk.cyan(strValue);
    }
    
    // Color objects in gray
    if (typeof value === 'object' && value !== null) {
      return chalk.gray(strValue);
    }
    
    return chalk.white(strValue);
  }

  /**
   * Strip ANSI escape codes from string (for length calculation)
   * @param {string} str - String with potential ANSI codes
   * @returns {string} Clean string
   */
  stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }

  /**
   * Print a simple info line with icon
   * @param {string} icon - Emoji or character icon
   * @param {string} message - Message to print
   */
  printInfo(icon, message) {
    console.log(`${icon} ${chalk.white(message)}`);
  }

  /**
   * Print a section header
   * @param {string} title - Section title
   */
  printHeader(title) {
    const width = this.streamBoxWidth - 4;
    console.log('');
    console.log(chalk.cyan('─'.repeat(3)) + chalk.yellow.bold(` ${title} `) + chalk.cyan('─'.repeat(Math.max(0, width - title.length - 1))));
  }

  /**
   * Print a table row
   * @param {Array} columns - Column values
   * @param {Array} widths - Column widths
   * @param {boolean} isHeader - Whether this is a header row
   */
  printTableRow(columns, widths, isHeader = false) {
    let row = '';
    for (let i = 0; i < columns.length; i++) {
      const col = String(columns[i] || '');
      const width = widths[i] || 15;
      const text = col.substring(0, width).padEnd(width);
      row += isHeader ? chalk.bold.cyan(text) : chalk.white(text);
    }
    console.log(row);
  }

  /**
   * Print a table separator
   * @param {Array} widths - Column widths
   */
  printTableSeparator(widths) {
    console.log(chalk.gray(widths.map(w => '─'.repeat(w)).join('')));
  }

  /**
   * Print success message
   * @param {string} message - Message
   */
  printSuccess(message) {
    console.log(`✅ ${chalk.green(message)}`);
  }

  /**
   * Print error message
   * @param {string} message - Message
   */
  printError(message) {
    console.log(`❌ ${chalk.red(message)}`);
  }

  /**
   * Print warning message
   * @param {string} message - Message
   */
  printWarning(message) {
    console.log(`⚠️  ${chalk.yellow(message)}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Stream Window (temporary, fixed at bottom, shows last N lines)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start the stream window
   * @param {string} label - Label for the stream box
   */
  startStream(label = null) {
    if (label) this.streamLabel = label;
    this.streamLines = [];
    this.isStreaming = true;
    this.renderStreamBox();
  }

  /**
   * Add content to the stream (handles partial lines and newlines)
   * @param {string} content - Content to add
   */
  appendStream(content) {
    if (!this.isStreaming) return;
    
    // Split by newlines and handle partial lines
    const parts = content.split('\n');
    
    for (let i = 0; i < parts.length; i++) {
      if (i === 0 && this.streamLines.length > 0) {
        // Append to last line
        this.streamLines[this.streamLines.length - 1] += parts[i];
      } else {
        // New line
        this.streamLines.push(parts[i]);
      }
    }
    
    // Keep only last N lines
    while (this.streamLines.length > this.maxStreamLines) {
      this.streamLines.shift();
    }
    
    this.renderStreamBox();
  }

  /**
   * End the stream and clear the stream box
   */
  endStream() {
    if (!this.isStreaming) return;
    this.isStreaming = false;
    this.clearStreamBox();
    this.streamLines = [];
  }

  /**
   * Render the stream box (overwrites previous position)
   */
  renderStreamBox() {
    if (!this.isStreaming) return;
    if (!process.stdout.isTTY) return;
    
    const width = Math.min(this.streamBoxWidth, process.stdout.columns || 80) - 2;
    const { D_TOP_LEFT, D_TOP_RIGHT, D_BOTTOM_LEFT, D_BOTTOM_RIGHT, D_HORIZONTAL, D_VERTICAL } = ConsoleUI.BOX;
    
    // Calculate total lines to render (border + content + border)
    const totalLines = this.maxStreamLines + 2;
    
    // Move cursor up to overwrite previous stream box
    if (this.streamLines.length > 0 || this.lastRenderedLines) {
      process.stdout.write(`\x1b[${totalLines}A`);
    }
    
    // Top border with label (magenta double-line box)
    const labelText = ` ${this.streamLabel} `;
    const labelPad = Math.floor((width - labelText.length) / 2);
    process.stdout.write('\x1b[2K'); // Clear line
    console.log(
      chalk.magenta(D_TOP_LEFT + D_HORIZONTAL.repeat(Math.max(0, labelPad))) + 
      chalk.white.bold(labelText) + 
      chalk.magenta(D_HORIZONTAL.repeat(Math.max(0, width - labelPad - labelText.length)) + D_TOP_RIGHT)
    );
    
    // Content lines (always render maxStreamLines for consistent box size)
    for (let i = 0; i < this.maxStreamLines; i++) {
      const line = this.streamLines[i] || '';
      const truncated = line.substring(0, width).padEnd(width);
      process.stdout.write('\x1b[2K'); // Clear line
      console.log(chalk.magenta(D_VERTICAL) + chalk.gray(truncated) + chalk.magenta(D_VERTICAL));
    }
    
    // Bottom border
    process.stdout.write('\x1b[2K'); // Clear line
    console.log(chalk.magenta(D_BOTTOM_LEFT + D_HORIZONTAL.repeat(width) + D_BOTTOM_RIGHT));
    
    this.lastRenderedLines = totalLines;
  }

  /**
   * Clear the stream box area
   */
  clearStreamBox() {
    if (!process.stdout.isTTY) return;
    
    const totalLines = this.maxStreamLines + 2;
    
    // Move up and clear each line
    process.stdout.write(`\x1b[${totalLines}A`);
    for (let i = 0; i < totalLines; i++) {
      process.stdout.write('\x1b[2K\n'); // Clear line and move down
    }
    // Move back up to where we started
    process.stdout.write(`\x1b[${totalLines}A`);
    
    this.lastRenderedLines = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Utility Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Format a value for display
   * @param {*} value - Value to format
   * @returns {string} Formatted string
   */
  formatValue(value) {
    if (Array.isArray(value)) {
      if (value.length <= 3) {
        return `[${value.join(', ')}]`;
      }
      return `[${value.slice(0, 3).join(', ')}... +${value.length - 3} more]`;
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Format duration in ms to human readable
   * @param {number} ms - Milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  /**
   * Format file size
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  formatSize(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}

module.exports = ConsoleUI;
