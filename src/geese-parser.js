const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');
const Handlebars = require('handlebars');
const glob = require('glob');
const pipeOperations = require('./pipe-operations');

// System properties that control geese behavior (use $ prefix for visual distinction)
const SYSTEM_PROPERTIES = [
  '$include', '$exclude', '$recipe', '$model', 
  '$temperature', '$max_tokens', '$flags'
];

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
      
      // For backward compatibility: Convert @ prefix to $ prefix for system properties
      // @include -> $include, @recipe -> $recipe, etc.
      fileContent = fileContent.replace(/^(\s*)@(include|exclude|recipe|model|temperature|max_tokens|flags):/gm, '$1$$$2:');
      
      const parsed = matter(fileContent);
      
      return {
        frontmatter: parsed.data,
        template: parsed.content,
        filePath: filePath,
        filename: path.basename(filePath, '.geese'),
        fileDir: path.dirname(filePath)
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
    // Support both $ prefix and no prefix for backward compatibility
    const include = frontmatter.$include || frontmatter.include || [];
    const exclude = frontmatter.$exclude || frontmatter.exclude || [];
    
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
    const { frontmatter, filename, fileDir } = geeseData;
    
    // Separate system properties ($ prefix) from user properties
    const context = {};
    const gooseConfig = {};
    
    // Add predefined properties
    context.filename = path.basename(targetFile);
    context.content = fs.readFileSync(targetFile, 'utf8');
    context.filepath = targetFile;
    context.geese_file = filename;
    context._geeseFileDir = fileDir; // For pipe operations that need file resolution
    
    // First pass: Separate system properties from user properties
    const userProperties = {};
    for (const [key, value] of Object.entries(frontmatter)) {
      if (key.startsWith('$')) {
        // System property - strip $ and add to goose config
        const configKey = key.substring(1);
        gooseConfig[configKey] = value;
      } else if (['include', 'exclude', 'recipe', 'model', 'temperature', 'max_tokens', 'flags'].includes(key)) {
        // Backward compatibility for non-prefixed system properties
        gooseConfig[key] = value;
      } else {
        // User property - may contain pipe operations
        userProperties[key] = value;
      }
    }
    
    // Second pass: Process user properties with pipe operations
    for (const [key, value] of Object.entries(userProperties)) {
      try {
        // Check if value is a string with pipe operations
        if (typeof value === 'string' && value.includes('|>')) {
          // Execute pipe chain with current context
          context[key] = pipeOperations.executePipeChain(value, context);
        } else {
          // No pipes, use value as-is
          context[key] = value;
        }
      } catch (error) {
        throw new Error(`Error processing property "${key}" with pipes: ${error.message}`);
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
    // Check for required fields (support both $ prefix and no prefix)
    const include = frontmatter.$include || frontmatter.include;
    if (!include || !Array.isArray(include)) {
      throw new Error('.geese file must have an "$include" (or "include") array');
    }
    
    const recipe = frontmatter.$recipe || frontmatter.recipe;
    if (!recipe) {
      throw new Error('.geese file must have a "$recipe" (or "recipe") property');
    }
    
    return true;
  }
  
  /**
   * Load custom pipe operations from a directory
   * @param {string} directory - Directory containing custom pipe files
   */
  loadCustomPipes(directory) {
    if (!fs.existsSync(directory)) {
      return;
    }
    
    const files = fs.readdirSync(directory).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const filePath = path.join(directory, file);
      try {
        pipeOperations.loadCustomPipe(filePath);
      } catch (error) {
        console.warn(`Warning: Failed to load custom pipe ${file}: ${error.message}`);
      }
    }
  }
}

module.exports = GeeseParser;
