var spawn = require('child_process').spawn
var path = require('path')

var CHROMEDRIVER = path.join(
  __dirname, '..', 'node_modules', '.bin', 'chromedriver'
)

var chromedriver = spawn(CHROMEDRIVER, ['--url-base=/wd/hub'])

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

require('tape').onFinish(cleanup)
process
  .on('SIGTERM', cleanup)
  .on('SIGQUIT', cleanup)
  .on('SIGINT', cleanup)
  .on('uncaughtException', cleanup)

function cleanup () {
  webdriver.end()
  chromedriver.kill()
}
