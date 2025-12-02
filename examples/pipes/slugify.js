/**
 * Custom Pipe Operation: slugify
 * Converts a string into a URL-friendly slug
 * 
 * @param {any} value - The input value
 * @param {string[]} args - Optional separator (default: '-')
 * @param {Object} context - The context object
 * @returns {string} The slugified string
 * 
 * Example: "My Blog Post!" ~> slugify
 * Result: "my-blog-post"
 */

module.exports = function slugify(value, args, context) {
  const str = String(value);
  const separator = args[0] || '-';
  
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, separator)
    .replace(new RegExp(`[^a-z0-9${separator}]`, 'g'), '')
    .replace(new RegExp(`${separator}+`, 'g'), separator)
    .replace(new RegExp(`^${separator}|${separator}$`, 'g'), '');
};
