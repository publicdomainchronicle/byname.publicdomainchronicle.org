var html = require('../html')

module.exports = function () {
  return html`
    <nav>
      <ul>
        <li><a href=/publish>Publish</a></li>
        <li><a href=/accessions>Accessions</a></li>
        <li><a href=rss.xml>RSS Feed</a></li>
        <li><a href=declaration>Declaration</a></li>
        <li><a href=license>License</a></li>
      </ul>
    </nav>
  `
}
