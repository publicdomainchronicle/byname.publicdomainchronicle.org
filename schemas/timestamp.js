var withVersion = require('./with-version')

module.exports = {
  '1.0.0': withVersion('1.0.0', require('./timestamp/1.0.0'))
}
