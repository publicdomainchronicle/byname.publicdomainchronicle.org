var fs = require('fs')
var http = require('http')
var makeHandler = require('./')
var mkdirp = require('mkdirp')
var path = require('path')
var pino = require('pino')
var runParallel = require('run-parallel')
var runSeries = require('run-series')
var touch = require('touch')
var writeKeypair = require('./write-keypair')

var NAME = require('./package.json').name
var VERSION = require('./package.json').version

var ENV = process.env
var PORT = ENV.PORT || 8080
var TIMEOUT = ENV.TIMEOUT ? parseInt(ENV.TIMEOUT) : 5000

var HOSTNAME = ENV.HOSTNAME || require('os').hostname()
var DIRECTORY = ENV.DATA || NAME
var ACCESSIONS = path.join(DIRECTORY, 'accessions')
var PUBLICATIONS = path.join(DIRECTORY, 'publications')
var KEYPAIR = path.join(DIRECTORY, 'keys')

var log = pino({name: NAME + '@' + VERSION})

runSeries([
  mkdirp.bind(null, PUBLICATIONS),
  function (done) {
    runParallel([
      function (done) {
        touch(ACCESSIONS, {force: true}, done)
      },
      function (done) {
        fs.access(KEYPAIR, fs.constants.R_OK, function (error) {
          if (error) {
            if (error.code === 'ENOENT') {
              log.info({event: 'generating keypair'})
              writeKeypair(DIRECTORY, done)
            } else {
              done(error)
            }
          } else {
            done()
          }
        })
      }
    ], done)
  }
], function (error) {
  if (error) {
    log.fatal({event: 'data'}, error)
    process.exit(1)
  } else {
    log.info({event: 'data', directory: DIRECTORY})
    var requestHandler = makeHandler(
      VERSION, HOSTNAME, TIMEOUT, DIRECTORY, log
    )
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
