var pinoHTTP = require('pino-http')
var url = require('url')
var routes = require('./routes')
var notFound = require('./routes/not-found')

module.exports = function (VERSION, TIMEOUT, log, level) {
  log = pinoHTTP({logger: log})
  return function (request, response) {
    log(request, response)
    response.setTimeout(TIMEOUT, function () {
      response.log.error({event: 'timeout'})
      response.statusCode = 408
      response.removeAllListeners()
      response.end()
    })
    var parsed = url.parse(request.url, true)
    request.query = parsed.query
    request.params = parsed.params
    var route = routes.get(parsed.pathname)
    if (route.handler) {
      route.handler(request, response, log, level)
    } else {
      notFound(request, response)
    }
  }
}
