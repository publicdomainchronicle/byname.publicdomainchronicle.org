var devNull = require('dev-null')
var http = require('http')
var levelup = require('levelup')
var makeHandler = require('../')
var memdown = require('memdown')
var pino = require('pino')

var VERSION = require('../package.json').version
var RANDOM_HIGH_PORT = 0

module.exports = function (callback) {
  memdown.clearGlobalStore()
  var level = levelup('server', {
    db: memdown,
    valueEncoding: 'json'
  })
  var log = pino({}, devNull())
  var server = http.createServer()
    .on('request', makeHandler(VERSION, 5000, log, level))
    .once('close', function () {
      level.close()
    })
  server.listen(RANDOM_HIGH_PORT, function () {
    callback(this.address().port, function () {
      server.close()
    })
  })
}
