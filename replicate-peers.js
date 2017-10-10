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

var JSONfile = require('jsonfile')
var flushWriteStream = require('flush-write-stream')
var fs = require('fs')
var https = require('https')
var parse = require('json-parse-errback')
var path = require('path')
var pump = require('pump')
var runSeries = require('run-series')
var simpleConcat = require('simple-concat')
var split2 = require('split2')
var through2 = require('through2')

module.exports = function (configuration, log) {
  var last = -1
  var file = path.join(configuration.directory, 'replication.log')

  readProgress(function (error, lastReplicated) {
    if (error) return log.error(error)
    last = lastReplicated
    log.info('replicating')
    replicate(function (error) {
      if (error) return log.error(error)
      writeProgress(function (error) {
        if (error) return log.error(error)
        log.info('done')
      })
    })
  })

  function readProgress (done) {
    JSONfile.readFile(file, done)
  }

  function writeProgress (done) {
    JSONfile.writeFile(file, last, done)
  }

  function replicate (done) {
    https.request({
      hostname: configuration.pdc.host,
      path: (
        (configuration.pdc.path || '/') +
        'accessions?from=' + (last + 1)
      ),
      headers: {Accept: 'text/csv'}
    })
      .once('error', function (error) {
        done(error)
      })
      .once('response', function (response) {
        pump(
          response,
          split2(),
          through2.obj(function (line, _, done) {
            last++
            done(null, line.toString().split(',')[1])
          }),
          flushWriteStream.obj(function (digest, _, done) {
            var recordLog = log.child({digest: digest}, 'publication')
            indexPublication(recordLog, digest, done)
          }),
          function (error) {
            if (error) {
              log.error(error)
              return done(error)
            }
            done()
          }
        )
      })
      .end()
  }

  function indexPublication (log, digest, done) {
    var publication
    runSeries([
      getPublication,
      indexPublication
    ], done)

    function getPublication (done) {
      https.request({
        hostname: configuration.pdc.host,
        path: (
          (configuration.pdc.path || '/') +
          'publications/' + digest
        ),
        headers: {Accept: 'application/json'}
      })
        .once('error', function (error) {
          done(error)
        })
        .once('response', function (response) {
          simpleConcat(response, function (error, buffer) {
            if (error) return done(error)
            parse(buffer, function (error, parsed) {
              if (error) return done(error)
              parsed.id = digest
              publication = parsed
              log.info('got publication')
              done()
            })
          })
        })
        .end()
    }

    function indexPublication (done) {
      fs.appendFile(
        path.join(configuration.directory, 'index.ndjson'),
        JSON.stringify({
          name: publication.name,
          affiliation: publication.affiliation,
          title: publication.title,
          digest: digest
        }) + '\n',
        done
      )
    }
  }
}
