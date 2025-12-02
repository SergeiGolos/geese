const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { glob } = require('glob');

class GeeseFileFinder {
  /**
   * Discover .geese files in hierarchical order
   * @param {string} workingDir - Current working directory
   * @returns {Array} Array of .geese file paths in priority order
   */
  async discoverGeeseFiles(workingDir) {
    const files = [];
    
    // 1. Global .geese files (~/.geese/*.geese)
    const globalGeeseDir = path.join(os.homedir(), '.geese');
    if (await fs.pathExists(globalGeeseDir)) {
      const globalFiles = await this.findGeeseInDirectory(globalGeeseDir);
      files.push(...globalFiles.map(f => ({
        path: f,
        source: 'global',
        priority: 1
      })));
    }
    
    // 2. Local .geese files (./.geese/*.geese)
    const localGeeseDir = path.join(workingDir, '.geese');
    if (await fs.pathExists(localGeeseDir)) {
      const localFiles = await this.findGeeseInDirectory(localGeeseDir);
      files.push(...localFiles.map(f => ({
        path: f,
        source: 'local',
        priority: 2
      })));
    }
    
    // 3. Root .geese files (./*.geese)
    const rootFiles = await this.findGeeseInDirectory(workingDir, false);
    files.push(...rootFiles.map(f => ({
      path: f,
      source: 'root',
      priority: 3
    })));
    
    // Remove duplicates (same filename, keep highest priority)
    const uniqueFiles = this.deduplicateByName(files);
    
    return uniqueFiles;
  }

  /**
   * Find .geese files in a specific directory
   * @param {string} dir - Directory to search
   * @param {boolean} recursive - Search subdirectories (default: true)
   * @returns {Array} Array of file paths
   */
  async findGeeseInDirectory(dir, recursive = true) {
    const pattern = recursive 
      ? path.join(dir, '**/*.geese')
      : path.join(dir, '*.geese');
    
    try {
      // glob v11+ returns a promise directly
      const files = await glob(pattern, { 
        ignore: ['**/node_modules/**', '**/dist/**'],
        nodir: true 
      });
      return files;
    } catch (error) {
      console.warn(`Warning: Failed to find .geese files in ${dir}: ${error.message}`);
      return [];
    }
  }

  /**
   * Remove duplicate files by name, keeping highest priority
   * @param {Array} files - Array of file objects with path, source, priority
   * @returns {Array} Deduplicated array
   */
  deduplicateByName(files) {
    const fileMap = new Map();
    
    for (const file of files) {
      const basename = path.basename(file.path);
      const existing = fileMap.get(basename);
      
      if (!existing || file.priority > existing.priority) {
        fileMap.set(basename, file);
      }
    }
    
    return Array.from(fileMap.values())
      .sort((a, b) => a.priority - b.priority)
      .map(f => f.path);
  }

  /**
   * Get the default output directory for new .geese files
   * @param {string} workingDir - Current working directory
   * @param {string} outputDir - Custom output directory (optional)
   * @returns {string} Path to output directory
   */
  getDefaultOutputDir(workingDir, outputDir = null) {
    if (outputDir) {
      return path.resolve(workingDir, outputDir);
    }
    
    // Default to .geese directory to avoid polluting root
    return path.join(workingDir, '.geese');
  }

  /**
   * Ensure .geese directory exists
   * @param {string} workingDir - Working directory
   */
  async ensureGeeseDirectory(workingDir) {
    const geeseDir = path.join(workingDir, '.geese');
    await fs.ensureDir(geeseDir);
    return geeseDir;
  }
}

module.exports = new GeeseFileFinder();
