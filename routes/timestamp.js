var isDigest = require('is-sha-256-hex-digest')
var methodNotAllowed = require('./method-not-allowed')
var notFound = require('./not-found')
var path = require('path')
var readKeypair = require('../read-keypair')
var send = require('send')

module.exports = function (request, response, configuration) {
  if (request.method === 'GET') {
    var digest = request.params.digest
    if (!isDigest(digest)) {
      notFound(request, response)
    } else {
      var directory = configuration.directory
      readKeypair(directory, function (error, keypair) {
        /* istanbul ignore if */
        if (error) {
          response.statusCode = 500
          response.end()
        } else {
          var file = path.join(
            directory, 'publications', digest,
            keypair.public.toString('hex') + '.json'
          )
          send(request, file)
            .on('error', /* istanbul ignore next */ function (error) {
              request.log.error(error)
              response.statusCode = error.status || 500
              response.end()
            })
            .pipe(response)
        }
      })
    }
  } else {
    methodNotAllowed(response)
  }
}
