var path = require('path')

module.exports = function (directory, digest) {
  return path.join(directory, 'publications', digest + '.json')
}
