/**
 * SchemaValidator - Utility for validating data against schemas
 * 
 * Provides methods to validate objects against schema definitions with
 * support for required fields, optional fields, and type checking.
 */

class SchemaValidator {
  /**
   * Validate data against a schema
   * @param {Object} data - Data to validate
   * @param {Object} schema - Schema definition with required and optional arrays
   * @param {string[]} schema.required - Array of required field names
   * @param {string[]} schema.optional - Array of optional field names
   * @param {Object} [schema.types] - Optional type definitions for fields
   * @param {Object} [options] - Validation options
   * @param {boolean} [options.allowPrefixVariants=true] - Allow $ prefix variants of fields
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  static validate(data, schema, options = {}) {
    const { allowPrefixVariants = true } = options;
    const errors = [];
    
    // Check required fields
    for (const field of schema.required || []) {
      const value = this.getFieldValue(data, field, allowPrefixVariants);
      
      if (value === undefined || value === null) {
        errors.push(`Missing required field: ${field}`);
      } else if (schema.types && schema.types[field]) {
        // Validate type if specified
        const typeError = this.validateType(value, schema.types[field], field);
        if (typeError) {
          errors.push(typeError);
        }
      }
    }
    
    // Validate types for optional fields if present
    if (schema.types) {
      for (const field of schema.optional || []) {
        const value = this.getFieldValue(data, field, allowPrefixVariants);
        
        if (value !== undefined && value !== null && schema.types[field]) {
          const typeError = this.validateType(value, schema.types[field], field);
          if (typeError) {
            errors.push(typeError);
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get field value from data, checking both prefixed and non-prefixed versions
   * @param {Object} data - Data object
   * @param {string} field - Field name
   * @param {boolean} allowPrefixVariants - Whether to check _ and $ prefix variants
   * @returns {*} Field value or undefined
   */
  static getFieldValue(data, field, allowPrefixVariants = true) {
    if (allowPrefixVariants) {
      // Check _ prefixed version first (current standard)
      const underscoreField = `_${field}`;
      if (Object.prototype.hasOwnProperty.call(data, underscoreField)) {
        return data[underscoreField];
      }
      
      // Check $ prefixed version (backward compatibility)
      const dollarField = `$${field}`;
      if (Object.prototype.hasOwnProperty.call(data, dollarField)) {
        return data[dollarField];
      }
      
      // Check @ prefixed version (legacy backward compatibility)
      const atField = `@${field}`;
      if (Object.prototype.hasOwnProperty.call(data, atField)) {
        return data[atField];
      }
    }
    
    // Check non-prefixed version
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      return data[field];
    }
    
    return undefined;
  }
  
  /**
   * Validate a value against an expected type
   * @param {*} value - Value to validate
   * @param {string} expectedType - Expected type ('array', 'string', 'number', 'boolean', 'object')
   * @param {string} fieldName - Field name for error messages
   * @returns {string|null} Error message or null if valid
   */
  static validateType(value, expectedType, fieldName) {
    let isValid = false;
    
    switch (expectedType) {
      case 'array':
        isValid = Array.isArray(value);
        break;
      case 'string':
        isValid = typeof value === 'string';
        break;
      case 'number':
        isValid = typeof value === 'number';
        break;
      case 'boolean':
        isValid = typeof value === 'boolean';
        break;
      case 'object':
        isValid = typeof value === 'object' && value !== null && !Array.isArray(value);
        break;
      default:
        // Unknown type, consider valid
        return null;
    }
    
    if (!isValid) {
      return `Invalid type for ${fieldName}: expected ${expectedType}`;
    }
    
    return null;
  }
  
  /**
   * Validate and throw error if validation fails
   * @param {Object} data - Data to validate
   * @param {Object} schema - Schema definition
   * @param {Object} [options] - Validation options
   * @throws {Error} If validation fails
   */
  static validateOrThrow(data, schema, options = {}) {
    const result = this.validate(data, schema, options);
    
    if (!result.valid) {
      const errorMessage = result.errors.join('; ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }
  }
  
  /**
   * Create a schema definition with type information
   * @param {string[]} required - Required field names
   * @param {string[]} optional - Optional field names
   * @param {Object} types - Type definitions (field name -> type string)
   * @returns {Object} Schema object
   */
  static createSchema(required, optional = [], types = {}) {
    return {
      required: required || [],
      optional: optional || [],
      types: types || {}
    };
  }
}

module.exports = SchemaValidator;
