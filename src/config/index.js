/**
 * Config Module
 * Main entry point - exports ConfigManager
 */

const ConfigManager = require('./config-manager');

// Export ConfigManager as the main class
module.exports = ConfigManager;

// Also export components for advanced usage
module.exports.ConfigManager = ConfigManager;
module.exports.ConfigFileIO = require('./config-file-io');
module.exports.ConfigHierarchy = require('./config-hierarchy');
module.exports.ConfigMerger = require('./config-merger');
