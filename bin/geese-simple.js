#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk').default || require('chalk');

// Import our modules
const GeeseParser = require('../src/geese-parser');
const GooseRunner = require('../src/goose-runner');
const ReportGenerator = require('../src/report-generator');

const program = new Command();

program
  .name('geese-simple')
  .description('Simple version of Geese - always processes all .geese files')
  .version('1.0.0');

program
  .argument('[directory]', 'Directory to search for .geese files', '.')
  .option('-o, --output <dir>', 'Output directory for logs', './logs')
  .option('-g, --goose-path <path>', 'Path to goose executable', 'goose')
  .option('--dry-run', 'Show what would be processed without executing goose')
  .action(async (directory, options) => {
    try {
      await main(directory, options);
    } catch (error) {
      console.error(chalk.red('Fatal error:'), error.message);
      process.exit(1);
    }
  });

async function main(directory, options) {
  console.log(chalk.blue('🦢 Geese Simple - AI-powered file processing tool'));
  console.log(chalk.gray(`Working directory: ${path.resolve(directory)}`));
  
  // Initialize components
  const parser = new GeeseParser();
  const gooseRunner = new GooseRunner();
  const reportGenerator = new ReportGenerator(options.output);
  
  // Set custom goose path if provided
  if (options.goosePath) {
    gooseRunner.setGoosePath(options.goosePath);
  }
  
  // Check if goose is available (unless dry run)
  if (!options.dryRun) {
    const isGooseAvailable = await gooseRunner.checkGoeseAvailable();
    if (!isGooseAvailable) {
      console.log(chalk.yellow('⚠️  Warning: goose not found in PATH. Continuing with dry-run mode.'));
      options.dryRun = true;
    }
  }
  
  // Find all .geese files in directory
  const geeseFiles = parser.findGeeseFiles(path.resolve(directory));
  
  if (geeseFiles.length === 0) {
    console.log(chalk.yellow('No .geese files found in the specified directory.'));
    return;
  }
  
  console.log(chalk.green(`📋 Found ${geeseFiles.length} .geese file(s) to process`));
  
  // Process each .geese file
  const allSessions = [];
  
  for (const geeseFile of geeseFiles) {
    console.log(chalk.blue(`\n📖 Processing .geese file: ${path.basename(geeseFile)}`));
    
    try {
      const geeseData = parser.parseGeeseFile(geeseFile);
      parser.validateGeeseFile(geeseData.frontmatter);
      
      // Collect target files
      const targetFiles = parser.collectTargetFiles(
        geeseData.frontmatter,
        path.dirname(geeseFile)
      );
      
      if (targetFiles.length === 0) {
        console.log(chalk.yellow(`  ⚠️  No target files found for include/exclude patterns`));
        continue;
      }
      
      console.log(chalk.green(`  📁 Found ${targetFiles.length} target file(s)`));
      
      // Process each target file
      for (const targetFile of targetFiles) {
        const session = await processTargetFile(
          parser,
          gooseRunner,
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
      console.error(chalk.red(`  ❌ Error processing ${geeseFile}: ${error.message}`));
    }
  }
  
  // Generate final report
  if (allSessions.length > 0) {
    console.log(chalk.blue('\n📊 Generating final report...'));
    const report = await reportGenerator.saveReport(allSessions);
    console.log(chalk.green(`✅ Processing complete! ${allSessions.length} session(s) logged.`));
  } else {
    console.log(chalk.yellow('\n⚠️  No sessions were processed.'));
  }
}

async function processTargetFile(parser, gooseRunner, reportGenerator, geeseData, targetFile, dryRun = false) {
  const startTime = Date.now();
  
  reportGenerator.logSessionStart(geeseData.filePath, targetFile);
  
  try {
    // Prepare context
    const context = parser.prepareContext(geeseData, targetFile);
    
    // Generate prompt
    const prompt = parser.renderTemplate(geeseData.template, context);
    
    if (dryRun) {
      console.log(chalk.cyan(`  📝 Generated prompt (dry run):`));
      console.log(chalk.gray(prompt.substring(0, 200) + '...'));
      return null;
    }
    
    // Execute goose
    const result = await gooseRunner.processFile(targetFile, prompt, context._gooseConfig);
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
    
    reportGenerator.logSessionEnd(geeseData.filePath, targetFile, endTime - startTime, result.success);
    
    return session;
    
  } catch (error) {
    const endTime = Date.now();
    console.error(chalk.red(`    ❌ Error: ${error.message}`));
    
    // Create error session entry
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
    
    reportGenerator.logSessionEnd(geeseData.filePath, targetFile, endTime - startTime, false);
    
    return session;
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, 'reason:', reason);
  process.exit(1);
});

program.parse();
