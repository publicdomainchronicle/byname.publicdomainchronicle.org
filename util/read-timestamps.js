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
