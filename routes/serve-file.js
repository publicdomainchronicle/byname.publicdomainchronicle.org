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

var methodNotAllowed = require('./method-not-allowed')
var path = require('path')
var send = require('send')

module.exports = function (name) {
  return function (request, response) {
    if (request.method === 'GET') {
      send(request, path.join(__dirname, '..', 'static', name))
        .on('error', /* istanbul ignore next */ function (error) {
          response.statusCode = error.status || 500
          response.end(error.message)
        })
        .pipe(response)
    } else {
      methodNotAllowed(response)
    }
  }
}
