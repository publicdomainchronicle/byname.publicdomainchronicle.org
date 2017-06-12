var encoding = require('../encoding')
var methodNotAllowed = require('./method-not-allowed')
var notFound = require('./not-found')
var path = require('path')
var send = require('send')
var timestampPath = require('../util/timestamp-path')

module.exports = function (request, response, configuration) {
  if (request.method === 'GET') {
    var digest = request.params.digest
    var key = request.params.key
    if (!encoding.isDigest(digest)) {
      notFound(request, response)
    } else {
      var directory = configuration.directory
      var file = timestampPath(directory, digest, key)
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
