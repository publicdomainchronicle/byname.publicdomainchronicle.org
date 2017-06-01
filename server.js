var fs = require('fs')
var http = require('http')
var initialize = require('./initialize-directory')
var makeHandler = require('./')
var mkdirp = require('mkdirp')
var path = require('path')
var pino = require('pino')
var runParallel = require('run-parallel')
var runSeries = require('run-series')
var touch = require('touch')
var writeKeypair = require('./keypair/write')

var NAME = require('./package.json').name
var VERSION = require('./package.json').version

var ENV = process.env
var PORT = ENV.PORT || 8080
var TIMEOUT = ENV.TIMEOUT ? parseInt(ENV.TIMEOUT) : 5000

var RECAPTCHA_SECRET = ENV.RECAPTCHA_SECRET
if (!RECAPTCHA_SECRET) {
  throw new Error('Missing RECAPTCHA_SECRET env var.')
}

var RECAPTCHA_PUBLIC = ENV.RECAPTCHA_PUBLIC
if (!RECAPTCHA_PUBLIC) {
  throw new Error('Missing RECAPTCHA_PUBLIC env var.')
}

var HOSTNAME = ENV.HOSTNAME || require('os').hostname()
var DIRECTORY = ENV.DATA || NAME

var log = pino({name: NAME + '@' + VERSION})

initialize(DIRECTORY, function (error) {
  if (error) {
    log.fatal({event: 'data'}, error)
    process.exit(1)
  } else {
    log.info({event: 'data', directory: DIRECTORY})
    var configuration = {
      version: VERSION,
      hostname: HOSTNAME,
      timeout: TIMEOUT,
      directory: DIRECTORY,
      recaptcha: {
        public: RECAPTCHA_PUBLIC,
        secret: RECAPTCHA_SECRET
      }
    }
    var requestHandler = makeHandler(configuration, log)
    var server = http.createServer(requestHandler)
    if (module.parent) {
      module.exports = server
    } else {
      // Trap signals.
      process
        .on('SIGTERM', logSignalAndShutDown)
        .on('SIGQUIT', logSignalAndShutDown)
        .on('SIGINT', logSignalAndShutDown)
        .on('uncaughtException', function (exception) {
          log.error(exception)
          shutDown()
        })
      // Start server.
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
    server.close(function () {
      log.info({event: 'closed server'})
      process.exit()
    })
  }
})
