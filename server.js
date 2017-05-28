var http = require('http')
var leveldown = require('leveldown')
var levelup = require('levelup')
var makeHandler = require('./')
var pino = require('pino')

var NAME = require('./package.json').name
var VERSION = require('./package.json').version

var log = pino({name: NAME + '@' + VERSION})

var ENV = process.env
var LEVEL_PATH = ENV.LEVELDB || NAME + '.leveldb'
var PORT = ENV.PORT || 8080
var TIMEOUT = ENV.TIMEOUT ? parseInt(ENV.TIMEOUT) : 5000

var levelOptions = {
  db: leveldown,
  valueEncoding: 'json'
}

levelup(LEVEL_PATH, levelOptions, function (error, level) {
  if (error) {
    log.fatal({event: 'level'}, error)
    process.exit(1)
  } else {
    log.info({event: 'level', path: LEVEL_PATH})
    var requestHandler = makeHandler(VERSION, TIMEOUT, log, level)
    var server = http.createServer(requestHandler)
    if (module.parent) {
      module.exports = server
    } else {
      process
        .on('SIGTERM', logSignalAndShutDown)
        .on('SIGQUIT', logSignalAndShutDown)
        .on('SIGINT', logSignalAndShutDown)
        .on('uncaughtException', function (exception) {
          log.error(exception)
          shutDown()
        })
      server.listen(PORT, function () {
        var boundPort = this.address().port
        log.info({event: 'listening', port: boundPort})
      })
    }
  }

  function logSignalAndShutDown () {
    log.info({event: 'signal'})
    shutDown()
  }

  function shutDown () {
    level.close(function () {
      log.info({event: 'closed level'})
      server.close(function () {
        log.info({event: 'closed server'})
        process.exit()
      })
    })
  }
})
