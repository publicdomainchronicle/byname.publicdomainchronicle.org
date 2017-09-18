var htmlEntities = require('html-entities').Html5Entities

module.exports = function escape (string) {
  return htmlEntities.encodeNonUTF(string)
}
