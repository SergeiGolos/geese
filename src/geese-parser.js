const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');
const Handlebars = require('handlebars');
const glob = require('glob');

class GeeseParser {
  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  registerHelpers() {
    // Register any custom handlebars helpers if needed
    this.handlebars.registerHelper('json', (obj) => JSON.stringify(obj, null, 2));
  }

  /**
   * Parse a .geese file
   * @param {string} filePath - Path to the .geese file
   * @returns {Object} Parsed content with frontmatter and template
   */
  parseGeeseFile(filePath) {
    try {
      let fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Preprocess: Remove @ prefix from YAML keys for compatibility
      // This allows files to use @include, @recipe, etc. which will be normalized to include, recipe
      fileContent = fileContent.replace(/^(\s*)@([a-zA-Z_][a-zA-Z0-9_]*):/gm, '$1$2:');
      
      const parsed = matter(fileContent);
      
      return {
        frontmatter: parsed.data,
        template: parsed.content,
        filePath: filePath,
        filename: path.basename(filePath, '.geese')
      };
    } catch (error) {
      throw new Error(`Failed to parse .geese file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Find all .geese files in a directory
   * @param {string} directory - Directory to search
   * @returns {Array} Array of .geese file paths
   */
  findGeeseFiles(directory) {
    try {
      const pattern = path.join(directory, '**/*.geese').replace(/\\/g, '/');
      return glob.sync(pattern);
    } catch (error) {
      throw new Error(`Failed to find .geese files: ${error.message}`);
    }
  }

  /**
   * Collect target files based on include/exclude patterns
   * @param {Object} frontmatter - Frontmatter from .geese file
   * @param {string} baseDir - Base directory for file collection
   * @returns {Array} Array of target file paths
   */
  collectTargetFiles(frontmatter, baseDir) {
    const include = frontmatter.include || [];
    const exclude = frontmatter.exclude || [];
    
    let allFiles = [];
    
    // Collect files from include patterns
    for (const pattern of include) {
      const files = glob.sync(pattern, {
        cwd: baseDir,
        absolute: true,
        ignore: exclude,
        nodir: true
      });
      allFiles = allFiles.concat(files);
    }
    
    // Remove duplicates
    allFiles = [...new Set(allFiles)];
    
    return allFiles;
  }

  /**
   * Prepare template context for a target file
   * @param {Object} geeseData - Parsed .geese file data
   * @param {string} targetFile - Path to target file
   * @returns {Object} Template context
   */
  prepareContext(geeseData, targetFile) {
    const { frontmatter, filename } = geeseData;
    
    // Separate goose-level properties (with @ prefix) from other properties
    const context = {};
    const gooseConfig = {};
    
    // Add predefined properties
    context.filename = path.basename(targetFile);
    context.content = fs.readFileSync(targetFile, 'utf8');
    context.filepath = targetFile;
    context.geese_file = filename;
    
    // Process frontmatter properties
    for (const [key, value] of Object.entries(frontmatter)) {
      if (key.startsWith('@') || ['include', 'exclude', 'recipe', 'model'].includes(key)) {
        // Handle @ prefix properties and core Goose config
        const configKey = key.startsWith('@') ? key.substring(1) : key;
        gooseConfig[configKey] = value;
      } else {
        // Regular token replacement
        context[key] = value;
      }
    }
    
    // Add goose config to context
    context._gooseConfig = gooseConfig;
    
    return context;
  }

  /**
   * Compile and render the template with context
   * @param {string} template - Handlebars template string
   * @param {Object} context - Template context
   * @returns {string} Rendered template
   */
  renderTemplate(template, context) {
    try {
      const compiledTemplate = this.handlebars.compile(template);
      return compiledTemplate(context);
    } catch (error) {
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }

  /**
   * Validate .geese file structure
   * @param {Object} frontmatter - Frontmatter to validate
   * @returns {boolean} True if valid
   */
  validateGeeseFile(frontmatter) {
    // Check for required fields
    if (!frontmatter.include || !Array.isArray(frontmatter.include)) {
      throw new Error('.geese file must have an "include" array');
    }
    
    if (!frontmatter.recipe) {
      throw new Error('.geese file must have a "recipe" property');
    }
    
    return true;
  }
}

module.exports = GeeseParser;
