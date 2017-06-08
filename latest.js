var semver = require('semver')

module.exports = function (versions) {
  var latest = semver.maxSatisfying(Object.keys(versions), '*')
  return versions[latest]
}
