/**
 * Tests for SchemaValidator utility
 */

const SchemaValidator = require('./src/utils/schema-validator');

console.log('\n🧪 Running SchemaValidator Tests\n');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${description}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

// Test 1: Valid data with all required fields
test('Validates data with all required fields', () => {
  const schema = SchemaValidator.createSchema(['name', 'email'], ['age']);
  const data = { name: 'John', email: 'john@example.com' };
  const result = SchemaValidator.validate(data, schema);
  
  if (!result.valid) {
    throw new Error(`Expected valid but got errors: ${result.errors.join(', ')}`);
  }
});

// Test 2: Missing required field
test('Detects missing required field', () => {
  const schema = SchemaValidator.createSchema(['name', 'email'], ['age']);
  const data = { name: 'John' };
  const result = SchemaValidator.validate(data, schema);
  
  if (result.valid) {
    throw new Error('Expected invalid but got valid');
  }
  if (!result.errors.some(e => e.includes('email'))) {
    throw new Error('Expected error about missing email field');
  }
});

// Test 3: Type validation - array type
test('Validates array type correctly', () => {
  const schema = SchemaValidator.createSchema(
    ['items'],
    [],
    { items: 'array' }
  );
  const validData = { items: ['a', 'b', 'c'] };
  const invalidData = { items: 'not an array' };
  
  const validResult = SchemaValidator.validate(validData, schema);
  const invalidResult = SchemaValidator.validate(invalidData, schema);
  
  if (!validResult.valid) {
    throw new Error(`Expected valid for array but got: ${validResult.errors.join(', ')}`);
  }
  if (invalidResult.valid) {
    throw new Error('Expected invalid for non-array');
  }
});

// Test 4: Type validation - string type
test('Validates string type correctly', () => {
  const schema = SchemaValidator.createSchema(
    ['name'],
    [],
    { name: 'string' }
  );
  const validData = { name: 'John' };
  const invalidData = { name: 123 };
  
  const validResult = SchemaValidator.validate(validData, schema);
  const invalidResult = SchemaValidator.validate(invalidData, schema);
  
  if (!validResult.valid) {
    throw new Error(`Expected valid for string but got: ${validResult.errors.join(', ')}`);
  }
  if (invalidResult.valid) {
    throw new Error('Expected invalid for non-string');
  }
});

// Test 5: Prefix variant support ($ prefix)
test('Supports $ prefix variants for fields', () => {
  const schema = SchemaValidator.createSchema(['include', 'recipe'], [], {
    include: 'array',
    recipe: 'string'
  });
  
  const data = {
    $include: ['src/**/*.js'],
    $recipe: 'code-review'
  };
  
  const result = SchemaValidator.validate(data, schema, { allowPrefixVariants: true });
  
  if (!result.valid) {
    throw new Error(`Expected valid with $ prefix but got: ${result.errors.join(', ')}`);
  }
});

// Test 6: Prefix variant with non-prefixed fallback
test('Falls back to non-prefixed field if prefixed not found', () => {
  const schema = SchemaValidator.createSchema(['include'], []);
  
  const data = {
    include: ['src/**/*.js']  // No $ prefix
  };
  
  const result = SchemaValidator.validate(data, schema, { allowPrefixVariants: true });
  
  if (!result.valid) {
    throw new Error(`Expected valid with non-prefixed field but got: ${result.errors.join(', ')}`);
  }
});

// Test 7: validateOrThrow success
test('validateOrThrow does not throw on valid data', () => {
  const schema = SchemaValidator.createSchema(['name']);
  const data = { name: 'John' };
  
  // Should not throw
  SchemaValidator.validateOrThrow(data, schema);
});

// Test 8: validateOrThrow failure
test('validateOrThrow throws on invalid data', () => {
  const schema = SchemaValidator.createSchema(['name']);
  const data = {};
  
  let didThrow = false;
  try {
    SchemaValidator.validateOrThrow(data, schema);
  } catch (error) {
    didThrow = true;
    if (!error.message.includes('Validation failed')) {
      throw new Error('Expected validation error message');
    }
  }
  
  if (!didThrow) {
    throw new Error('Expected validateOrThrow to throw an error');
  }
});

