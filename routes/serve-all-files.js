var glob = require('glob')
var path = require('path')
var serveFile = require('./serve-file')

module.exports = function (routes, extension) {
  glob.sync(path.join(__dirname, '..', 'static', '*.' + extension))
    .forEach(function (match) {
      match = path.basename(match)
      routes.set('/' + match, serveFile(match))
    })
}
