const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');

/**
 * GET /api/logs
 * List all log files with metadata
 */
router.get('/', async (req, res) => {
  try {
    const projectDir = req.app.locals.projectDir;
    const logsDir = path.join(projectDir, 'logs');

    // Check if logs directory exists
    if (!(await fs.pathExists(logsDir))) {
      return res.json([]);
    }

    // Read all files in logs directory
    const files = await fs.readdir(logsDir);
    
    // Filter for .log.md files and get metadata
    const logs = [];
    for (const file of files) {
      if (file.endsWith('.log.md')) {
        const filePath = path.join(logsDir, file);
        const stats = await fs.stat(filePath);
        
        // Parse filename to extract timestamp and task name
        // Format: taskname_YYYY-MM-DDTHH-MM-SS-SSSZ.log.md
        const match = file.match(/^(.+?)_(\d{4}-\d{2}-\d{2}T[\d-]+Z)\.log\.md$/);
        
        let taskName = file;
        let timestamp = stats.mtime.toISOString();
        
        if (match) {
          taskName = match[1];
          // Convert: YYYY-MM-DDTHH-MM-SS-SSSZ -> YYYY-MM-DDTHH:MM:SS.SSSZ
          // Keep date part (YYYY-MM-DD), convert time part (HH-MM-SS-SSS -> HH:MM:SS.SSS)
          timestamp = match[2].replace(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, '$1T$2:$3:$4.$5Z');
        }

        // Read first few lines to get metadata
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').slice(0, 10);
        
        let totalSessions = 0;
        let duration = 0;
        let status = '✅ Success';
        
        for (const line of lines) {
          if (line.includes('**Total Sessions:**')) {
            const match = line.match(/\d+/);
            if (match) totalSessions = parseInt(match[0]);
          }
          if (line.includes('**Total Duration:**')) {
            const match = line.match(/\d+/);
            if (match) duration = parseInt(match[0]);
          }
          if (line.includes('❌')) {
            status = '❌ Failed';
          }
        }

        logs.push({
          filename: file,
          taskName,
          timestamp,
          size: stats.size,
          totalSessions,
          duration,
          status
        });
      }
    }

    // Sort by timestamp descending (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(logs);
  } catch (error) {
    console.error('Error listing logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/logs/:filename
 * Get log file content
 */
router.get('/:filename', async (req, res) => {
  try {
    const projectDir = req.app.locals.projectDir;
    const filename = req.params.filename;

    // Validate filename
    if (!filename.endsWith('.log.md')) {
      return res.status(400).json({ error: 'Invalid log filename' });
    }

    // Security: prevent path traversal
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const logPath = path.join(projectDir, 'logs', filename);

    // Ensure path is within logs directory
    const realLogPath = await fs.realpath(logPath).catch(() => null);
    if (!realLogPath) {
      return res.status(404).json({ error: 'Log file not found' });
    }

    const realLogsDir = await fs.realpath(path.join(projectDir, 'logs'));
    const relativePath = path.relative(realLogsDir, realLogPath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Read log content
    const content = await fs.readFile(logPath, 'utf-8');

    res.json({
      filename,
      content
    });
  } catch (error) {
    console.error('Error reading log:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
