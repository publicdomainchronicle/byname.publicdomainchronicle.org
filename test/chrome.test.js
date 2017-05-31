var server = require('./server')
var tape = require('tape')
var webdriver = require('./webdriver')

tape('chrome', function (suite) {
  suite.test('publish', function (test) {
    test.plan(1)
    server(function (webServerPort, done) {
      webdriver
        .url('http://localhost:' + webServerPort + '/publish')
        .setValue('input[name=title]', 'Test Invention')
        .setValue('textarea[name=description]', 'Test description')
        .click('input[name=declaration]')
        .click('input[name=license]')
        .click('button.safety')
        .click('input[type=submit]')
        .waitForExist('.title')
        .isExisting('//*[contains(text(), "Test Invention")]')
        .then(function (existing) {
          test.assert(existing)
          done()
        })
    })
  })
})
