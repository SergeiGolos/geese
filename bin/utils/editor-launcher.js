const chalk = require('chalk').default || require('chalk');
const { spawn } = require('child_process');

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

module.exports = { launchEditor, isCommandAvailable };
