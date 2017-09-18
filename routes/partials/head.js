var escape = require('../escape')
var html = require('../html')

var BASE_HREF = process.env.BASE_HREF

module.exports = function (subtitle) {
  return html`
${BASE_HREF && `<base href="${BASE_HREF}">`}
<title>Public Domain Chronicle${subtitle && ` / ${escape(subtitle)}`}</title>
<link href=/normalize.css rel=stylesheet>
<link href=/styles.css rel=stylesheet>
  `
}
