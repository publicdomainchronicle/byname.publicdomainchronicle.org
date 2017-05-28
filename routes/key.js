var methodNotAllowed = require('./method-not-allowed')
var readKeypair = require('../read-keypair')

module.exports = function (request, response, directory) {
  if (request.method === 'GET') {
    readKeypair(directory, function (error, keypair) {
      /* istanbul ignore if */
      if (error) {
        request.log.error(error)
        response.statusCode = 500
        response.end()
      } else {
        response.statusCode = 200
        response.setHeader('Content-Type', 'text/plain')
        response.end(keypair.public.toString('hex'))
      }
    })
  } else {
    methodNotAllowed(response)
  }
}
