var FormData = require('form-data')

module.exports = function (title) {
  var form = new FormData()
  form.append('name', 'Kyle E. Mitchell')
  form.append('affiliation', 'BioBricks Foundation')
  form.append('title', title || 'Made-Up Discovery')
  form.append('description', 'Pat head. Rub stomach. Eureka!')
  form.append('journals[]', 'Nature')
  form.append('safety', 'Watch your elbows.')
  form.append('declaration', '0.0.0')
  form.append('license', '0.0.0')
  form.append('g-recaptcha-response', 'test')
  return form
}
