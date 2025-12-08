/**
 * @fileoverview API routes for file operations
 * Handles reading, writing, creating, and deleting .geese files and pipes
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const matter = require('gray-matter');
const esprima = require('esprima');

/**
 * Get list of all .geese files and pipes
 * Returns files from both local (.geese/) and global (~/.geese/) locations
 */
router.get('/', async (req, res) => {
  try {
    const container = req.app.locals.container;
    const projectDir = req.app.locals.projectDir;
    
    const geeseFileFinder = container.get('geeseFileFinder');
    
    // Find .geese files in project and global directories
    const localGeeseDir = path.join(projectDir, '.geese');
    const globalGeeseDir = path.join(os.homedir(), '.geese');
    
    const files = {
      local: {
        geese: [],
        pipes: [],
        config: null
      },
      global: {
        geese: [],
        pipes: [],
        config: null
      }
    };

    // Local files
    if (await fs.pathExists(localGeeseDir)) {
      const localGeese = await findGeeseFiles(localGeeseDir);
      files.local.geese = localGeese;
      
      const localPipesDir = path.join(localGeeseDir, 'pipes');
      if (await fs.pathExists(localPipesDir)) {
        const localPipes = await findJsFiles(localPipesDir);
        files.local.pipes = localPipes;
      }
      
      const localConfig = path.join(localGeeseDir, 'config.json');
      if (await fs.pathExists(localConfig)) {
        files.local.config = localConfig;
      }
    }

    // Global files
    if (await fs.pathExists(globalGeeseDir)) {
      const globalGeese = await findGeeseFiles(globalGeeseDir);
      files.global.geese = globalGeese;
      
      const globalPipesDir = path.join(globalGeeseDir, 'pipes');
      if (await fs.pathExists(globalPipesDir)) {
        const globalPipes = await findJsFiles(globalPipesDir);
        files.global.pipes = globalPipes;
      }
      
      const globalConfig = path.join(globalGeeseDir, 'config.json');
      if (await fs.pathExists(globalConfig)) {
        files.global.config = globalConfig;
      }
    }

    // Also check root directory for .geese files
    const rootGeese = await findGeeseFiles(projectDir);
    files.local.geese = [...files.local.geese, ...rootGeese];

    res.json(files);
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get contents of a specific file
 */
router.get('/:scope/:type/:filename', async (req, res) => {
  try {
    const { scope, type, filename } = req.params;
    const projectDir = req.app.locals.projectDir;
    
    let baseDir;
    if (scope === 'local') {
      baseDir = path.join(projectDir, '.geese');
    } else if (scope === 'global') {
      baseDir = path.join(os.homedir(), '.geese');
    } else if (scope === 'root') {
      baseDir = projectDir;
    } else {
      return res.status(400).json({ error: 'Invalid scope. Must be "local", "global", or "root"' });
    }

    let filePath;
    if (type === 'geese') {
      filePath = path.join(baseDir, filename);
    } else if (type === 'pipes') {
      filePath = path.join(baseDir, 'pipes', filename);
    } else if (type === 'config') {
      filePath = path.join(baseDir, 'config.json');
    } else {
      return res.status(400).json({ error: 'Invalid type. Must be "geese", "pipes", or "config"' });
    }

    // Check if file exists first
    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Security: Ensure path is within allowed directories
    try {
      const realPath = await fs.realpath(filePath);
      const realBase = await fs.realpath(baseDir);
      if (!realPath.startsWith(realBase)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } catch (err) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ 
      path: filePath,
      content,
      filename: path.basename(filePath)
    });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: Find all .geese files in a directory
 */
async function findGeeseFiles(dir) {
  if (!(await fs.pathExists(dir))) {
    return [];
  }

  const files = await fs.readdir(dir);
  const geeseFiles = files.filter(f => f.endsWith('.geese'));
  
  return geeseFiles.map(f => ({
    name: f,
    path: path.join(dir, f)
  }));
}

/**
 * Helper: Find all .js files in a directory
 */
async function findJsFiles(dir) {
  if (!(await fs.pathExists(dir))) {
    return [];
  }

  const files = await fs.readdir(dir);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  
  return jsFiles.map(f => ({
    name: f,
    path: path.join(dir, f)
  }));
}

/**
 * Save/update file contents
 * PUT /api/files/:scope/:type/:filename
 */
router.put('/:scope/:type/:filename', async (req, res) => {
  try {
    const { scope, type, filename } = req.params;
    const { content } = req.body;
    
    if (!content && content !== '') {
      return res.status(400).json({ error: 'Content is required' });
    }

    const projectDir = req.app.locals.projectDir;
    
    let baseDir;
    if (scope === 'local') {
      baseDir = path.join(projectDir, '.geese');
    } else if (scope === 'global') {
      baseDir = path.join(os.homedir(), '.geese');
    } else if (scope === 'root') {
      baseDir = projectDir;
    } else {
      return res.status(400).json({ error: 'Invalid scope' });
    }

    let filePath;
    if (type === 'geese') {
      filePath = path.join(baseDir, filename);
    } else if (type === 'pipes') {
      filePath = path.join(baseDir, 'pipes', filename);
    } else if (type === 'config') {
      filePath = path.join(baseDir, 'config.json');
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }

    // Ensure directory exists
    await fs.ensureDir(path.dirname(filePath));

    // Check if file exists first
    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Security: Ensure path is within allowed directories (before validation)
    try {
      const realPath = await fs.realpath(filePath);
      const realBase = await fs.realpath(baseDir);
      // Use path.relative for cross-platform compatibility
      const relativePath = path.relative(realBase, realPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } catch (err) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate content before saving
    try {
      if (type === 'geese') {
        // Validate .geese file (YAML frontmatter + template)
        matter(content);
      } else if (type === 'config') {
        // Validate JSON syntax
        const config = JSON.parse(content);
        // Validate JSON schema
        validateConfigSchema(config);
      } else if (type === 'pipes') {
        // Safe JS syntax check using esprima (no code execution)
        esprima.parseScript(content);
      }
    } catch (validationError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationError.message 
      });
    }

    // Write file
    await fs.writeFile(filePath, content, 'utf-8');

    res.json({ 
      success: true, 
      message: 'File saved successfully',
      path: filePath
    });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create new file
 * POST /api/files/:scope/:type
 */
router.post('/:scope/:type', async (req, res) => {
  try {
    const { scope, type } = req.params;
    const { filename, content } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    // Validate filename
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const projectDir = req.app.locals.projectDir;
    
    let baseDir;
    if (scope === 'local') {
      baseDir = path.join(projectDir, '.geese');
    } else if (scope === 'global') {
      baseDir = path.join(os.homedir(), '.geese');
    } else if (scope === 'root') {
      baseDir = projectDir;
    } else {
      return res.status(400).json({ error: 'Invalid scope' });
    }

    let filePath;
    if (type === 'geese') {
      // Ensure .geese extension
      const fileName = filename.endsWith('.geese') ? filename : `${filename}.geese`;
      filePath = path.join(baseDir, fileName);
    } else if (type === 'pipes') {
      // Ensure .js extension
      const fileName = filename.endsWith('.js') ? filename : `${filename}.js`;
      filePath = path.join(baseDir, 'pipes', fileName);
    } else if (type === 'config') {
      filePath = path.join(baseDir, 'config.json');
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }

    // Check if file already exists
    if (await fs.pathExists(filePath)) {
      return res.status(409).json({ error: 'File already exists' });
    }

    // Validate content if provided
    if (content) {
      try {
        if (type === 'geese') {
          matter(content);
        } else if (type === 'config') {
          JSON.parse(content);
        } else if (type === 'pipes') {
          // Safe JS syntax check using esprima (no code execution)
          esprima.parseScript(content);
        }
      } catch (validationError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validationError.message 
        });
      }
    }

    // Ensure directory exists
    await fs.ensureDir(path.dirname(filePath));

    // Create file with content or empty
    await fs.writeFile(filePath, content || getDefaultContent(type), 'utf-8');

    res.status(201).json({ 
      success: true, 
      message: 'File created successfully',
      path: filePath,
      filename: path.basename(filePath)
    });
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete file
 * DELETE /api/files/:scope/:type/:filename
 */
router.delete('/:scope/:type/:filename', async (req, res) => {
  try {
    const { scope, type, filename } = req.params;
    const projectDir = req.app.locals.projectDir;
    
    let baseDir;
    if (scope === 'local') {
      baseDir = path.join(projectDir, '.geese');
    } else if (scope === 'global') {
      baseDir = path.join(os.homedir(), '.geese');
    } else if (scope === 'root') {
      baseDir = projectDir;
    } else {
      return res.status(400).json({ error: 'Invalid scope' });
    }

    let filePath;
    if (type === 'geese') {
      filePath = path.join(baseDir, filename);
    } else if (type === 'pipes') {
      filePath = path.join(baseDir, 'pipes', filename);
    } else if (type === 'config') {
      return res.status(403).json({ error: 'Cannot delete config file' });
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }

    // Security: Validate path before checking existence (prevent info disclosure)
    // First check if the path would be within allowed directories
    const normalizedFilePath = path.normalize(filePath);
    const normalizedBase = path.normalize(baseDir);
    const relativePath = path.relative(normalizedBase, normalizedFilePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Security: Ensure real path is within allowed directories (handle symlinks)
    try {
      const realPath = await fs.realpath(filePath);
      const realBase = await fs.realpath(baseDir);
      const realRelativePath = path.relative(realBase, realPath);
      if (realRelativePath.startsWith('..') || path.isAbsolute(realRelativePath)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } catch (err) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete file
    await fs.unlink(filePath);

    res.json({ 
      success: true, 
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get default content for new files
 */
function getDefaultContent(type) {
  if (type === 'geese') {
    return `---
_include:
  - "**/*.js"
_exclude:
  - "node_modules/**"
_recipe: "default"
---

# Your prompt template here
Process the file: {{filename}}

\`\`\`
{{content}}
\`\`\`
`;
  } else if (type === 'pipes') {
    return `/**
 * Custom pipe operation
 */
class CustomPipe {
  constructor() {
    this.name = 'customPipe';
  }

  execute(input, ...args) {
    // Your pipe logic here
    return input;
  }
}

module.exports = CustomPipe;
`;
  } else if (type === 'config') {
    return JSON.stringify({
      defaultTool: "goose",
      logLevel: "info"
    }, null, 2);
  }
  return '';
}

/**
 * Helper: Validate numeric value is within range
 */
function validateNumericRange(value, min, max, fieldName) {
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a number`);
  }
  if (min !== undefined && num < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }
  if (max !== undefined && num > max) {
    throw new Error(`${fieldName} must be at most ${max}`);
  }
  return num;
}

/**
 * Validate configuration object against schema
 */
function validateConfigSchema(config) {
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
      validateNumericRange(config.goose.temperature, 0, 1, 'goose.temperature');
    }

    if (config.goose.max_tokens !== undefined) {
      validateNumericRange(config.goose.max_tokens, 1, undefined, 'goose.max_tokens');
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
      validateNumericRange(config.security.maxFileReadsPerSecond, 1, undefined, 'security.maxFileReadsPerSecond');
    }
  }

  return true;
}

module.exports = router;
