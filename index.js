var pinoHTTP = require('pino-http')
var url = require('url')
var routes = require('./routes')
var notFound = require('./routes/not-found')

module.exports = function (VERSION, TIMEOUT, DIRECTORY, log) {
  log = pinoHTTP({logger: log})
  return function (request, response) {
    log(request, response)
    response.setTimeout(
      TIMEOUT,
      /* istanbul ignore next */ function () {
        response.log.error({event: 'timeout'})
        response.statusCode = 408
        response.removeAllListeners()
        response.end()
      }
    )
    var parsed = url.parse(request.url, true)
    request.query = parsed.query
    var route = routes.get(parsed.pathname)
    if (route.handler) {
      request.params = route.params
      route.handler(request, response, DIRECTORY)
    } else {
      notFound(request, response)
    }
  }
}
