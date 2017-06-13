/* Copyright 2017 The BioBricks Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var fs = require('fs')
var encoding = require('../encoding')
var methodNotAllowed = require('./method-not-allowed')
var notFound = require('./not-found')
var path = require('path')
var send = require('send')

module.exports = function (request, response, configuration) {
  if (request.method === 'GET') {
    var publication = request.params.digest
    var attachment = request.params.attachment
    if (
      !encoding.isDigest(publication) ||
      !encoding.isDigest(attachment)
    ) {
      notFound(request, response)
    } else {
      var file = path.join(
        configuration.directory, 'publications', publication, attachment
      )
      fs.readFile(file + '.type', function (error, header) {
        /* istanbul ignore if */
        if (error) {
          fail(error)
        } else {
          response.setHeader('Content-Type', header)
          send(request, file)
            .on('error', /* istanbul ignore next */ function (error) {
              fail(error)
            })
            .pipe(response)
        }
      })
    }
  } else {
    methodNotAllowed(response)
  }

  /* istanbul ignore next */
  function fail (error) {
    request.log.error(error)
    response.statusCode = error.status || 500
    response.end()
  }
}
