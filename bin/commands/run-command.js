const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');
const CLIArgumentParser = require('../../src/cli-argument-parser');

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
 * @returns {Promise<Object|null>} Session object or null
 */
async function processTargetFile(parser, toolRunner, reportGenerator, geeseData, targetFile, dryRun = false) {
  const startTime = Date.now();
  
  reportGenerator.logSessionStart(geeseData.filePath, targetFile);
  
  try {
    // Prepare context
    const context = parser.prepareContext(geeseData, targetFile);
    
    // Generate prompt
    const prompt = parser.renderTemplate(geeseData.template, context);
    
    // Execute tool (runner handles dry-run internally)
    const result = await toolRunner.processFile(targetFile, prompt, context._gooseConfig);
    const endTime = Date.now();
    
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
    
    reportGenerator.logSessionEnd(
      geeseData.filePath,
      targetFile,
      endTime - startTime,
      result.success
    );
    
    return session;
    
  } catch (error) {
    const endTime = Date.now();
    console.error(chalk.red(`    ❌ Error: ${error.message}`));
    
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
    
    reportGenerator.logSessionEnd(
      geeseData.filePath,
      targetFile,
      endTime - startTime,
      false
    );
    
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
  console.log(chalk.blue('🦢 Geese - AI-powered file processing tool'));
  const workingDir = path.resolve(directory);
  console.log(chalk.gray(`Working directory: ${workingDir}`));
  
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
    console.log(chalk.cyan('\n🔍 Configuration Debug Info:'));
    console.log(JSON.stringify(hierarchicalConfig, null, 2));
    console.log();
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
    // File writer runner for dry-run with file output
    toolRunner.setRunnerType('file', { outputPath: options.dryRunFile });
    console.log(chalk.cyan(`🔍 Dry-run mode: Writing commands to ${options.dryRunFile}`));
  } else if (options.dryRun) {
    // Console logger runner for dry-run without file
    toolRunner.setRunnerType('console');
    console.log(chalk.cyan('🔍 Dry-run mode: Logging to console'));
  }
  
  // Check if tool is available (unless dry run)
  if (!options.dryRun && !options.dryRunFile) {
    const isAvailable = await toolRunner.checkAvailable();
    if (!isAvailable) {
      console.log(chalk.yellow(`⚠️  Warning: ${tool} not found in PATH.`));
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
    console.log(chalk.blue(`📄 Processing file: ${path.basename(filePath)}`));
  } else {
    // Use hierarchical file discovery
    const geeseFileFinder = container.get('geeseFileFinder');
    geeseFiles = await geeseFileFinder.discoverGeeseFiles(workingDir);
    
    // Fallback to old method if no files found with new method
    if (geeseFiles.length === 0) {
      geeseFiles = parser.findGeeseFiles(workingDir);
    }
    
    if (geeseFiles.length === 0) {
      console.log(chalk.yellow('No .geese files found in the specified directory.'));
      console.log(chalk.gray('Tip: Use "geese new <name>" to create a new .geese file'));
      return;
    }
    
    // Auto-run if only one file
    if (geeseFiles.length === 1) {
      console.log(chalk.blue(`📄 Found one .geese file: ${path.basename(geeseFiles[0])}`));
    } else {
      // Show selection screen for multiple files
      console.log(chalk.blue(`📋 Found ${geeseFiles.length} .geese file(s)`));
      
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
    console.log(chalk.yellow('No files selected for processing.'));
    return;
  }
  
  // Process each .geese file
  const allSessions = [];
  
  for (const geeseFile of geeseFiles) {
    console.log(chalk.blue(`\n📖 Processing: ${path.basename(geeseFile)}`));
    
    try {
      // Parse .geese file with base configuration from hierarchy
      const baseConfig = hierarchicalConfig.config[tool] || {};
      const geeseData = parser.parseGeeseFile(geeseFile, baseConfig);
      parser.validateGeeseFile(geeseData.frontmatter);
      
      // Collect target files
      const targetFiles = parser.collectTargetFiles(
        geeseData.frontmatter,
        path.dirname(geeseFile)
      );
      
      if (targetFiles.length === 0) {
        console.log(chalk.yellow('  ⚠️  No target files found'));
        continue;
      }
      
      console.log(chalk.green(`  📁 Found ${targetFiles.length} target file(s)`));
      
      // Show target file selection
      let selectedTargets = targetFiles;
      if (targetFiles.length > 1) {
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
        console.log(chalk.yellow('  No target files selected'));
        continue;
      }
      
      // Process selected target files
      for (const targetFile of selectedTargets) {
        const relativePath = path.relative(path.dirname(geeseFile), targetFile);
        console.log(chalk.cyan(`  🔄 Processing: ${relativePath}`));
        
        const session = await processTargetFile(
          parser,
          toolRunner,
          reportGenerator,
          geeseData,
          targetFile,
          options.dryRun
        );
        
        if (session) {
          allSessions.push(session);
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`  ❌ Error: ${error.message}`));
    }
  }
  
  // Generate final report
  if (allSessions.length > 0) {
    console.log(chalk.blue('\n📊 Generating report...'));
    const report = await reportGenerator.saveReport(allSessions);
    console.log(chalk.green(`✅ Complete! Processed ${allSessions.length} session(s)`));
    console.log(chalk.gray(`   Report: ${report}`));
  } else {
    console.log(chalk.yellow('\n⚠️  No sessions were processed'));
  }
}

module.exports = runCommand;
