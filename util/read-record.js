var ecb = require('ecb')
var fs = require('fs')
var parse = require('json-parse-errback')
var path = require('path')

module.exports = function (digest, directory, done) {
  var file = path.join(directory, 'publications', digest + '.json')
  fs.readFile(file, 'utf8', ecb(done, function (string) {
    parse(string, ecb(done, function (parsed) {
      done(null, parsed)
    }))
  }))
}
