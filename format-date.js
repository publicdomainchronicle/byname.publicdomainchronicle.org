var englishMonths = require('english-months')

module.exports = function (string) {
  var date = new Date(string)
  return (
    englishMonths[date.getMonth()] +
    ' ' + date.getDate() +
    ', ' + date.getFullYear()
  )
}
