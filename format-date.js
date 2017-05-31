var englishMonths = require('english-months')

module.exports = function (string) {
  var date = new Date(string)
  return (
    englishMonths[date.getMonth()] +
    ' ' + date.getDate() +
    ', ' + date.getFullYear() +
    ' at ' +
    date.getHours() +
    ':' +
    date.getMinutes() +
    ':' +
    (
      date.getSeconds() < 10
        ? '0' + date.getSeconds()
        : date.getSeconds()
    ) +
    ' GMT'
  )
}
