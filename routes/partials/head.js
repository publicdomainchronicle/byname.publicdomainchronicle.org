var escape = require('../escape')
var html = require('../html')

module.exports = function (configuration, subtitle) {
  return html`
${configuration.base && `<base href="${configuration.base}">`}
<title>Public Domain Chronicle${subtitle && ` / ${escape(subtitle)}`}</title>
<link href=normalize.css rel=stylesheet>
<link href=styles.css rel=stylesheet>
  `
}
