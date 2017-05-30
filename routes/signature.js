var isDigest = require('is-sha-256-hex-digest')
var methodNotAllowed = require('./method-not-allowed')
var notFound = require('./not-found')
var path = require('path')
var send = require('send')

module.exports = function (request, response, configuration) {
  if (request.method === 'GET') {
    var digest = request.params.digest
    if (!isDigest(digest)) {
      notFound(request, response)
    } else {
      var file = path.join(
        configuration.directory, 'publications', digest + '.sig'
      )
      send(request, file)
        .on('error', /* istanbul ignore next */ function (error) {
          request.log.error(error)
          response.statusCode = error.status || 500
          response.end()
        })
        .pipe(response)
    }
  } else {
    methodNotAllowed(response)
  }
}
