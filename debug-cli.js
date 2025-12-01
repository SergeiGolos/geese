const path = require('path');
const GeeseParser = require('./src/geese-parser');

const directory = '.';
console.log('CLI would search directory:', path.resolve(directory));

const parser = new GeeseParser();
const geeseFiles = parser.findGeeseFiles(path.resolve(directory));

console.log('Found .geese files:', geeseFiles);
console.log('Number of files:', geeseFiles.length);

if (geeseFiles.length === 0) {
  console.log('No .geese files found - this is the issue!');
} else {
  console.log('Files found successfully');
}
