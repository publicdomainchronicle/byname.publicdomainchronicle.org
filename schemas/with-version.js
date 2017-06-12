module.exports = function (version, schema) {
  schema.properties.version = {
    type: 'string',
    constant: version
  }
  schema.required.push('version')
  return schema
}
