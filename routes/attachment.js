var fs = require('fs')
var isDigest = require('is-sha-256-hex-digest')
var methodNotAllowed = require('./method-not-allowed')
var notFound = require('./not-found')
var path = require('path')
var send = require('send')

module.exports = function (request, response, directory) {
  if (request.method === 'GET') {
    var publication = request.params.digest
    var attachment = request.params.attachment
    if (!isDigest(publication) || !isDigest(attachment)) {
      notFound(request, response)
    } else {
      var file = path.join(
        directory, 'publications', publication, attachment
      )
      fs.readFile(file + '.type', function (error, header) {
        /* istanbul ignore if */
        if (error) {
          fail(error)
        } else {
          response.setHeader('Content-Type', header)
          send(request, file)
            .on('error', /* istanbul ignore next */ function (error) {
              fail(error)
            })
            .pipe(response)
        }
      })
    }
  } else {
    methodNotAllowed(response)
  }

  /* istanbul ignore next */
  function fail (error) {
    request.log.error(error)
    response.statusCode = error.status || 500
    response.end()
  }
}
