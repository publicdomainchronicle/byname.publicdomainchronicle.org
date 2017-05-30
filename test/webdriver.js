var spawn = require('child_process').spawn
var path = require('path')

var CHROMEDRIVER = path.join(
  __dirname, '..', 'node_modules', '.bin', 'chromedriver'
)

var chromedriver = spawn(CHROMEDRIVER, ['--url-base=/wd/hub'])

require('tape').onFinish(function () {
  webdriver.end()
  chromedriver.kill()
})

var webdriver = module.exports = require('webdriverio')
  .remote({
    host: 'localhost',
    port: 9515,
    desiredCapabilities: {
      browserName: 'chrome'
    }
  })
  .init()
  .timeouts('script', 1000)
  .timeouts('implicit', 1000)
