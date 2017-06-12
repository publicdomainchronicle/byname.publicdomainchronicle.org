var ecb = require('ecb')
var fs = require('fs')
var parse = require('json-parse-errback')
var timestampPath = require('./timestamp-path')

module.exports = function (directory, publication, publicKey, done) {
  var file = timestampPath(directory, publication, publicKey)
  fs.readFile(file, 'utf8', ecb(done, function (string) {
    parse(string, ecb(done, function (parsed) {
      done(null, parsed)
    }))
  }))
}
