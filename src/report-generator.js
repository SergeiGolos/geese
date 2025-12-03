const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk').default || require('chalk');
const IReportGenerator = require('./interfaces/report-generator');

class ReportGenerator extends IReportGenerator {
  constructor(outputDir = './logs') {
    super();
    this.outputDir = outputDir;
    this.ensureOutputDir();
  }

  async ensureOutputDir() {
    await fs.ensureDir(this.outputDir);
  }

  generateFilename(baseFilename, timestamp = new Date().toISOString().replace(/[:.]/g, '-')) {
    return `${baseFilename}_${timestamp}.log.md`;
  }

  createSessionEntry(geeseFile, targetFile, context, prompt, response, startTime, endTime) {
    const duration = endTime - startTime;
    
    return {
      geeseFile,
      targetFile,
      context: this.sanitizeContext(context),
      prompt: this.sanitizeForMarkdown(prompt),
      response: this.sanitizeForMarkdown(response),
      startTime,
      endTime,
      duration,
      tokens: this.extractTokenInfo(response),
      success: true
    };
  }

  sanitizeContext(context) {
    const sanitized = { ...context };
    
    // Remove or truncate sensitive/large content
    if (sanitized.content && sanitized.content.length > 1000) {
      sanitized.content = sanitized.content.substring(0, 1000) + '... (truncated)';
    }
    
    return sanitized;
  }

  sanitizeForMarkdown(content) {
    if (typeof content !== 'string') return '';
    
    return content
      .replace(/```/g, '\\`\\`\\`')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  extractTokenInfo(response) {
    // This would extract token information from the goose response
    // For now, return placeholder data
    return {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0
    };
  }

  generateMarkdownReport(sessions) {
    const timestamp = new Date().toISOString();
    let report = `# Geese Processing Report\n\n`;
    report += `**Generated:** ${timestamp}\n`;
    report += `**Total Sessions:** ${sessions.length}\n`;
    report += `**Total Duration:** ${this.calculateTotalDuration(sessions)}ms\n\n`;

    // Summary table
    report += `## Summary\n\n`;
    report += `| Geese File | Target File | Duration | Status |\n`;
    report += `|------------|-------------|----------|---------|\n`;
    
    for (const session of sessions) {
      const status = session.success ? '✅ Success' : '❌ Failed';
      report += `| ${path.basename(session.geeseFile)} | ${path.basename(session.targetFile)} | ${session.duration}ms | ${status} |\n`;
    }
    
    report += `\n`;

    // Detailed sessions
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      report += `## Session ${i + 1}: ${path.basename(session.geeseFile)} → ${path.basename(session.targetFile)}\n\n`;
      
      report += `**Start Time:** ${new Date(session.startTime).toISOString()}\n`;
      report += `**Duration:** ${session.duration}ms\n`;
      report += `**Status:** ${session.success ? 'Success' : 'Failed'}\n\n`;
      
      // Geese Configuration
      if (session.context._gooseConfig && Object.keys(session.context._gooseConfig).length > 0) {
        report += `### Goose Configuration\n\n`;
        report += `\`\`\`json\n${JSON.stringify(session.context._gooseConfig, null, 2)}\n\`\`\`\n\n`;
      }
      
      // Context Variables
      report += `### Context Variables\n\n`;
      const contextForDisplay = { ...session.context };
      delete contextForDisplay._gooseConfig;
      delete contextForDisplay.content; // Content shown separately
      
      report += `\`\`\`json\n${JSON.stringify(contextForDisplay, null, 2)}\n\`\`\`\n\n`;
      
      // File Content Preview
      if (session.context.content) {
        report += `### File Content Preview\n\n`;
        const preview = session.context.content.length > 500 
          ? session.context.content.substring(0, 500) + '...(truncated)'
          : session.context.content;
        report += `\`\`\`\n${preview}\n\`\`\`\n\n`;
      }
      
      // Generated Prompt
      report += `### Generated Prompt\n\n`;
      report += `\`\`\`\n${session.prompt}\n\`\`\`\n\n`;
      
      // Response
      report += `### Response\n\n`;
      if (session.response) {
        report += `\`\`\`\n${session.response}\n\`\`\`\n\n`;
      } else {
        report += `*No response received*\n\n`;
      }
      
      // Token Information
      report += `### Token Information\n\n`;
      report += `- Input Tokens: ${session.tokens.inputTokens}\n`;
      report += `- Output Tokens: ${session.tokens.outputTokens}\n`;
      report += `- Total Tokens: ${session.tokens.totalTokens}\n\n`;
      
      report += `---\n\n`;
    }

    return report;
  }

  calculateTotalDuration(sessions) {
    return sessions.reduce((total, session) => total + session.duration, 0);
  }

  async saveReport(sessions, customFilename = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = customFilename || this.generateFilename('geese_session', timestamp);
    const filePath = path.join(this.outputDir, filename);
    
    const report = this.generateMarkdownReport(sessions);
    
    await fs.writeFile(filePath, report, 'utf8');
    
    console.log(chalk.green(`📄 Report saved to: ${filePath}`));
    
    return {
      filename,
      filePath,
      size: Buffer.byteLength(report, 'utf8')
    };
  }

  logSessionStart(geeseFile, targetFile) {
    console.log(chalk.blue(`🚀 Processing: ${path.basename(geeseFile)} → ${path.basename(targetFile)}`));
  }

  logSessionEnd(geeseFile, targetFile, duration, success = true) {
    const status = success ? chalk.green('✅') : chalk.red('❌');
    console.log(`${status} Completed: ${path.basename(geeseFile)} → ${path.basename(targetFile)} (${duration}ms)`);
  }

  logError(message, error = null) {
    console.error(chalk.red(`❌ Error: ${message}`));
    if (error) {
      console.error(chalk.gray(error.stack || error));
    }
  }
}

module.exports = ReportGenerator;
