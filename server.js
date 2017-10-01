/*
Copyright 2017 The BioBricks Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */

var http = require('http')
var makeHandler = require('./')
var pino = require('pino')
var replicatePeers = require('./replicate-peers')

var REPLICATION_INTERVAL = process.env.REPLICATION_INTERVAL
  ? parseInt(process.env.REPLICATION_INTERVAL)
  : 3600000 // hourly

var log = pino()

var configuration = {
  file: process.env.FILE || 'replication.log',
  pdc: {
    host: process.env.PDC_HOST || 'localhost',
    path: process.env.PDC_PATH || '/'
  },
  solr: {
    host: process.env.SOLR_HOST || 'localhost',
    port: process.env.SOLR_PORT
      ? parseInt(process.env.SOLR_PORT)
      : 8983
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
  server.listen(process.env.PORT || 8080, function () {
    var boundPort = this.address().port
    log.info({event: 'listening', port: boundPort})
  })
  // Start replicating peers.
  var replicationLog = log.child({subsystem: 'replication'})
  setInterval(
    replicatePeers.bind(null, configuration, replicationLog),
    REPLICATION_INTERVAL
  )
  replicatePeers(configuration, replicationLog)
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
