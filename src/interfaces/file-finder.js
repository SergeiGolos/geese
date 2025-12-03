/**
 * Interface for file discovery operations
 * Implementations must provide these methods to find and filter files
 * 
 * @interface IFileFinder
 */
class IFileFinder {
  /**
   * Discover .geese files in hierarchical order (global, local, root)
   * @param {string} workingDir - Current working directory
   * @returns {Promise<Array<Object>>} Array of file objects with path, source, and priority
   * @throws {Error} If not implemented by subclass
   * 
   * @example
   * const files = await finder.discoverGeeseFiles('/path/to/project');
   * // Returns: [{ path: '/path/to/file.geese', source: 'local', priority: 2 }, ...]
   */
  async discoverGeeseFiles(workingDir) {
    throw new Error('discoverGeeseFiles(workingDir) must be implemented by subclass');
  }
  
  /**
   * Find .geese files in a specific directory
   * @param {string} dir - Directory to search
   * @param {boolean} [recursive=true] - Whether to search recursively
   * @returns {Promise<string[]>} Array of file paths
   * @throws {Error} If not implemented by subclass
   * 
   * @example
   * const files = await finder.findGeeseInDirectory('/path/to/dir', false);
   * // Returns: ['/path/to/dir/file1.geese', '/path/to/dir/file2.geese']
   */
  async findGeeseInDirectory(dir, recursive = true) {
    throw new Error('findGeeseInDirectory(dir, recursive) must be implemented by subclass');
  }
}

module.exports = IFileFinder;
