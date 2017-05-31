var Negotiator = require('negotiator')
var ecb = require('ecb')
var formatDate = require('../format-date')
var formatHex = require('../format-hex')
var fs = require('fs')
var isDigest = require('is-sha-256-hex-digest')
var methodNotAllowed = require('./method-not-allowed')
var mustache = require('mustache')
var notFound = require('./not-found')
var parse = require('json-parse-errback')
var path = require('path')
var readKeypair = require('../read-keypair')
var runParallel = require('run-parallel')
var send = require('send')
var url = require('url')

var TEMPLATE = path.join(
  __dirname, '..', 'templates', 'publication.html'
)

module.exports = function (request, response, configuration) {
  if (request.method === 'GET') {
    var digest = request.params.digest
    if (!isDigest(digest)) {
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
          var timestamps = []
          runParallel([
            function readTemplate (done) {
              fs.readFile(TEMPLATE, 'utf8', ecb(done, function (read) {
                template = read
                done()
              }))
            },
            function readPublication (done) {
              fs.readFile(json, 'utf8', ecb(done, function (read) {
                parse(read, ecb(done, function (parsed) {
                  data = parsed
                  done()
                }))
              }))
            },
            function readTimestamps (done) {
              readKeypair(directory, ecb(done, function (keypair) {
                var publicKey = keypair.public.toString('hex')
                var sig = path.join(
                  pathPrefix, publicKey + '.json'
                )
                fs.readFile(sig, 'utf8', ecb(done, function (json) {
                  parse(json, ecb(done, function (data) {
                    var timestamp = data.timestamp
                    timestamp.timestamp = new Date(timestamp.timestamp)
                      .toLocaleString()
                    timestamp.hostname = url.parse(timestamp.uri)
                      .hostname
                    timestamp.signature = formatHex(data.signature)
                    timestamps.push(timestamp)
                    done()
                  }))
                }))
              }))
            }
          ], function (error) {
            if (error) {
              request.log.error(error)
              response.statusCode = 500
              response.end()
            } else {
              data.date = formatDate(data.date)
              data.digest = digest
              data.formattedDigest = formatHex(digest)
              data.timestamps = timestamps
              data.hostname = configuration.hostname
              if (data.description) {
                data.description = splitIntoParagraphs(data.description)
              }
              if (data.safety) {
                data.safety = splitIntoParagraphs(data.safety)
              }
              response.end(
                mustache.render(template, data)
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
