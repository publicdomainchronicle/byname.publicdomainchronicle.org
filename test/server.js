var devNull = require('dev-null')
var fs = require('fs')
var http = require('http')
var initialize = require('../initialize-directory')
var makeHandler = require('../')
var pino = require('pino')
var rimraf = require('rimraf')

var VERSION = require('../package.json').version
var RANDOM_HIGH_PORT = 0

module.exports = function (callback) {
  fs.mkdtemp('/tmp/', function (ignore, directory) {
    initialize(directory, function (ignore, keypair) {
      var configuration = {
        version: VERSION,
        hostname: 'testserver',
        timeout: 5000,
        directory: directory,
        keypair: keypair,
        recaptcha: {
          // Use the test keys from reCAPTCHA FAQ.
          public: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
          secret: '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'
        }
      }
      var log = pino({}, devNull())
      var server = http.createServer(makeHandler(configuration, log))
      server.listen(RANDOM_HIGH_PORT, function () {
        callback(this.address().port, function () {
          server.close(function () {
            rimraf.sync(directory)
          })
        })
      })
    })
  })
}
