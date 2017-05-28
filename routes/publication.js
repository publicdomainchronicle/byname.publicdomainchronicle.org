var Negotiator = require('negotiator')
var isDigest = require('is-sha-256-hex-digest')
var methodNotAllowed = require('./method-not-allowed')
var path = require('path')
var send = require('send')

module.exports = function (request, response, directory) {
  if (request.method === 'GET') {
    var digest = request.params.digest
    if (!isDigest(digest)) {
      response.statusCode = 404
      response.end()
    } else {
      var type = new Negotiator(request).mediaType([
        'application/json'
        // TODO: test/plain
        // TODO: text/html
      ])
      if (!type) {
        response.statusCode = 415
        response.end()
      } else {
        /* istanbul ignore else */
        if (type === 'application/json') {
          var json = path.join(
            directory, 'publications', digest + '.json'
          )
          send(request, json)
            .on('error', /* istanbul ignore next */ function (error) {
              request.log.error(error)
              response.statusCode = error.status || 500
              response.end()
            })
            .pipe(response)
        }
      }
    }
  } else {
    methodNotAllowed(response)
  }
}
