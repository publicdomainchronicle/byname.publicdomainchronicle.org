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
      writeKeypair.bind(null, directory)
    ], function (_) {
      var server = http.createServer(
        makeHandler(
          VERSION, 5000, directory,
          pino({}, devNull())
        )
      )
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
