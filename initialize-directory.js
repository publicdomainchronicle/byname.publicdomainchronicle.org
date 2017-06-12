var mkdirp = require('mkdirp')
var path = require('path')
var readKeypair = require('./keypair/read')
var runParallel = require('run-parallel')
var runSeries = require('run-series')
var touch = require('touch')
var writeKeypair = require('./keypair/write')

module.exports = function (directory, callback) {
  var publications = path.join(directory, 'publications')
  var tmp = path.join(directory, 'tmp')
  var accessions = path.join(directory, 'accessions')
  var keypair
  runSeries([
    runParallel.bind(null, [
      mkdirp.bind(null, publications),
      mkdirp.bind(null, tmp)
    ]),
    runParallel.bind(null, [
      touch.bind(null, accessions, {force: true}),
      function (done) {
        readKeypair(directory, function (error, read) {
          if (error) {
            writeKeypair(directory, function (error, written) {
              if (error) {
                done(error)
              } else {
                keypair = written
                done()
              }
            })
          } else {
            keypair = read
            done()
          }
        })
      }
    ])
  ], function (error) {
    if (error) {
      callback(error)
    } else {
      callback(null, keypair)
    }
  })
}
