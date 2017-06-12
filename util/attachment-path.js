var path = require('path')

module.exports = function (directory, record, attachment, done) {
  return path.join(directory, 'publications', record, attachment)
}
