var encoding = require('../encoding')
var methodNotAllowed = require('./method-not-allowed')

module.exports = function (request, response, configuration) {
  if (request.method === 'GET') {
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/plain')
    response.end(encoding.encode(configuration.keypair.public))
  } else {
    methodNotAllowed(response)
  }
}
