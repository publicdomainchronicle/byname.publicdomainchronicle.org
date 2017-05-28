var sendFile = require('./serve-file')

var handler = sendFile('not-found.html')

module.exports = function (request, response) {
  response.statusCode = 404
  handler(request, response)
}
