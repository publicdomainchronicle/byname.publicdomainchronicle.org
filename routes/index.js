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

var fs = require('fs-extra')
var meta = require('../package.json')
var path = require('path')
var pump = require('pump')
var split2 = require('split2')
var through2 = require('through2')

var routes = module.exports = require('http-hash')()

routes.set('/', function (request, response, configuration) {
  var q = request.query.q
  if (!q) {
    response.setHeader('Content-Type', 'text/plain')
    return response.end('pdc-byname-api')
  }

  response.setHeader('Content-Type', 'application/x-ndjson')
  var file = path.join(configuration.directory, 'index.ndjson')
  fs.ensureFile(file, function (error) {
    /* istanbul ignore if */
    if (error) {
      response.statusCode = 500
      return response.end()
    }
    pump(
      fs.createReadStream(file),
      split2(JSON.parse),
      through2.obj(function (object, _, done) {
        if (matches(object)) {
          return done(null, JSON.stringify(object) + '\n')
        }
        done()
      }),
      response
    )
  })

  function matches (object) {
    return q
      .toLowerCase()
      .split(/\s+/)
      .every(function (word) {
        return object.name.toLowerCase().indexOf(word) !== -1
      })
  }
})
