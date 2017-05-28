var Negotiator = require('negotiator')
var ecb = require('ecb')
var fs = require('fs')
var isDigest = require('is-sha-256-hex-digest')
var methodNotAllowed = require('./method-not-allowed')
var mustache = require('mustache')
var parse = require('json-parse-errback')
var path = require('path')
var runParallel = require('run-parallel')
var send = require('send')

var TEMPLATE = path.join(__dirname, 'publication.html')

module.exports = function (request, response, directory) {
  if (request.method === 'GET') {
    var digest = request.params.digest
    if (!isDigest(digest)) {
      response.statusCode = 404
      response.end()
    } else {
      var type = new Negotiator(request).mediaType([
        'application/json', 'text/html'
        // TODO: text/plain
      ])
      if (!type) {
        response.statusCode = 415
        response.end()
      } else {
        var json = path.join(
          directory, 'publications', digest + '.json'
        )
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
          runParallel([
            function (done) {
              fs.readFile(TEMPLATE, 'utf8', ecb(done, function (read) {
                template = read
                done()
              }))
            },
            function (done) {
              fs.readFile(json, 'utf8', ecb(done, function (read) {
                parse(read, ecb(done, function (parsed) {
                  data = parsed
                  done()
                }))
              }))
            }
          ], function (error) {
            if (error) {
              request.log.error(error)
              response.statusCode = 500
              response.end()
            } else {
              data.scientist = data.anonymous
                ? false
                : {
                  name: data.name,
                  institution: data.institution
                }
              data.date = new Date(parseInt(data.time))
              data.digest = digest
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
