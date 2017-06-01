var fs = require('fs')
var encoding = require('../encoding')
var methodNotAllowed = require('./method-not-allowed')
var notFound = require('./not-found')
var path = require('path')
var send = require('send')

module.exports = function (request, response, configuration) {
  if (request.method === 'GET') {
    var publication = request.params.digest
    var attachment = request.params.attachment
    if (
      !encoding.isDigest(publication) ||
      !encoding.isDigest(attachment)
    ) {
      notFound(request, response)
    } else {
      var file = path.join(
        configuration.directory, 'publications', publication, attachment
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
