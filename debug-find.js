const path = require('path');
const glob = require('glob');

const directory = 'D:\\Dev\\wod-wiki';
console.log('Searching directory:', directory);

const pattern = path.join(directory, '**/*.geese').replace(/\\/g, '/');
console.log('Glob pattern:', pattern);

try {
  const files = glob.sync(pattern);
  console.log('Found files:', files);
  console.log('Number of files:', files.length);
} catch (error) {
  console.error('Error:', error.message);
}
