/**
 * @fileoverview API routes for running .geese files
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');

/**
 * Helper to get base directory for scope
 */
function getBaseDir(scope, projectDir) {
  if (scope === 'local') {
    return path.join(projectDir, '.geese');
  } else if (scope === 'global') {
    return path.join(require('os').homedir(), '.geese');
  }
  throw new Error('Invalid scope');
}

/**
 * Helper to validate path security
 */
async function validatePathSecurity(filePath, baseDir) {
  const normalizedPath = path.normalize(filePath);
  const normalizedBase = path.normalize(baseDir);
  
  // Check with path.relative for cross-platform compatibility
  const relativePath = path.relative(normalizedBase, normalizedPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return false;
  }
  
  // Additional check with real paths (handles symlinks)
  if (await fs.pathExists(filePath)) {
    const realPath = await fs.realpath(filePath);
    const realBase = await fs.realpath(baseDir);
    const realRelative = path.relative(realBase, realPath);
    if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
      return false;
    }
  }
  
  return true;
}

/**
 * POST /api/run
 * Execute a .geese file
 */
router.post('/', async (req, res) => {
  try {
    const { scope, filename } = req.body;
    const { container, projectDir } = req.app.locals;

    if (!scope || !filename) {
      return res.status(400).json({ error: 'Scope and filename are required' });
    }

    if (!filename.endsWith('.geese')) {
      return res.status(400).json({ error: 'Only .geese files can be executed' });
    }

    // Get base directory
    const baseDir = getBaseDir(scope, projectDir);
    const filePath = path.join(baseDir, filename);

    // Security validation first (before existence check)
    if (!(await validatePathSecurity(filePath, baseDir))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get dependencies from container
    const parser = container.resolve('geeseParser');
    const toolRunner = container.resolve('cliRunner');
    const reportGenerator = container.resolve('reportGenerator');

    const startTime = Date.now();
    
    // Parse .geese file
    const geeseData = await parser.parseGeeseFile(filePath);
    
    // Find target files
    const targetFiles = await parser.findTargetFiles(geeseData);
    
    if (targetFiles.length === 0) {
      return res.json({
        success: true,
        message: 'No files matched the include/exclude patterns',
        duration: Date.now() - startTime,
        sessions: []
      });
    }

    // Process each target file
    const sessions = [];
    for (const targetFile of targetFiles) {
      try {
        const sessionStart = Date.now();
        
        // Prepare context
        const context = parser.prepareContext(geeseData, targetFile);
        
        // Generate prompt
        const prompt = parser.renderTemplate(geeseData.template, context);
        
        // Execute tool
        const result = await toolRunner.processFile(targetFile, prompt, context._gooseConfig);
        const sessionEnd = Date.now();
        
        sessions.push({
          file: targetFile,
          success: result.success,
          output: result.success ? result.output : null,
          error: result.success ? null : result.error,
          duration: sessionEnd - sessionStart
        });
        
      } catch (error) {
        sessions.push({
          file: targetFile,
          success: false,
          output: null,
          error: error.message,
          duration: Date.now() - startTime
        });
      }
    }

    const endTime = Date.now();
    const allSuccessful = sessions.every(s => s.success);

    res.json({
      success: allSuccessful,
      message: allSuccessful ? 'Execution completed successfully' : 'Execution completed with errors',
      duration: endTime - startTime,
      sessions: sessions
    });

  } catch (error) {
    console.error('Run error:', error);
    res.status(500).json({ 
      error: 'Failed to execute .geese file',
      details: error.message 
    });
  }
});

module.exports = router;
