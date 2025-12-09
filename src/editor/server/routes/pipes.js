/**
 * Pipes API Routes
 * Provides access to pipe operations library
 */

const express = require('express');
const router = express.Router();

/**
 * Get all available pipes with metadata
 * GET /api/pipes
 */
router.get('/', async (req, res) => {
  try {
    const container = req.app.locals.container;
    const pipeRegistry = container.resolve('pipeRegistry');
    
    if (!pipeRegistry) {
      return res.status(500).json({ error: 'Pipe registry not available' });
    }
    
    // Get all pipes with their sources
    const allPipes = pipeRegistry.listWithSources();
    
    // Categorize pipes based on their names
    const pipes = allPipes.map(pipe => {
      const category = categorizePipe(pipe.name);
      return {
        name: pipe.name,
        source: pipe.source,
        isBuiltin: pipe.isBuiltin,
        category
      };
    });
    
    // Sort by category, then by name
    pipes.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
    
    res.json({ pipes });
  } catch (error) {
    console.error('Error listing pipes:', error);
    res.status(500).json({ error: 'Failed to list pipes' });
  }
});

/**
 * Get details for a specific pipe
 * GET /api/pipes/:name
 */
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const container = req.app.locals.container;
    const pipeRegistry = container.resolve('pipeRegistry');
    
    if (!pipeRegistry) {
      return res.status(500).json({ error: 'Pipe registry not available' });
    }
    
    const pipeInfo = pipeRegistry.getPipeInfo(name);
    
    if (!pipeInfo.exists) {
      return res.status(404).json({ error: `Pipe "${name}" not found` });
    }
    
    const category = categorizePipe(name);
    const description = getPipeDescription(name, category);
    const examples = getPipeExamples(name, category);
    
    res.json({
      ...pipeInfo,
      category,
      description,
      examples
    });
  } catch (error) {
    console.error('Error getting pipe details:', error);
    res.status(500).json({ error: 'Failed to get pipe details' });
  }
});

/**
 * Categorize a pipe based on its name
 * @param {string} name - Pipe name
 * @returns {string} Category
 */
function categorizePipe(name) {
  // String operations
  if (['trim', 'toUpperCase', 'toLowerCase', 'substring', 'replace', 'split', 'join', 
       'startsWith', 'endsWith', 'includes', 'concat', 'repeat', 'padStart', 'padEnd'].includes(name)) {
    return 'String';
  }
  
  // File operations
  if (['readFile', 'readJson', 'writeFile', 'writeJson', 'glob', 'expandGlob'].includes(name)) {
    return 'File';
  }
  
  // JSON/Data operations
  if (['parseJson', 'stringifyJson', 'jqSelect', 'jqMap', 'jsonPath'].includes(name)) {
    return 'JSON';
  }
  
  // List/Array operations
  if (['first', 'last', 'slice', 'filter', 'map', 'reduce', 'sort', 'reverse', 
       'unique', 'flatten', 'count', 'sum'].includes(name)) {
    return 'List';
  }
  
  // Text operations
  if (['grep', 'grepCount', 'lines', 'words', 'chars', 'trimLines', 'indent', 'dedent'].includes(name)) {
    return 'Text';
  }
  
  // Type operations
  if (['toString', 'toNumber', 'toBoolean', 'toArray', 'typeOf'].includes(name)) {
    return 'Type';
  }
  
  // Regex operations
  if (['match', 'matchAll', 'test', 'regexReplace'].includes(name)) {
    return 'Regex';
  }
  
  // Default to Custom for user-defined pipes
  return 'Custom';
}

/**
 * Get description for a pipe
 * @param {string} name - Pipe name
 * @param {string} category - Pipe category
 * @returns {string} Description
 */
