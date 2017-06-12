var path = require('path')

module.exports = function (directory, record, attachment) {
  return path.join(directory, 'publications', record, attachment)
}
