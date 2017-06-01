var encoding = require('../encoding')
var methodNotAllowed = require('./method-not-allowed')
var readKeypair = require('../keypair/read')

module.exports = function (request, response, configuration) {
  if (request.method === 'GET') {
    readKeypair(configuration.directory, function (error, keypair) {
      /* istanbul ignore if */
      if (error) {
        request.log.error(error)
        response.statusCode = 500
        response.end()
      } else {
        response.statusCode = 200
        response.setHeader('Content-Type', 'text/plain')
        response.end(encoding.encode(keypair.public))
      }
    })
  } else {
    methodNotAllowed(response)
  }
}
