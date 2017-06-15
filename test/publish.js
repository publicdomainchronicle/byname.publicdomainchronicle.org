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

var makeValidPublication = require('./make-valid-publication')
var http = require('http')

module.exports = function (test, port, done) {
  var form = makeValidPublication()
  form.pipe(
    http.request({
      method: 'POST',
      path: '/publish',
      port: port,
      headers: form.getHeaders()
    })
      .once('response', function (response) {
        test.equal(
          response.statusCode, 201,
          'responds 201'
        )
        test.assert(
          response.headers.location.startsWith('/publications/'),
          'sets Location'
        )
        done()
      })
  )
}
