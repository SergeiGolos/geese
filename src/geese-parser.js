const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');
const Handlebars = require('handlebars');
const glob = require('glob');
const PipeOperations = require('./pipe-operations');
const SchemaValidator = require('./utils/schema-validator');

// System properties that control geese behavior (use _ prefix to identify them)
const SYSTEM_PROPERTIES = [
  '_include', '_exclude', '_recipe', '_model', 
  '_temperature', '_max_tokens', '_config', '_profile',
  '_resume', '_log_level', '_no_color', '_flags'
];

// Extract property names without _ prefix for backward compatibility checks
const SYSTEM_PROPERTY_NAMES = SYSTEM_PROPERTIES.map(prop => prop.substring(1));

class GeeseParser {
  /**
   * Create a new GeeseParser
   * @param {PipeOperations} pipeOperations - Optional PipeOperations instance for dependency injection
   */
  constructor(pipeOperations = null) {
    this.pipeOperations = pipeOperations || new PipeOperations();
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  /**
   * Register custom Handlebars helpers
   * Adds helpers like 'json' for template rendering
   * @private
   */
  registerHelpers() {
    // Register any custom handlebars helpers if needed
    this.handlebars.registerHelper('json', (obj) => JSON.stringify(obj, null, 2));
  }

  /**
   * Parse a .geese file
   * @param {string} filePath - Path to the .geese file
   * @param {Object} baseConfig - Base configuration from hierarchy (optional)
   * @returns {Object} Parsed content with frontmatter and template
   */
  parseGeeseFile(filePath, baseConfig = {}) {
    try {
      let fileContent = fs.readFileSync(filePath, 'utf8');
      
      // For backward compatibility: Convert @ and $ prefixes to _ prefix for system properties
      // @include -> _include, $include -> _include, @recipe -> _recipe, etc.
      const propertyPattern = SYSTEM_PROPERTY_NAMES.join('|');
      const regexAt = new RegExp(`^(\\s*)@(${propertyPattern}):`, 'gm');
      const regexDollar = new RegExp(`^(\\s*)\\$(${propertyPattern}):`, 'gm');
      fileContent = fileContent.replace(regexAt, '$1_$2:');
      fileContent = fileContent.replace(regexDollar, '$1_$2:');
      
      // Auto-quote pipe operations if not already quoted
      // This allows users to write: key: "value" ~> operation
      // Instead of requiring: key: '"value" ~> operation'
      fileContent = this.preprocessPipeOperations(fileContent);
      
      const parsed = matter(fileContent);
      
      // Separate system properties (_) from user properties
      const systemProps = {};
      const userProps = {};
      
      for (const [key, value] of Object.entries(parsed.data)) {
        // Ensure key is a string
        const keyStr = String(key);
        
        if (keyStr.startsWith('_')) {
          // System property with _ prefix
          systemProps[keyStr.substring(1)] = value; // Remove _ prefix
        } else if (keyStr.startsWith('$')) {
          // Backward compatibility: system property with $ prefix
          systemProps[keyStr.substring(1)] = value; // Remove $ prefix
        } else if (SYSTEM_PROPERTY_NAMES.includes(keyStr)) {
          // Backward compatibility: system property without prefix
          systemProps[keyStr] = value;
        } else {
          // User property
          userProps[keyStr] = value;
        }
      }
      
      // Merge base config with .geese file system properties
      // .geese file properties override base config
      const mergedConfig = this.deepMerge(baseConfig, systemProps);
      
      // Reconstruct frontmatter with merged config and user properties
      const mergedFrontmatter = { ...userProps };
      for (const [key, value] of Object.entries(mergedConfig)) {
        mergedFrontmatter['_' + key] = value;
      }
      
      return {
        frontmatter: mergedFrontmatter,
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
   * Deep merge multiple configuration objects
   * Later objects override earlier ones
   * @param {...Object} configs - Configuration objects to merge
   * @returns {Object} Merged configuration
   */
  deepMerge(...configs) {
    const result = {};
    
    for (const config of configs) {
      // Skip null, undefined, or non-objects
      if (!config || typeof config !== 'object') {
        continue;
      }
      
      for (const key in config) {
        if (Object.prototype.hasOwnProperty.call(config, key)) {
          const value = config[key];
          
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Recursively merge objects
            result[key] = this.deepMerge(result[key] || {}, value);
          } else {
            // Override with new value (includes arrays)
            result[key] = value;
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Preprocess pipe operations to ensure proper YAML quoting
   * @param {string} content - File content
   * @returns {string} Processed content
   */
  preprocessPipeOperations(content) {
    // Split into frontmatter and template sections
    const parts = content.split(/^---\s*$/m);
    if (parts.length < 3) {
      return content; // No frontmatter
    }
    
    const frontmatter = parts[1];
    const rest = parts.slice(2).join('---');
    
    // Process each line in the frontmatter
    const lines = frontmatter.split('\n');
    const processedLines = lines.map(line => {
      // Check if line contains pipe operator and is a key-value pair
      if (line.includes('~>') && /^\s*[a-zA-Z_][a-zA-Z0-9_]*:\s/.test(line)) {
        // Extract the key and value parts
        const match = line.match(/^(\s*[a-zA-Z_][a-zA-Z0-9_]*:\s+)(.+)$/);
        if (match) {
          const [, prefix, value] = match;
          const trimmedValue = value.trim();
          
          // Check if the entire pipe expression is already wrapped in quotes
          const isFullyQuoted = (
            (trimmedValue.startsWith("'") && trimmedValue.endsWith("'")) ||
            (trimmedValue.startsWith('"') && trimmedValue.endsWith('"'))
          );
          
          if (!isFullyQuoted) {
            // Wrap the entire expression in single quotes
            // Escape any single quotes in the value by doubling them (YAML style)
            const escapedValue = value.replace(/'/g, "''");
            return `${prefix}'${escapedValue}'`;
          }
        }
      }
      return line;
    });
    
    return parts[0] + '---\n' + processedLines.join('\n') + '---' + rest;
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
   * Process a pattern with templates and pipes
   * @param {string} pattern - Pattern to process
   * @param {Object} context - Context for template/pipe evaluation
   * @param {string} patternType - Type of pattern (for error messages)
   * @returns {string|Array} Processed pattern (can be array if pipes return array)
   * @private
   */
  processPattern(pattern, context, patternType) {
    try {
      let processed = pattern;
      
      if (processed.includes('{{')) {
        processed = this.renderTemplate(processed, context);
      }
      
      if (processed.includes('~>')) {
        processed = this.pipeOperations.executePipeChain(processed, context);
      }
      
      return processed;
    } catch (error) {
      throw new Error(`Failed to process ${patternType} pattern "${pattern}": ${error.message}`);
    }
  }

  /**
   * Collect target files based on include/exclude patterns
   * Supports templates and pipes in patterns using hidden system variables
   * @param {Object} frontmatter - Frontmatter from .geese file
   * @param {string} baseDir - Base directory for file collection
   * @param {string} geeseFileName - Name of the .geese file (for hidden variables)
   * @returns {Array} Array of target file paths
   */
  collectTargetFiles(frontmatter, baseDir, geeseFileName = '') {
    // Support both _ prefix and no prefix for backward compatibility
    let include = frontmatter._include || frontmatter.$include || frontmatter.include || [];
    let exclude = frontmatter._exclude || frontmatter.$exclude || frontmatter.exclude || [];
    
    // Create minimal context with hidden system variables for template/pipe evaluation
    const hiddenSystemContext = {
      geese_file: geeseFileName,
      working_dir: process.cwd()
    };
    
    // Process include patterns if they contain templates or pipes
    if (typeof include === 'string') {
      const processedInclude = this.processPattern(include, hiddenSystemContext, 'include');
      include = Array.isArray(processedInclude) ? processedInclude : [processedInclude];
    } else if (Array.isArray(include)) {
      include = include.map((pattern, index) => {
        if (typeof pattern !== 'string') return pattern;
        return this.processPattern(pattern, hiddenSystemContext, `include[${index}]`);
      });
    }
    
    // Process exclude patterns if they contain templates or pipes
    if (typeof exclude === 'string') {
      const processedExclude = this.processPattern(exclude, hiddenSystemContext, 'exclude');
      exclude = Array.isArray(processedExclude) ? processedExclude : [processedExclude];
    } else if (Array.isArray(exclude)) {
      exclude = exclude.map((pattern, index) => {
        if (typeof pattern !== 'string') return pattern;
        return this.processPattern(pattern, hiddenSystemContext, `exclude[${index}]`);
      });
    }
    
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
   * Load order: hidden system → system level → hidden context → context level
   * @param {Object} geeseData - Parsed .geese file data
   * @param {string} targetFile - Path to target file
   * @returns {Object} Template context
   */
  prepareContext(geeseData, targetFile) {
    const { frontmatter, filename, fileDir } = geeseData;
    
    // Initialize context and goose config
    const context = {};
    const gooseConfig = {};
    
    // STEP 1: Add hidden system-level variables (automatically bound at system level)
    context.geese_file = filename; // Hidden system variable: name of the .geese file (without extension)
    context.working_dir = process.cwd(); // Hidden system variable: current working directory
    
    // STEP 2: Process system-level properties
    // Separate system properties (_ prefix) from user properties
    const systemProperties = {};
    const userProperties = {};
    
    for (const [key, value] of Object.entries(frontmatter)) {
      if (key.startsWith('_')) {
        // System property - strip _ and add to system properties for processing
        const configKey = key.substring(1);
        systemProperties[configKey] = value;
      } else if (key.startsWith('$')) {
        // Backward compatibility for $ prefix - strip and add to system properties
        const configKey = key.substring(1);
        systemProperties[configKey] = value;
      } else if (SYSTEM_PROPERTY_NAMES.includes(key)) {
        // Backward compatibility for non-prefixed system properties
        systemProperties[key] = value;
      } else {
        // User property - may contain pipe operations or templates
        userProperties[key] = value;
      }
    }
    
    // Process system properties - they can now use templates and pipes
    for (const [key, value] of Object.entries(systemProperties)) {
      try {
        let processedValue = value;
        
        // Check if value is a string with templates or pipe operations
        if (typeof value === 'string') {
          // First apply templates using current context
          if (value.includes('{{')) {
            processedValue = this.renderTemplate(value, context);
          }
          
          // Then apply pipe operations if present
          if (processedValue.includes('~>')) {
            processedValue = this.pipeOperations.executePipeChain(processedValue, context);
          }
        }
        
        // Add to goose config WITHOUT the _ prefix (stripped)
        gooseConfig[key] = processedValue;
      } catch (error) {
        throw new Error(`Error processing system property "_${key}" with templates/pipes: ${error.message}`);
      }
    }
    
    // STEP 3: Add hidden context-level variables (based on filename being processed)
    context.filename = path.basename(targetFile);
    context.filepath = targetFile;
    context.content = fs.readFileSync(targetFile, 'utf8');
    context._geeseFileDir = fileDir; // Internal: For pipe operations that need file resolution
    
    // STEP 4: Process context-level (user) properties with pipe operations and templates
    for (const [key, value] of Object.entries(userProperties)) {
      try {
        let processedValue = value;
        
        // Check if value is a string with templates or pipe operations
        if (typeof value === 'string') {
          // First apply templates using current context
          if (value.includes('{{')) {
            processedValue = this.renderTemplate(value, context);
          }
          
          // Then apply pipe operations if present
          if (processedValue.includes('~>')) {
            processedValue = this.pipeOperations.executePipeChain(processedValue, context);
          }
        }
        
        context[key] = processedValue;
      } catch (error) {
        throw new Error(`Error processing property "${key}" with templates/pipes: ${error.message}`);
      }
    }
    
    // Add goose config to context (internal use)
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
   * Validate .geese file structure using schema validation
   * @param {Object} frontmatter - Frontmatter to validate
   * @param {Object} [schema] - Optional schema to validate against. If not provided, uses default schema.
   * @returns {boolean} True if valid
   * @throws {Error} If validation fails
   */
  validateGeeseFile(frontmatter, schema = null) {
    // Default schema for .geese files (matches goose-runner requirements)
    const defaultSchema = SchemaValidator.createSchema(
      ['include', 'recipe'],  // required fields
      ['exclude', 'model', 'temperature', 'max_tokens', 'flags'],  // optional fields
      {
        include: 'array',
        exclude: 'array',
        recipe: 'string'
      }
    );
    
    const validationSchema = schema || defaultSchema;
    
    const result = SchemaValidator.validate(frontmatter, validationSchema, {
      allowPrefixVariants: true  // Support _include, $include, @include, and include
    });
    
    if (!result.valid) {
      // Create .geese-specific error message from validation errors
      const errorList = result.errors.join('; ');
      throw new Error(`.geese file validation failed: ${errorList}`);
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
        this.pipeOperations.loadCustomPipe(filePath);
      } catch (error) {
        console.warn(`Warning: Failed to load custom pipe ${file}: ${error.message}`);
      }
    }
  }
}

module.exports = GeeseParser;
