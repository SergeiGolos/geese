/**
 * Custom Pipe Operation: formatName
 * Formats a name string into title case
 * 
 * @param {any} value - The input value
 * @param {string[]} args - Array of arguments
 * @param {Object} context - The context object
 * @returns {string} The formatted name
 * 
 * Example: "john doe" ~> formatName
 * Result: "John Doe"
 */

module.exports = function formatName(value, args, context) {
  const str = String(value);
  return str
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};
