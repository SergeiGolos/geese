const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');
const Handlebars = require('handlebars');
const glob = require('glob');
const PipeOperations = require('./pipe-operations');
const SchemaValidator = require('./utils/schema-validator');

// System properties that control geese behavior (use $ prefix for visual distinction)
const SYSTEM_PROPERTIES = [
  '$include', '$exclude', '$recipe', '$model', 
  '$temperature', '$max_tokens', '$flags'
];

// Extract property names without $ prefix for backward compatibility checks
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
      
      // For backward compatibility: Convert @ prefix to $ prefix for system properties
      // @include -> $include, @recipe -> $recipe, etc.
      const propertyPattern = SYSTEM_PROPERTY_NAMES.join('|');
      const regex = new RegExp(`^(\\s*)@(${propertyPattern}):`, 'gm');
      fileContent = fileContent.replace(regex, '$1$$$2:');
      
      // Auto-quote pipe operations if not already quoted
      // This allows users to write: key: "value" ~> operation
      // Instead of requiring: key: '"value" ~> operation'
      fileContent = this.preprocessPipeOperations(fileContent);
      
      const parsed = matter(fileContent);
      
      // Separate system properties ($) from user properties
      const systemProps = {};
      const userProps = {};
      
      for (const [key, value] of Object.entries(parsed.data)) {
        // Ensure key is a string
        const keyStr = String(key);
        
        if (keyStr.startsWith('$')) {
          // System property with $ prefix
          systemProps[keyStr.substring(1)] = value; // Remove $ prefix
        } else if (SYSTEM_PROPERTY_NAMES.includes(keyStr)) {
          // Backward compatibility: system property without $ prefix
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
        mergedFrontmatter['$' + key] = value;
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
      } else if (SYSTEM_PROPERTY_NAMES.includes(key)) {
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
        if (typeof value === 'string' && value.includes('~>')) {
          // Execute pipe chain with current context
          context[key] = this.pipeOperations.executePipeChain(value, context);
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
      allowPrefixVariants: true  // Support both $include and include
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
