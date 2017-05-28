var makeValidPublication = require('./make-valid-publication')
var http = require('http')

module.exports = function (test, port, done) {
  var form = makeValidPublication()
  form.pipe(
    http.request({
      method: 'POST',
      path: '/publish',
      port: port,
      headers: form.getHeaders()
    })
      .once('response', function (response) {
        test.equal(
          response.statusCode, 201,
          'responds 201'
        )
        test.assert(
          response.headers.location.startsWith('/publications/'),
          'sets Location'
        )
        done()
      })
  )
}
