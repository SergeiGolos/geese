/**
 * @fileoverview API routes for configuration management
 * Handles reading and updating local and global configuration
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

/**
 * Get local configuration
 * GET /api/config/local
 */
router.get('/local', async (req, res) => {
  try {
    const projectDir = req.app.locals.projectDir;
    const configPath = path.join(projectDir, '.geese', 'config.json');
    
    if (!(await fs.pathExists(configPath))) {
      return res.json({});
    }

    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    
    res.json(config);
  } catch (error) {
    console.error('Error reading local config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get global configuration
 * GET /api/config/global
 */
router.get('/global', async (req, res) => {
  try {
    const configPath = path.join(os.homedir(), '.geese', 'config.json');
    
    if (!(await fs.pathExists(configPath))) {
      return res.json({});
    }

    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    
    res.json(config);
  } catch (error) {
    console.error('Error reading global config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get merged configuration (for preview)
 * GET /api/config/merged
 */
router.get('/merged', async (req, res) => {
  try {
    const projectDir = req.app.locals.projectDir;
    
    // Read global config
    const globalConfigPath = path.join(os.homedir(), '.geese', 'config.json');
    let globalConfig = {};
    if (await fs.pathExists(globalConfigPath)) {
      const content = await fs.readFile(globalConfigPath, 'utf-8');
      globalConfig = JSON.parse(content);
    }
    
    // Read local config
    const localConfigPath = path.join(projectDir, '.geese', 'config.json');
    let localConfig = {};
    if (await fs.pathExists(localConfigPath)) {
      const content = await fs.readFile(localConfigPath, 'utf-8');
      localConfig = JSON.parse(content);
    }
    
    // Merge configs (local overrides global)
    const mergedConfig = mergeConfigs(globalConfig, localConfig);
    
    res.json(mergedConfig);
  } catch (error) {
    console.error('Error reading merged config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update local configuration
 * PUT /api/config/local
 */
router.put('/local', async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({ error: 'Configuration object is required' });
    }

    // Validate configuration
    try {
      validateConfig(config);
    } catch (validationError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationError.message 
      });
    }

    const projectDir = req.app.locals.projectDir;
    const configDir = path.join(projectDir, '.geese');
    const configPath = path.join(configDir, 'config.json');
    
    // Ensure directory exists
    await fs.ensureDir(configDir);
    
    // Write config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    res.json({ 
      success: true, 
      message: 'Local configuration saved successfully',
      path: configPath
    });
  } catch (error) {
    console.error('Error saving local config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update global configuration
 * PUT /api/config/global
 */
router.put('/global', async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({ error: 'Configuration object is required' });
    }

    // Validate configuration
    try {
      validateConfig(config);
    } catch (validationError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationError.message 
      });
    }

    const configDir = path.join(os.homedir(), '.geese');
    const configPath = path.join(configDir, 'config.json');
    
    // Ensure directory exists
    await fs.ensureDir(configDir);
    
    // Write config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    res.json({ 
      success: true, 
      message: 'Global configuration saved successfully',
      path: configPath
    });
  } catch (error) {
    console.error('Error saving global config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Validate configuration object
 */
function validateConfig(config) {
  // Basic validation - ensure it's a valid object
  if (typeof config !== 'object' || config === null) {
    throw new Error('Configuration must be a valid object');
  }

  // Validate specific fields if they exist
  if (config.defaultTool !== undefined && typeof config.defaultTool !== 'string') {
    throw new Error('defaultTool must be a string');
  }

  if (config.logLevel !== undefined) {
    const validLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLevels.includes(config.logLevel)) {
      throw new Error(`logLevel must be one of: ${validLevels.join(', ')}`);
    }
  }

  if (config.goose !== undefined) {
    if (typeof config.goose !== 'object') {
      throw new Error('goose configuration must be an object');
    }

    if (config.goose.model !== undefined && typeof config.goose.model !== 'string') {
      throw new Error('goose.model must be a string');
    }

    if (config.goose.temperature !== undefined) {
      const temp = Number(config.goose.temperature);
      if (isNaN(temp) || temp < 0 || temp > 1) {
        throw new Error('goose.temperature must be a number between 0 and 1');
      }
    }

    if (config.goose.max_tokens !== undefined) {
      const tokens = Number(config.goose.max_tokens);
      if (isNaN(tokens) || tokens < 1) {
        throw new Error('goose.max_tokens must be a positive number');
      }
    }

    if (config.goose.include !== undefined && !Array.isArray(config.goose.include)) {
      throw new Error('goose.include must be an array');
    }

    if (config.goose.exclude !== undefined && !Array.isArray(config.goose.exclude)) {
      throw new Error('goose.exclude must be an array');
    }
  }

  if (config.security !== undefined) {
    if (typeof config.security !== 'object') {
      throw new Error('security configuration must be an object');
    }

    if (config.security.allowAbsolutePaths !== undefined && typeof config.security.allowAbsolutePaths !== 'boolean') {
      throw new Error('security.allowAbsolutePaths must be a boolean');
    }

    if (config.security.maxFileReadsPerSecond !== undefined) {
      const rate = Number(config.security.maxFileReadsPerSecond);
      if (isNaN(rate) || rate < 1) {
        throw new Error('security.maxFileReadsPerSecond must be a positive number');
      }
    }
  }

  return true;
}

/**
 * Deep merge two configuration objects
 */
function mergeConfigs(global, local) {
  const merged = JSON.parse(JSON.stringify(global)); // Deep clone
  
  for (const key in local) {
    if (local[key] && typeof local[key] === 'object' && !Array.isArray(local[key])) {
      // Recursively merge nested objects
      merged[key] = mergeConfigs(merged[key] || {}, local[key]);
    } else {
      // Override with local value
      merged[key] = local[key];
    }
  }
  
  return merged;
}

module.exports = router;
