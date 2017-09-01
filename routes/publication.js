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

var Negotiator = require('negotiator')
var encoding = require('../encoding')
var formatDate = require('../format-date')
var fs = require('fs')
var methodNotAllowed = require('./method-not-allowed')
var mustache = require('mustache')
var notFound = require('./not-found')
var parse = require('json-parse-errback')
var partials = require('../partials')
var path = require('path')
var readTimestamps = require('../util/read-timestamps')
var runParallel = require('run-parallel')
var send = require('send')
var url = require('url')
var xtend = require('xtend')

var TEMPLATE = path.join(
  __dirname, '..', 'templates', 'publication.html'
)

module.exports = function (request, response, configuration, log) {
  if (request.method === 'GET') {
    var digest = request.params.digest
    if (!encoding.isDigest(digest)) {
      notFound(request, response)
    } else {
      var type = new Negotiator(request).mediaType([
        'application/json', 'text/html'
      ])
      if (!type) {
        response.statusCode = 415
        response.end()
      } else {
        var directory = configuration.directory
        var pathPrefix = path.join(
          directory, 'publications', digest
        )
        var json = pathPrefix + '.json'
        /* istanbul ignore else */
        if (type === 'application/json') {
          send(request, json)
            .on('error', /* istanbul ignore next */ function (error) {
              request.log.error(error)
              response.statusCode = error.status || 500
              response.end()
            })
            .pipe(response)
        } else if (type === 'text/html') {
          var template
          var data
          var timestamps
          runParallel([
            function readTemplate (done) {
              fs.readFile(TEMPLATE, 'utf8', function (error, read) {
                if (error) return done(error)
                template = read
                done()
              })
            },
            function readPublication (done) {
              fs.readFile(json, 'utf8', function (error, read) {
                if (error) return done(error)
                parse(read, function (error, parsed) {
                  if (error) return done(error)
                  data = parsed
                  done()
                })
              })
            },
            function readAllTimestamps (done) {
              readTimestamps(
                directory, digest,
                function (error, read) {
                  if (error) return done(error)
                  timestamps = read
                    .map(function (record) {
                      var stamp = record.timestamp
                      return {
                        time: new Date(stamp.time),
                        hostname: url.parse(stamp.uri).hostname,
                        signature: encoding.format(record.signature)
                      }
                    })
                    .sort(function (a, b) {
                      return a.time - b.time
                    })
                    .map(function (record) {
                      return xtend(record, {
                        time: record.time.toLocaleString()
                      })
                    })
                  done()
                }
              )
            }
          ], function (error) {
            if (error) {
              request.log.error(error)
              response.statusCode = 500
              response.end()
            } else {
              data.date = formatDate(data.date)
              data.digest = digest
              data.formattedDigest = encoding.format(digest)
              data.timestamps = timestamps
              data.hostname = configuration.hostname
              if (data.finding) {
                data.findin = splitIntoParagraphs(data.finding)
              }
              if (data.safety) {
                data.safety = splitIntoParagraphs(data.safety)
              }
              response.setHeader(
                'Content-Type', 'text/html; charset=UTF-8'
              )
              response.end(
                mustache.render(template, data, partials)
              )
            }
          })
        }
      }
    }
  } else {
    methodNotAllowed(response)
  }
}

function splitIntoParagraphs (string) {
  return string.split(/\n+/)
}