// Test 9: Optional fields are not required
test('Optional fields do not cause validation errors when missing', () => {
  const schema = SchemaValidator.createSchema(
    ['required1'],
    ['optional1', 'optional2']
  );
  
  const data = { required1: 'value' };
  const result = SchemaValidator.validate(data, schema);
  
  if (!result.valid) {
    throw new Error(`Expected valid without optional fields but got: ${result.errors.join(', ')}`);
  }
});

// Test 10: Optional fields are validated if present
test('Optional fields are type-validated if present', () => {
  const schema = SchemaValidator.createSchema(
    ['required1'],
    ['optional1'],
    { optional1: 'number' }
  );
  
  const validData = { required1: 'value', optional1: 42 };
  const invalidData = { required1: 'value', optional1: 'not a number' };
  
  const validResult = SchemaValidator.validate(validData, schema);
  const invalidResult = SchemaValidator.validate(invalidData, schema);
  
  if (!validResult.valid) {
    throw new Error(`Expected valid with correct optional type but got: ${validResult.errors.join(', ')}`);
  }
  if (invalidResult.valid) {
    throw new Error('Expected invalid for wrong optional type');
  }
});

// Test 11: getFieldValue with prefix
test('getFieldValue retrieves prefixed field correctly', () => {
  const data = { $name: 'John', age: 30 };
  const value = SchemaValidator.getFieldValue(data, 'name', true);
  
  if (value !== 'John') {
    throw new Error(`Expected 'John' but got '${value}'`);
  }
});

// Test 12: getFieldValue without prefix when prefixed not found
test('getFieldValue falls back to non-prefixed field', () => {
  const data = { name: 'John', age: 30 };
  const value = SchemaValidator.getFieldValue(data, 'name', true);
  
  if (value !== 'John') {
    throw new Error(`Expected 'John' but got '${value}'`);
  }
});

// Test 13: Multiple type validations
test('Validates multiple types correctly', () => {
  const schema = SchemaValidator.createSchema(
    ['name', 'age', 'active', 'tags'],
    [],
    {
      name: 'string',
      age: 'number',
      active: 'boolean',
      tags: 'array'
    }
  );
  
  const data = {
    name: 'John',
    age: 30,
    active: true,
    tags: ['javascript', 'nodejs']
  };
  
  const result = SchemaValidator.validate(data, schema);
  
  if (!result.valid) {
    throw new Error(`Expected valid with all types correct but got: ${result.errors.join(', ')}`);
  }
});

// Test 14: .geese file-like validation
test('Validates .geese file structure', () => {
  const schema = SchemaValidator.createSchema(
    ['include', 'recipe'],
    ['exclude', 'model'],
    {
      include: 'array',
      recipe: 'string',
      exclude: 'array'
    }
  );
  
  const validGeeseData = {
    $include: ['src/**/*.js'],
    $recipe: 'code-review',
    $exclude: ['node_modules/**']
  };
  
  const result = SchemaValidator.validate(validGeeseData, schema, {
    allowPrefixVariants: true
  });
  
  if (!result.valid) {
    throw new Error(`Expected valid .geese structure but got: ${result.errors.join(', ')}`);
  }
});

// Test 15: createSchema helper
test('createSchema creates valid schema object', () => {
  const schema = SchemaValidator.createSchema(
    ['field1', 'field2'],
    ['field3'],
    { field1: 'string', field3: 'number' }
  );
  
  if (!schema.required || schema.required.length !== 2) {
    throw new Error('Schema required fields not set correctly');
  }
  if (!schema.optional || schema.optional.length !== 1) {
    throw new Error('Schema optional fields not set correctly');
  }
  if (!schema.types || Object.keys(schema.types).length !== 2) {
    throw new Error('Schema types not set correctly');
  }
});

console.log('\n==================================================');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('==================================================\n');

process.exit(failed > 0 ? 1 : 0);
