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

var encoding = require('../encoding')
var methodNotAllowed = require('./method-not-allowed')
var notFound = require('./not-found')
var send = require('send')
var timestampPath = require('../util/timestamp-path')

module.exports = function (request, response, configuration) {
  if (request.method === 'GET') {
    var digest = request.params.digest
    var key = request.params.key
    if (!encoding.isDigest(digest)) {
      notFound(request, response)
    } else {
      var directory = configuration.directory
      var file = timestampPath(directory, digest, key)
      send(request, file)
        .on('error', /* istanbul ignore next */ function (error) {
          request.log.error(error)
          response.statusCode = error.status || 500
          response.end()
        })
        .pipe(response)
    }
  } else {
    methodNotAllowed(response)
  }
}
