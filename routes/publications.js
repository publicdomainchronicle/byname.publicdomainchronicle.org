var Negotiator = require('negotiator')
var fs = require('fs')
var methodNotAllowed = require('./method-not-allowed')
var path = require('path')

module.exports = function (request, response, directory) {
  if (request.method === 'GET') {
    var type = new Negotiator(request).mediaType([
      'text/csv'
      // TODO: text/html
    ])
    if (!type) {
      response.statusCode = 415
      response.end()
    } else {
      /* istanbul ignore else */
      if (type === 'text/csv') {
        response.setHeader('Content-Type', 'text/csv; charset=ASCII')
        fs.createReadStream(
          path.join(directory, 'accessions')
        )
          .once('error', /* istanbul ignore next */ function (error) {
            request.log.error(error)
            response.statusCode = 500
            response.end()
          })
          .pipe(response)
      }
    }
  } else {
    methodNotAllowed(response)
  }
}
