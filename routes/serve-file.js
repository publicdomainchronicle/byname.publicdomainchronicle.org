var methodNotAllowed = require('./method-not-allowed')
var path = require('path')
var send = require('send')

module.exports = function (name) {
  return function (request, response) {
    if (request.method === 'GET') {
      send(request, path.join(__dirname, '..', 'static', name))
        .on('error', /* istanbul ignore next */ function (error) {
          response.statusCode = error.status || 500
          response.end(error.message)
        })
        .pipe(response)
    } else {
      methodNotAllowed(response)
    }
  }
}
