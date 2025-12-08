/**
 * @fileoverview API routes for file operations
 * Handles reading and listing .geese files and pipes
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

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

    // Security: Ensure path is within allowed directories
    const realPath = await fs.realpath(filePath);
    const realBase = await fs.realpath(baseDir);
    if (!realPath.startsWith(realBase)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'File not found' });
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

module.exports = router;
