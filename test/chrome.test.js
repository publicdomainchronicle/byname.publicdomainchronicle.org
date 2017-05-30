var server = require('./server')
var tape = require('tape')
var webdriver = require('./webdriver')

tape('sanity check', function (test) {
  test.plan(1)
  server(function (webServerPort, done) {
    webdriver
      .url('http://localhost:' + webServerPort + '/publish')
      .isExisting('//*[contains(text(), "Publish")]')
      .then(function (existing) {
        test.assert(existing)
        done()
      })
  })
})
