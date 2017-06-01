var ecb = require('ecb')
var encoding = require('./encoding')
var fs = require('fs')
var parse = require('json-parse-errback')
var path = require('path')

module.exports = function (directory, callback) {
  var file = path.join(directory, 'keys')
  fs.readFile(file, ecb(callback, function (data) {
    parse(data, ecb(callback, function (data) {
      callback(null, {
        public: encoding.decode(data.public),
        secret: encoding.decode(data.secret)
      })
    }))
  }))
}
