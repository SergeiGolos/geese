const blessed = require('blessed');

/**
 * Simple UI helper for displaying information in boxes
 * Used for simple commands like config, new, pipe, runner
 */
class SimpleUI {
  /**
   * Check if we should use TUI or console output
   * @returns {boolean} True if TUI should be used
   */
  static shouldUseTUI() {
    // Don't use TUI if stdout is not a TTY
    if (!process.stdout.isTTY) {
      return false;
    }
    
    // Don't use TUI if GEESE_NO_TUI environment variable is set
    if (process.env.GEESE_NO_TUI) {
      return false;
    }
    
    // Don't use TUI if stdin is not a TTY (piped input)
    if (!process.stdin.isTTY) {
      return false;
    }
    
    return true;
  }

  /**
   * Show content in a box and wait for user to dismiss
   * @param {string} title - Box title
   * @param {string} content - Content to display
   * @param {Object} options - Display options
   */
  static async showBox(title, content, options = {}) {
    // If not using TUI, just print to console
    if (!this.shouldUseTUI()) {
      const chalk = require('chalk').default || require('chalk');
      console.log(chalk.bold(`\n${title}\n`));
      // Strip blessed tags for console output (e.g., {cyan-fg}, {/cyan-fg}, {bold}, {/bold})
      const cleanContent = content.replace(/\{[/-]?[a-z-]+\}/g, '');
      console.log(cleanContent);
      return;
    }

    const screen = blessed.screen({
      smartCSR: true
    });

    const box = blessed.box({
      top: 'center',
      left: 'center',
      width: options.width || '80%',
      height: options.height || '80%',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: options.borderColor || 'cyan'
        },
        label: {
          fg: options.borderColor || 'cyan',
          bold: true
        }
      },
      label: ` ${title} `,
      content: content,
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

    const exitBox = blessed.box({
      bottom: 0,
      left: 'center',
      width: 'shrink',
      height: 1,
      tags: true,
      content: '{gray-fg}Press q, ESC, or Ctrl-C to exit{/gray-fg}'
    });

    screen.append(box);
    screen.append(exitBox);

    screen.key(['escape', 'q', 'C-c'], () => {
      screen.destroy();
    });

    box.focus();
    screen.render();

    // Return a promise that resolves when user exits
    return new Promise((resolve) => {
      screen.on('destroy', () => {
        resolve();
      });
    });
  }

  /**
   * Show a success message in a box
   * @param {string} title - Box title
   * @param {string} message - Success message
   * @param {Object} details - Additional details to show
   */
  static async showSuccess(title, message, details = {}) {
    let content = `{green-fg}✓{/green-fg} ${message}\n\n`;
    
    if (Object.keys(details).length > 0) {
      content += '{cyan-fg}Details:{/cyan-fg}\n';
      for (const [key, value] of Object.entries(details)) {
        content += `  {bold}${key}:{/bold} ${value}\n`;
      }
    }

    await this.showBox(title, content, { borderColor: 'green', height: 'shrink' });
  }

  /**
   * Show configuration in a formatted box
   * @param {string} title - Box title
   * @param {Object} config - Configuration object
   */
  static async showConfig(title, config) {
    const content = JSON.stringify(config, null, 2);
    await this.showBox(title, content);
  }

  /**
   * Show a list in a formatted box
   * @param {string} title - Box title
   * @param {Array} items - Items to display
   * @param {Function} formatter - Optional formatter function
   */
  static async showList(title, items, formatter = null) {
    let content = '';
    
    if (items.length === 0) {
      content = '{yellow-fg}No items found{/yellow-fg}';
    } else {
      items.forEach((item, index) => {
        const formattedItem = formatter ? formatter(item, index) : item;
        content += `${index + 1}. ${formattedItem}\n`;
      });
    }

    await this.showBox(title, content);
  }
}

module.exports = SimpleUI;
