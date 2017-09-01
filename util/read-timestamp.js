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

var fs = require('fs')
var parse = require('json-parse-errback')
var timestampPath = require('./timestamp-path')

module.exports = function (directory, publication, publicKey, done) {
  var file = timestampPath(directory, publication, publicKey)
  fs.readFile(file, 'utf8', function (error, string) {
    if (error) return done(error)
    parse(string, done)
  })
}