function getPipeDescription(name, category) {
  const descriptions = {
    // String operations
    'trim': 'Remove whitespace from both ends of a string',
    'toUpperCase': 'Convert string to uppercase',
    'toLowerCase': 'Convert string to lowercase',
    'substring': 'Extract a substring from a string',
    'replace': 'Replace occurrences of a pattern in a string',
    'split': 'Split a string into an array',
    'join': 'Join array elements into a string',
    'startsWith': 'Check if string starts with a prefix',
    'endsWith': 'Check if string ends with a suffix',
    'includes': 'Check if string contains a substring',
    'concat': 'Concatenate strings or arrays',
    'repeat': 'Repeat a string n times',
    'padStart': 'Pad string at the start',
    'padEnd': 'Pad string at the end',
    
    // File operations
    'readFile': 'Read file contents from the file system',
    'readJson': 'Read and parse a JSON file',
    'writeFile': 'Write content to a file',
    'writeJson': 'Write object to a JSON file',
    'glob': 'Find files matching a glob pattern',
    'expandGlob': 'Expand glob patterns to file paths',
    
    // JSON operations
    'parseJson': 'Parse a JSON string into an object',
    'stringifyJson': 'Convert object to JSON string',
    'jqSelect': 'Query JSON using jq-like syntax',
    'jqMap': 'Transform JSON using jq-like mapping',
    'jsonPath': 'Query JSON using JSONPath',
    
    // List operations
    'first': 'Get the first element of an array',
    'last': 'Get the last element of an array',
    'slice': 'Extract a slice of an array',
    'filter': 'Filter array elements',
    'map': 'Transform array elements',
    'reduce': 'Reduce array to a single value',
    'sort': 'Sort array elements',
    'reverse': 'Reverse array order',
    'unique': 'Get unique array elements',
    'flatten': 'Flatten nested arrays',
    'count': 'Count array elements',
    'sum': 'Sum numeric array elements',
    
    // Text operations
    'grep': 'Filter lines matching a pattern',
    'grepCount': 'Count lines matching a pattern',
    'lines': 'Split text into lines',
    'words': 'Split text into words',
    'chars': 'Split text into characters',
    'trimLines': 'Trim whitespace from each line',
    'indent': 'Indent each line',
    'dedent': 'Remove common leading whitespace',
    
    // Type operations
    'toString': 'Convert value to string',
    'toNumber': 'Convert value to number',
    'toBoolean': 'Convert value to boolean',
    'toArray': 'Convert value to array',
    'typeOf': 'Get the type of a value',
    
    // Regex operations
    'match': 'Match string against a regex',
    'matchAll': 'Find all regex matches',
    'test': 'Test if string matches regex',
    'regexReplace': 'Replace using regex pattern'
  };
  
  return descriptions[name] || 'Custom pipe operation';
}

/**
 * Get usage examples for a pipe
 * @param {string} name - Pipe name
 * @param {string} category - Pipe category
 * @returns {string[]} Array of example usage strings
 */
function getPipeExamples(name, category) {
  const examples = {
    // String operations
    'trim': ['{{value ~> trim}}', '{{" hello " ~> trim}}  // "hello"'],
    'toUpperCase': ['{{value ~> toUpperCase}}', '{{"hello" ~> toUpperCase}}  // "HELLO"'],
    'toLowerCase': ['{{value ~> toLowerCase}}', '{{"HELLO" ~> toLowerCase}}  // "hello"'],
    'substring': ['{{value ~> substring:0:5}}', '{{"hello world" ~> substring:0:5}}  // "hello"'],
    'replace': ['{{value ~> replace:"old":"new"}}', '{{"hello world" ~> replace:"world":"geese"}}  // "hello geese"'],
    'split': ['{{value ~> split:","}}', '{{"a,b,c" ~> split:","}}  // ["a", "b", "c"]'],
    
    // File operations
    'readFile': ['{{filename ~> readFile}}', '{{"config.json" ~> readFile}}'],
    'readJson': ['{{filename ~> readJson}}', '{{"package.json" ~> readJson}}'],
    'glob': ['{{pattern ~> glob}}', '{{"src/**/*.js" ~> glob}}'],
    
    // JSON operations
    'parseJson': ['{{jsonStr ~> parseJson}}', '{{\'{"name":"test"}\' ~> parseJson}}'],
    'jqSelect': ['{{obj ~> jqSelect:".name"}}', '{{data ~> jqSelect:".users[0].name"}}'],
    
    // List operations
    'first': ['{{array ~> first}}', '{{items ~> first}}'],
    'last': ['{{array ~> last}}', '{{items ~> last}}'],
    'count': ['{{array ~> count}}', '{{items ~> count}}'],
    'filter': ['{{array ~> filter:"x > 5"}}'],
    
    // Text operations
    'grep': ['{{text ~> grep:"pattern"}}', '{{content ~> grep:"TODO"}}'],
    'grepCount': ['{{text ~> grepCount:"pattern"}}', '{{content ~> grepCount:"ERROR"}}'],
    'lines': ['{{text ~> lines}}', '{{content ~> lines ~> count}}'],
    
    // Type operations
    'toString': ['{{value ~> toString}}', '{{42 ~> toString}}  // "42"'],
    'toNumber': ['{{value ~> toNumber}}', '{{"42" ~> toNumber}}  // 42'],
    
    // Regex operations
    'match': ['{{text ~> match:"/\\d+/"}}', '{{value ~> match:"/[A-Z][a-z]+"}}'],
    'test': ['{{text ~> test:"/\\d+/"}}', '{{value ~> test:"/^hello/"}}  // true/false']
  };
  
  return examples[name] || [`{{value ~> ${name}}}`, `// Custom pipe: ${name}`];
}

module.exports = router;
