/**
 * @fileoverview Express server for Geese Editor Mode
 * Provides web-based IDE for managing .geese files, pipes, and configuration
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

/**
 * Create and configure the editor server
 * @param {Object} container - Dependency injection container
 * @param {Object} options - Server options
 * @param {number} options.port - Port to run server on (default: 3000)
 * @param {string} options.directory - Project directory (default: process.cwd())
 * @returns {Object} Express app instance
 */
function createEditorServer(container, options = {}) {
  const app = express();
  const port = options.port || 3000;
  const projectDir = options.directory || process.cwd();

  // Middleware
  app.use(cors({
    origin: [`http://localhost:${port}`, `http://127.0.0.1:${port}`],
    credentials: true
  }));
  app.use(express.json());

  // Rate limiting for API routes
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', apiLimiter);

  // Security: Bind to localhost only
  const host = 'localhost';

  // Store context in app.locals
  app.locals.container = container;
  app.locals.projectDir = projectDir;

  // API Routes
  const filesRouter = require('./routes/files');
  app.use('/api/files', filesRouter);
  
  const logsRouter = require('./routes/logs');
  app.use('/api/logs', logsRouter);
  
  const pipesRouter = require('./routes/pipes');
  app.use('/api/pipes', pipesRouter);
  
  const runRouter = require('./routes/run');
  app.use('/api/run', runRouter);

  // Serve static frontend
  const clientPublicPath = path.join(__dirname, '../client/public');
  app.use(express.static(clientPublicPath));
  
  // Catch-all route to serve index.html for client-side routing (must be last)
  app.get('/', (req, res) => {
    res.sendFile(path.join(clientPublicPath, 'index.html'));
  });

  return { app, host, port };
}

/**
 * Start the editor server
 * @param {Object} container - Dependency injection container
 * @param {Object} options - Server options
 * @returns {Promise<Object>} Server instance
 */
async function startEditorServer(container, options = {}) {
  const { app, host, port } = createEditorServer(container, options);

  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      console.log(`\n🦢 Geese Editor running at http://${host}:${port}`);
      console.log(`Project directory: ${options.directory || process.cwd()}`);
      console.log('\nPress Ctrl+C to stop\n');
      resolve({ server, url: `http://${host}:${port}` });
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use. Try a different port with --port <number>`));
      } else {
        reject(error);
      }
    });
  });
}

module.exports = {
  createEditorServer,
  startEditorServer
};
