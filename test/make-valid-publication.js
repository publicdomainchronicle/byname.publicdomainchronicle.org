var FormData = require('form-data')

module.exports = function (title) {
  var form = new FormData()
  form.append('anonymous', 'false')
  form.append('name', 'Kyle E. Mitchell')
  form.append('institution', 'BioBricks Foundation')
  form.append('title', title || 'Made-Up Discovery')
  form.append('description', 'Pat head. Rub stomach. Eureka!')
  form.append('safety', 'Watch your elbows.')
  return form
}
