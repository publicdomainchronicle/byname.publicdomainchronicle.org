var path = require('path')
var encoding = require('../encoding')

module.exports = function (directory, digest, publicKey, done) {
  return path.join(
    directory, 'publications', digest,
    (
      typeof publicKey === 'string'
        ? publicKey
        : encoding.encode(publicKey)
    )
    + '.json'
  )
}
