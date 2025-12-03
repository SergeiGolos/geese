const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');
const CLIArgumentParser = require('../../src/cli-argument-parser');
const ConsoleUI = require('../../src/console-ui');

/**
 * Get human-readable file size
 * @param {string} filePath - Path to file
 * @returns {string} Human-readable file size
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const bytes = stats.size;
    
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  } catch {
    return 'unknown';
  }
}

/**
 * Process a single target file
 * @param {GeeseParser} parser - Parser instance
 * @param {CLIRunner} toolRunner - Tool runner instance
 * @param {ReportGenerator} reportGenerator - Report generator instance
 * @param {Object} geeseData - Parsed .geese file data
 * @param {string} targetFile - Target file path
 * @param {boolean} dryRun - Whether to run in dry-run mode
 * @param {ConsoleUI} ui - Console UI instance
 * @returns {Promise<Object|null>} Session object or null
 */
async function processTargetFile(parser, toolRunner, reportGenerator, geeseData, targetFile, dryRun, ui) {
  const startTime = Date.now();
  const filename = path.basename(targetFile);
  
  // Print processing start (permanent in main flow)
  ui.printInfo('🚀', `Processing: ${path.basename(geeseData.filePath)} → ${filename}`);
  
  // Start stream window for real-time output
  ui.startStream(`Output: ${filename}`);
  
  try {
    // Prepare context
    const context = parser.prepareContext(geeseData, targetFile);
    
    // Generate prompt
    const prompt = parser.renderTemplate(geeseData.template, context);
    
    // Execute tool with streaming callbacks
    const executionOptions = {
      onStdout: (data) => {
        ui.appendStream(data);
      },
      onStderr: (data) => {
        ui.appendStream(data);
      }
    };
    
    const result = await toolRunner.processFile(targetFile, prompt, context._gooseConfig, executionOptions);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // End stream (clears the stream box)
    ui.endStream();
    
    // Print completion (permanent in main flow)
    if (result.success) {
      ui.printSuccess(`Completed: ${filename} (${ui.formatDuration(duration)})`);
    } else {
      ui.printError(`Failed: ${filename} (${ui.formatDuration(duration)})`);
    }
    
    // Create session entry
    const session = reportGenerator.createSessionEntry(
      geeseData.filePath,
      targetFile,
      context,
      prompt,
      result.success ? result.output : result.error,
      startTime,
      endTime
    );
    
    session.success = result.success;
    session.duration = duration;
    
    return session;
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // End stream and show error
    ui.endStream();
    ui.printError(`Error: ${filename} - ${error.message}`);
    
    const session = reportGenerator.createSessionEntry(
      geeseData.filePath,
      targetFile,
      {},
      '',
      error.message,
      startTime,
      endTime
    );
    
    session.success = false;
    session.duration = duration;
    
    return session;
  }
}

/**
 * Run command handler
 * Processes .geese files and applies AI-powered transformations to target files
 * 
 * @param {Container} container - Service container
 * @param {string} directory - Working directory
 * @param {Object} options - Command options
 */
