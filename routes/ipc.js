/*
Copyright 2017 The BioBricks Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */
var fuzzysearch = require('fuzzysearch')
var methodNotAllowed = require('./method-not-allowed')

// Lots of RAM...
var rawCatchwords = require('../catchwords')
var catchwords = Object.keys(rawCatchwords)
  .reduce(function (catchwords, key) {
    var ipcs = rawCatchwords[key]
      .filter(function (element) {
        return element.length === 14
      })
    if (ipcs.length !== 0) {
      catchwords.push([
        key.toLowerCase(),
        ipcs.map(function (symbol) {
          return unparse(parseSymbol(symbol))
        })
      ])
    }
    return catchwords
  }, [])
rawCatchwords = null

module.exports = function (request, response, configuration) {
  if (request.method === 'GET') {
    var search = request.query.search
    if (search) {
      response.setHeader(
        'Content-Type', 'application/json'
      )
      response.end(JSON.stringify(
        catchwords.reduce(function (matches, element) {
          var catchword = element[0]
          return fuzzysearch(search, catchword)
            ? matches.concat(
              {
                catchword: catchword,
                ipcs: element[1]
              }
            )
            : matches
        }, [])
      ))
    } else {
      response.statusCode = 400
      response.end()
    }
  } else {
    methodNotAllowed(response)
  }
}

function parseSymbol (symbol) {
  return {
    section: symbol[0],
    class: parseInt(symbol.substr(1, 2)),
    subclass: symbol[3],
    group: parseInt(symbol.substr(4, 4)),
    // The string encoding for subgroups is bizarre.
    // For example:
    // ...421000 -> 421
    // ...100000 -> 10
    // ...010000 -> 1
    subgroup: symbol.endsWith('0'.repeat(4))
      ? parseInt(symbol.substr(8, 2))
      : parseInt(symbol.substr(8, 3))
  }
}

function unparse (parsed) {
  return (
    parsed.section +
    parsed.class +
    parsed.subclass +
    ' ' +
    parsed.group +
    '/' +
    (
      parsed.subgroup.length === 2
        ? parsed.subgroup
        : ('0' + parsed.subgroup)
    )
  )
}
