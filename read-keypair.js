var ecb = require('ecb')
var fs = require('fs')
var parse = require('json-parse-errback')
var path = require('path')

module.exports = function (directory, callback) {
  var file = path.join(directory, 'keys')
  fs.readFile(file, ecb(callback, function (data) {
    parse(data, ecb(callback, function (data) {
      callback(null, {
        public: Buffer.from(data.public, 'hex'),
        secret: Buffer.from(data.secret, 'hex')
      })
    }))
  }))
}
