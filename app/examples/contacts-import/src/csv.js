// Reads CSV text into rows of fields.
function parse(text) {
  return text.split('\n').filter(line => line.trim() !== '').map(line => line.split(','));
}
module.exports = { parse };
