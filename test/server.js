var devNull = require('dev-null')
var fs = require('fs')
var http = require('http')
var makeHandler = require('../')
var mkdirp = require('mkdirp')
var path = require('path')
var pino = require('pino')
var rimraf = require('rimraf')
var runParallel = require('run-parallel')
var touch = require('touch')
var writeKeypair = require('../write-keypair')

var VERSION = require('../package.json').version
var RANDOM_HIGH_PORT = 0

module.exports = function (callback) {
  fs.mkdtemp('/tmp/', function (_, directory) {
    runParallel([
      touch.bind(
        null, path.join(directory, 'accessions'), {force: true}
      ),
      mkdirp.bind(null, path.join(directory, 'publications')),
      mkdirp.bind(null, path.join(directory, 'tmp')),
      writeKeypair.bind(null, directory)
    ], function (_) {
      var configuration = {
        version: VERSION,
        hostname: 'testserver',
        timeout: 5000,
        directory: directory,
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
