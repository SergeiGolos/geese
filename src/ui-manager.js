const blessed = require('blessed');
const contrib = require('blessed-contrib');
const path = require('path');
const fs = require('fs-extra');

/**
 * UIManager class for managing terminal UI during geese processing
 * Handles property boxes, file tables, scrolling output, and summary cards
 */
class UIManager {
  constructor() {
    this.screen = null;
    this.scrollableContainer = null;
    this.propertyBox = null;
    this.fileTableBox = null;
    this.fileRows = [];
    this.sessions = [];
    this.startTime = null;
  }

  /**
   * Initialize the UI screen and layout
   */
  initialize() {
    this.startTime = Date.now();
    
    // Create screen with scrolling support
    this.screen = blessed.screen({
      smartCSR: true,
      title: '🦢 Geese - AI-Powered File Processing',
      fullUnicode: true
    });

    // Create a scrollable box that contains all content
    this.scrollableContainer = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: ' ',
        track: {
          bg: 'gray'
        },
        style: {
          inverse: true
        }
      }
    });

    this.screen.append(this.scrollableContainer);

    // Property box at the top
    this.propertyBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 'shrink',
      label: ' System Parameters ',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'cyan'
        },
        label: {
          fg: 'cyan',
          bold: true
        }
      },
      padding: {
        left: 1,
        right: 1
      }
    });

    this.scrollableContainer.append(this.propertyBox);

    // File processing table
    this.fileTableBox = blessed.box({
      top: 'shrink',
      left: 0,
      width: '100%',
      height: 'shrink',
      label: ' File Processing Progress ',
      tags: true,
      border: {
        type: 'line',
        fg: 'cyan'
      },
      padding: {
        left: 1,
        right: 1
      }
    });

    this.scrollableContainer.append(this.fileTableBox);

    // Don't create output box - we're removing console output from UI
    this.outputBox = null;

    // Quit on Escape, q, or Control-C
    this.screen.key(['escape', 'q', 'C-c'], () => {
      return process.exit(0);
    });

    // Focus on the scrollable container so scrolling works
    this.scrollableContainer.focus();

    // Initial render
    this.screen.render();
  }

  /**
   * Set system parameters display
   * @param {Object} params - System parameters to display
   */
  setSystemParameters(params) {
    if (!this.propertyBox) return;

    let content = '';
    const entries = Object.entries(params);
    
    for (let i = 0; i < entries.length; i += 2) {
      const [key1, val1] = entries[i];
      const display1 = `{cyan-fg}${key1}:{/cyan-fg} ${this.formatValue(val1)}`;
      
      if (i + 1 < entries.length) {
        const [key2, val2] = entries[i + 1];
        const display2 = `{cyan-fg}${key2}:{/cyan-fg} ${this.formatValue(val2)}`;
        content += `${display1}  |  ${display2}\n`;
      } else {
        content += `${display1}\n`;
      }
    }

    this.propertyBox.setContent(content);
    this.screen.render();
  }

  /**
   * Format a value for display
   * @param {*} value - Value to format
   * @returns {string} Formatted value
   */
  formatValue(value) {
    if (Array.isArray(value)) {
      return value.length > 3 
        ? `[${value.slice(0, 3).join(', ')}... +${value.length - 3} more]`
        : `[${value.join(', ')}]`;
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Add a file to the processing table
   * @param {string} filename - File name
   * @param {string} size - File size
   * @param {string} updatedTime - Last updated time
   */
  addFileRow(filename, size, updatedTime) {
    this.fileRows.push([
      filename,
      size,
      updatedTime,
      '-',
      '⏳'
    ]);
    this.updateTable();
  }

  /**
   * Update a file row with completion data
   * @param {number} index - Row index
   * @param {number} tokens - Tokens used
   * @param {boolean} success - Whether processing was successful
   */
  updateFileRow(index, tokens, success) {
    if (index >= 0 && index < this.fileRows.length) {
      this.fileRows[index][3] = tokens > 0 ? tokens.toString() : '-';
      this.fileRows[index][4] = success ? '✅' : '❌';
      this.updateTable();
    }
  }

  /**
   * Update the file table display
   */
  updateTable() {
    if (!this.fileTableBox) return;

    // Build table content manually
    let tableContent = '';
    
    // Header
    tableContent += '{bold}';
    tableContent += 'File Name'.padEnd(32) + 
                   'Size'.padEnd(12) + 
                   'Updated Time'.padEnd(22) + 
                   'Tokens'.padEnd(12) + 
                   'Status\n';
    tableContent += '{/bold}';
    tableContent += '─'.repeat(90) + '\n';
    
    // Data rows
    for (const row of this.fileRows) {
      const [name, size, time, tokens, status] = row;
      tableContent += name.padEnd(32) + 
                     size.padEnd(12) + 
                     time.padEnd(22) + 
                     tokens.padEnd(12) + 
                     status + '\n';
    }
    
    this.fileTableBox.setContent(tableContent);
    this.screen.render();
  }

  /**
   * Log output to the scrolling output box
   * @param {string} message - Message to log
   * @param {string} type - Message type (info, success, error, warning)
   */
  logOutput(message, type = 'info') {
    // No longer display console output in UI - only in report
    // This method is kept for compatibility but does nothing
  }

  /**
   * Clear the output box
   */
  clearOutput() {
    // No-op - output box no longer exists
  }

  /**
   * Show the output box
   */
  showOutput() {
    // No-op - output box no longer exists
  }

  /**
   * Hide the output box
   */
  hideOutput() {
    // No-op - output box no longer exists
  }

  /**
   * Add a session to track stats
   * @param {Object} session - Session object with duration and tokens
   */
  addSession(session) {
    this.sessions.push(session);
  }

  /**
   * Show summary report card
   */
  showSummary() {
    if (!this.screen || !this.scrollableContainer) return;

    // Calculate statistics
    const totalFiles = this.sessions.length;
    const totalTime = Date.now() - this.startTime;
    const totalTokens = this.sessions.reduce((sum, s) => sum + (s.tokens?.totalTokens || 0), 0);
    const avgTime = totalFiles > 0 ? Math.round(totalTime / totalFiles) : 0;
    const avgTokens = totalFiles > 0 ? Math.round(totalTokens / totalFiles) : 0;
    const successCount = this.sessions.filter(s => s.success).length;

    // Create summary box and append to scrollable container
    const summaryBox = blessed.box({
      top: 'shrink',
      left: 0,
      width: '100%',
      height: 'shrink',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'green'
        },
        label: {
          fg: 'green',
          bold: true
        }
      },
      label: ' Processing Complete ',
      padding: {
        left: 1,
        right: 1
      },
      content: this.generateSummaryContent(totalFiles, successCount, totalTime, avgTime, totalTokens, avgTokens)
    });

    this.scrollableContainer.append(summaryBox);
    
    // Scroll to the bottom to show the summary
    this.scrollableContainer.setScrollPerc(100);
    
    this.screen.render();
    
    // Auto-exit after a brief delay to let user see the summary
    setTimeout(() => {
      this.destroy();
      process.exit(0);
    }, 3000);
  }

  /**
   * Generate summary content
   * @param {number} totalFiles - Total files processed
   * @param {number} successCount - Successful files
   * @param {number} totalTime - Total time in ms
   * @param {number} avgTime - Average time in ms
   * @param {number} totalTokens - Total tokens
   * @param {number} avgTokens - Average tokens
   * @returns {string} Formatted summary content
   */
  generateSummaryContent(totalFiles, successCount, totalTime, avgTime, totalTokens, avgTokens) {
    const failedCount = totalFiles - successCount;
    
    let content = '\n';
    content += '  {bold}{green-fg}╔════════════════════════════════════════════════╗{/green-fg}{/bold}\n';
    content += '  {bold}{green-fg}║{/green-fg}     🦢 {cyan-fg}GEESE PROCESSING COMPLETE{/cyan-fg}        {green-fg}║{/green-fg}{/bold}\n';
    content += '  {bold}{green-fg}╚════════════════════════════════════════════════╝{/green-fg}{/bold}\n';
    content += '\n';
    content += `  {bold}Files Processed:{/bold}      {cyan-fg}${totalFiles}{/cyan-fg}\n`;
    content += `  {bold}Successful:{/bold}           {green-fg}${successCount}{/green-fg}\n`;
    if (failedCount > 0) {
      content += `  {bold}Failed:{/bold}               {red-fg}${failedCount}{/red-fg}\n`;
    }
    content += '\n';
    content += '  {bold}{yellow-fg}━━━ Timing Statistics ━━━{/yellow-fg}{/bold}\n';
    content += `  {bold}Total Time:{/bold}           ${this.formatDuration(totalTime)}\n`;
    content += `  {bold}Average Time:{/bold}         ${this.formatDuration(avgTime)}\n`;
    content += '\n';
    content += '  {bold}{yellow-fg}━━━ Token Statistics ━━━{/yellow-fg}{/bold}\n';
    content += `  {bold}Total Tokens:{/bold}         {cyan-fg}${totalTokens.toLocaleString()}{/cyan-fg}\n`;
    content += `  {bold}Average Tokens:{/bold}       {cyan-fg}${avgTokens.toLocaleString()}{/cyan-fg}\n`;
    
    return content;
  }

  /**
   * Format duration for display
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Get file size in human-readable format
   * Note: Uses synchronous operation for simplicity in UI initialization
   * @param {string} filePath - Path to file
   * @returns {string} Formatted file size
   */
  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const bytes = stats.size;
      
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get file updated time
   * Note: Uses synchronous operation for simplicity in UI initialization
   * @param {string} filePath - Path to file
   * @returns {string} Formatted update time
   */
  getFileUpdatedTime(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const date = stats.mtime;
      return date.toISOString().replace('T', ' ').split('.')[0];
    } catch {
      return 'unknown';
    }
  }

  /**
   * Destroy the UI
   */
  destroy() {
    if (this.screen) {
      this.screen.destroy();
      this.screen = null;
    }
  }
}

module.exports = UIManager;
