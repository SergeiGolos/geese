/**
 * Interface for report generation
 * Implementations must provide these methods to create and save reports
 * 
 * @interface IReportGenerator
 */
class IReportGenerator {
  /**
   * Create a session entry for the report
   * @param {string} geeseFile - Path to the .geese file
   * @param {string} targetFile - Path to the target file being processed
   * @param {Object} context - Execution context
   * @param {string} prompt - Prompt sent to the tool
   * @param {string} response - Response from the tool
   * @param {number} startTime - Start timestamp (ms)
   * @param {number} endTime - End timestamp (ms)
   * @returns {Object} Session entry object
   * @throws {Error} If not implemented by subclass
   * 
   * @example
   * const entry = generator.createSessionEntry(
   *   '/path/to/file.geese',
   *   '/path/to/target.js',
   *   { include: ['*.js'] },
   *   'Review this code',
   *   'Code looks good',
   *   Date.now() - 1000,
   *   Date.now()
   * );
   */
  createSessionEntry(geeseFile, targetFile, context, prompt, response, startTime, endTime) {
    throw new Error('createSessionEntry() must be implemented by subclass');
  }
  
  /**
   * Save report with multiple session entries
   * @param {Array<Object>} sessions - Array of session entries
   * @param {Object} [options] - Additional options for report generation
   * @returns {Promise<string>} Path to saved report file
   * @throws {Error} If not implemented by subclass
   * 
   * @example
   * const reportPath = await generator.saveReport(sessions, { format: 'markdown' });
   * console.log(`Report saved to: ${reportPath}`);
   */
  async saveReport(sessions, options = {}) {
    throw new Error('saveReport(sessions, options) must be implemented by subclass');
  }
}

module.exports = IReportGenerator;
