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

var ecb = require('ecb')
var fs = require('fs')
var readTimestamp = require('./read-timestamp')
var recordDirectoryPath = require('./record-directory-path')
var runParallel = require('run-parallel')

module.exports = function (directory, publication, done) {
  var dir = recordDirectoryPath(directory, publication)
  fs.readdir(dir, ecb(done, function (files) {
    var timestamps = []
    runParallel(
      files
        .filter(function (file) {
          return file.endsWith('.json')
        })
        .map(function (file) {
          return file.substring(0, file.length - 5)
        })
        .map(function (basename) {
          return function (done) {
            readTimestamp(
              directory, publication, basename,
              ecb(done, function (timestamp) {
                timestamps.push(timestamp)
                done()
              })
            )
          }
        }
      ),
      ecb(done, function () {
        done(null, timestamps)
      })
    )
  }))
}
