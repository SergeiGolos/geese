const fs = require('fs-extra');
const path = require('path');

/**
 * Utility for walking up directory trees to find ancestor directories
 */
class DirectoryWalker {
  /**
   * Find a directory with a specific name by walking up from startPath
   * @param {string} startPath - Starting directory path
   * @param {string} targetName - Name of the directory to find (e.g., '.geese')
   * @returns {string|null} Path to the found directory, or null if not found
   */
  static findAncestorDirectory(startPath, targetName) {
    let currentDir = path.resolve(startPath);
    const root = path.parse(currentDir).root;
    
    while (currentDir !== root) {
      const targetDir = path.join(currentDir, targetName);
      if (fs.existsSync(targetDir)) {
        return targetDir;
      }
      currentDir = path.dirname(currentDir);
    }
    
    return null;
  }

  /**
   * Find the nearest .geese directory by walking up from startPath
   * @param {string} startPath - Starting directory path
   * @returns {string|null} Path to .geese directory, or null if not found
   */
  static findGeeseDirectory(startPath) {
    return this.findAncestorDirectory(startPath, '.geese');
  }
}

module.exports = DirectoryWalker;
