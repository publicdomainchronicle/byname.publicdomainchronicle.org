var fields = {
  anonymous: [
    isBoolean
  ],
  name: [
    unlessAnonymous(isString),
    unlessAnonymous(isNotEmpty),
    unlessAnonymous(minLength(3)),
    unlessAnonymous(maxLength(200))
  ],
  institution: [
    unlessAnonymous(isString),
    unlessAnonymous(isNotEmpty),
    unlessAnonymous(minLength(1)),
    unlessAnonymous(maxLength(200))
  ],
  title: [
    isString,
    isNotEmpty,
    minLength(5)
  ],
  description: [
    isString,
    isNotEmpty,
    minLength(10)
  ],
  safety: [
    isString
  ]
}

module.exports = function (data) {
  return Object.keys(data).reduce(function (errors, key) {
    if (fields.hasOwnProperty(key)) {
      var validators = fields[key]
      var value = data[key]
      return validators.reduce(function (errors, validator) {
        var error = validator(value, data)
        return error
          ? capitalize(key) + ' ' + errors.concat(error) + '.'
          : errors
      }, errors)
    } else {
      return errors.concat('Extra "' + key + '" field')
    }
  }, [])
}

function unlessAnonymous (validator) {
  return function (value, context) {
    if (context.anonymous !== true) {
      return validator(value, context)
    }
  }
}

function minLength (n) {
  return function (value) {
    if (n.length < n) {
      return 'must be at least ' + n + ' characters'
    }
  }
}

function maxLength (n) {
  return function (value) {
    if (n.length > n) {
      return 'must be less than ' + n + ' characters'
    }
  }
}

function capitalize (string) {
  return string[0].toUpperCase() + string.substring(1)
}

function isBoolean (value) {
  if (value !== 'true' && value !== 'false') {
    return 'must be true or false'
  }
}

function isString (value) {
  if (typeof value !== 'string') {
    return 'must be a string'
  }
}

function isNotEmpty (value) {
  if (value.length === 0) {
    return 'must not be empty'
  }
}