async function runCommand(container, directory, options) {
  const ui = new ConsoleUI({ maxStreamLines: 6 });
  
  console.log('');
  console.log(chalk.blue('🦢 Geese - AI-powered file processing tool'));
  
  const workingDir = path.resolve(directory);
  
  // Parse CLI arguments into config overrides
  const cliConfig = CLIArgumentParser.parseToConfig(process.argv);
  
  // Get services from container
  const configManager = container.get('configManager');
  const pipeOps = container.get('pipeOperations');
  const parser = container.get('parser');
  const toolRegistry = container.get('toolRegistry');
  
  // Get or create report generator with custom output directory if specified
  const reportGenerator = options.output 
    ? container.get('reportGeneratorFactory')(options.output)
    : container.get('reportGenerator');
  
  // Load hierarchical configuration
  const hierarchicalConfig = await configManager.loadHierarchicalConfig(workingDir, {}, cliConfig);
  const config = hierarchicalConfig.config;
  
  // Show debug info if requested
  if (options.debugConfig || cliConfig.debugConfig) {
    ui.printBox('Configuration Debug', hierarchicalConfig);
  }
  
  // Initialize pipe operations with hierarchical loading
  await pipeOps.initializeHierarchy(workingDir);
  
  // Also load from old location for backward compatibility
  const homeDir = require('os').homedir();
  const pipesDir = path.join(homeDir, '.geese', 'pipes');
  parser.loadCustomPipes(pipesDir);
  
  // Initialize tool registry with hierarchical loading
  await toolRegistry.initializeHierarchy(workingDir);
  
  // Determine tool and get runner
  const tool = config.defaultTool || 'goose';
  const toolRunner = toolRegistry.getRunner(tool);
  
  // Apply config overrides
  const toolConfig = config[tool] || {};
  if (options.goosePath || toolConfig.path) {
    toolRunner.setPath(options.goosePath || toolConfig.path);
  }
  
  // Configure runner type based on dry-run options
  if (options.dryRunFile) {
    toolRunner.setRunnerType('file', { outputPath: options.dryRunFile });
    ui.printInfo('🔍', `Dry-run mode: Writing commands to ${options.dryRunFile}`);
  } else if (options.dryRun) {
    toolRunner.setRunnerType('console');
    ui.printInfo('🔍', 'Dry-run mode: Logging to console');
  }
  
  // Check if tool is available (unless dry run)
  if (!options.dryRun && !options.dryRunFile) {
    const isAvailable = await toolRunner.checkAvailable();
    if (!isAvailable) {
      ui.printWarning(`${tool} not found in PATH.`);
      const { continueAnyway } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueAnyway',
          message: 'Continue in dry-run mode?',
          default: true
        }
      ]);
      
      if (continueAnyway) {
        options.dryRun = true;
        toolRunner.setRunnerType('console');
      } else {
        process.exit(1);
      }
    }
  }
  
  // Find .geese files
  let geeseFiles = [];
  
  if (options.file) {
    // Process specific file
    const filePath = path.resolve(workingDir, options.file);
    if (!await fs.pathExists(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    geeseFiles = [filePath];
    ui.printInfo('📄', `Processing file: ${path.basename(filePath)}`);
  } else {
    // Use hierarchical file discovery
    const geeseFileFinder = container.get('geeseFileFinder');
    geeseFiles = await geeseFileFinder.discoverGeeseFiles(workingDir);
    
    // Fallback to old method if no files found with new method
    if (geeseFiles.length === 0) {
      geeseFiles = parser.findGeeseFiles(workingDir);
    }
    
    if (geeseFiles.length === 0) {
      ui.printWarning('No .geese files found in the specified directory.');
      console.log(chalk.gray('Tip: Use "geese new <name>" to create a new .geese file'));
      return;
    }
    
    // Auto-run if only one file
    if (geeseFiles.length === 1) {
      ui.printInfo('📄', `Found one .geese file: ${path.basename(geeseFiles[0])}`);
    } else {
      // Show selection screen for multiple files
      ui.printInfo('📋', `Found ${geeseFiles.length} .geese file(s)`);
      
      const { selectedFiles } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedFiles',
          message: 'Select .geese files to process:',
          choices: geeseFiles.map(file => ({
            name: `${path.basename(file)} (${getFileSize(file)})`,
            value: file,
            checked: false
          })),
          pageSize: 10,
          validate: (answer) => {
            if (answer.length === 0) {
              return 'You must select at least one file';
            }
            return true;
          }
        }
      ]);
      
      geeseFiles = selectedFiles;
    }
  }
  
  if (geeseFiles.length === 0) {
    ui.printWarning('No files selected for processing.');
    return;
  }
  
  // First pass: collect all geese files and target files
  const processingQueue = [];
  
  for (const geeseFile of geeseFiles) {
    try {
      // Parse .geese file with base configuration from hierarchy
      const baseConfig = hierarchicalConfig.config[tool] || {};
      const geeseData = parser.parseGeeseFile(geeseFile, baseConfig);
      parser.validateGeeseFile(geeseData.frontmatter);
      
      // Collect target files
      const targetFiles = parser.collectTargetFiles(
        geeseData.frontmatter,
        path.dirname(geeseFile),
        geeseData.filename
      );
      
      if (targetFiles.length === 0) {
        continue;
      }
      
      ui.printInfo('📖', `Processing: ${path.basename(geeseFile)}`);
      ui.printInfo('📁', `Found ${targetFiles.length} target file(s)`);
      
      // Show target file selection if multiple files
      let selectedTargets = targetFiles;
      if (targetFiles.length > 1 && !options.all) {
        const { targets } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'targets',
            message: 'Select target files to process:',
            choices: targetFiles.map(file => ({
              name: `${path.relative(path.dirname(geeseFile), file)} (${getFileSize(file)})`,
              value: file,
              checked: true
            })),
            pageSize: 10
          }
        ]);
        
        selectedTargets = targets;
      }
      
      if (selectedTargets.length === 0) {
        continue;
      }
      
      // Add to processing queue
      for (const targetFile of selectedTargets) {
        processingQueue.push({ geeseFile, geeseData, targetFile });
      }
      
    } catch (error) {
      ui.printError(`Error parsing ${path.basename(geeseFile)}: ${error.message}`);
    }
  }
  
  if (processingQueue.length === 0) {
    ui.printWarning('No files to process.');
    return;
  }
  
  // Show configuration box
  const firstGeeseData = processingQueue[0].geeseData;
  const configDisplay = {
    'Tool': tool,
    'Working Dir': workingDir,
    'Files to Process': processingQueue.length
  };
  
  // Add frontmatter config (excluding internal props)
  for (const [key, value] of Object.entries(firstGeeseData.frontmatter)) {
    if (!key.startsWith('_') && key !== 'include' && key !== 'exclude') {
      configDisplay[key] = value;
    }
  }
  
  console.log('');
  ui.printBox('Configuration', configDisplay);
  console.log('');
  
  // Process files
  const allSessions = [];
  const startTime = Date.now();
  
  for (let i = 0; i < processingQueue.length; i++) {
    const { geeseFile, geeseData, targetFile } = processingQueue[i];
    
    const session = await processTargetFile(
      parser,
      toolRunner,
      reportGenerator,
      geeseData,
      targetFile,
      options.dryRun,
      ui
    );
    
    if (session) {
      allSessions.push(session);
    }
  }
  
  // Generate report
  console.log('');
  ui.printInfo('📊', 'Generating report...');
  
  const reportResult = await reportGenerator.saveReport(allSessions, null, true);  // silent=true
  ui.printInfo('📄', `Report saved to: ${path.relative(workingDir, reportResult.filePath)}`);
  
  // Show summary
  const totalTime = Date.now() - startTime;
  const successCount = allSessions.filter(s => s.success).length;
  const failCount = allSessions.length - successCount;
  const totalTokens = allSessions.reduce((sum, s) => sum + (s.tokens?.totalTokens || 0), 0);
  
  console.log('');
  ui.printBox('Summary', {
    'Total Files': allSessions.length,
    'Successful': successCount,
    'Failed': failCount,
    'Total Time': ui.formatDuration(totalTime),
    'Total Tokens': totalTokens || '-'
  });
  
  console.log('');
  if (failCount === 0) {
    ui.printSuccess(`Complete! Processed ${allSessions.length} session(s)`);
  } else {
    ui.printWarning(`Complete with errors. ${successCount}/${allSessions.length} succeeded.`);
  }
  
  return { sessions: allSessions, reportPath: reportResult.filePath };
}

module.exports = runCommand;
