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

var devNull = require('dev-null')
var fs = require('fs')
var http = require('http')
var makeHandler = require('../')
var pino = require('pino')
var rimraf = require('rimraf')

var RANDOM_HIGH_PORT = 0

module.exports = function (callback) {
  fs.mkdtemp('/tmp/', function (ignore, directory) {
    var configuration = {
      directory: directory,
      pdc: {
        host: 'publicdomainchronicle.org',
        path: '/server/'
      }
    }
    var log = pino({}, devNull())
    var server = http.createServer(makeHandler(configuration, log))
    server.listen(RANDOM_HIGH_PORT, function () {
      var port = this.address().port
      configuration.base = 'http://localhost:' + port + '/'
      callback(port, function () {
        server.close(function () {
          rimraf.sync(directory)
        })
      })
    })
  })
}
