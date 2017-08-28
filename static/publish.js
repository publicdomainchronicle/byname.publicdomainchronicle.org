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

document.addEventListener('DOMContentLoaded', function () {
  addAnotherInputButton('publications', 'Publication', 25)
  addAnotherInputButton('attachments', 'Attachment', 5)
  addSubmitSafety()
  addWordCount('finding')
  addWordCount('safety')
  warnAboutFileTypes()
  configurePatentSearch()
})

// Add a button at the end of a <section> to add another
// <li><input></li> to the <section>'s <ul>.
function addAnotherInputButton (sectionID, buttonText, max) {
  var section = document.getElementById(sectionID)
  var button = document.createElement('button')
  button.appendChild(
    document.createTextNode('Add Another ' + buttonText)
  )
  button.addEventListener('click', function (event) {
    var ul = section.getElementsByTagName('ul')[0]
    var items = ul.getElementsByTagName('li')
    var firstItem = items[0]
    // Clone the first <li><input></li> in the <ul>.
    var clone = firstItem.cloneNode(true)
    // Clear the cloned <input>'s value.
    clone.getElementsByTagName('input')[0].value = ''
    // Append the cloned <li> to the <ul>.
    ul.appendChild(clone)
    if (items.length > max - 1) {
      section.removeChild(button)
    }
    event.preventDefault()
    event.stopPropagation()
  })
  section.appendChild(button)
}

var SAFETY_TIMEOUT = 10000

// Disable the form submit button, and add a "safety switch" button
// beside it that enables submission for 10 seconds.  This should help
// prevent folks from accidentally clicking submit, at least when
// JavaScript is enabled in their browsers.
function addSubmitSafety () {
  var section = document.getElementById('submit')
  var submit = section.getElementsByTagName('input')[0]
  var safety = document.createElement('button')
  safety.className = 'safety'
  safety.appendChild(
    document.createTextNode('Enable the Publish Button')
  )
  submit.setAttribute('disabled', true)
  safety.addEventListener('click', function (event) {
    section.removeChild(safety)
    submit.removeAttribute('disabled')
    setTimeout(addSubmitSafety, SAFETY_TIMEOUT)
    event.preventDefault()
    event.stopPropagation()
  })
  section.appendChild(safety, submit)
}

// Add a <p> listing word count below the <textarea> in a <section>.
function addWordCount (sectionID) {
  var section = document.getElementById(sectionID)
  var textarea = section.getElementsByTagName('textarea')[0]
  var wordCount = document.createElement('p')
  wordCount.className = 'wordCount'
  section.appendChild(wordCount)
  textarea.addEventListener('keyup', updateCount)
  textarea.addEventListener('paste', updateCount)
  updateCount()
  function updateCount () {
    var count = countWords(textarea)
    wordCount.innerHTML = count === 1 ? '1 word' : count + ' words'
  }
}

function countWords (textarea) {
  return textarea.value.split(/\w+\s*/g).length - 1
}

function configurePatentSearch () {
  var list = document.getElementById('ipcs')
  var input = document.getElementById('ipcSearchBox')
  var button = document.getElementById('ipcSearchButton')
  var request
  input.addEventListener('keypress', function (event) {
    if (event.keyCode === 13) {
      event.preventDefault()
      event.stopPropagation()
      searchIPCSs()
    }
  })
  button.addEventListener('click', function (event) {
    event.preventDefault()
    event.stopPropagation()
    searchIPCSs()
  })
  function searchIPCSs () {
    var search = input.value
    if (search) {
      if (request) {
        request.abort()
      }
      request = new window.XMLHttpRequest()
      request.overrideMimeType('text/plain')
      request.addEventListener('load', function () {
        var body = this.responseText
        window.requestAnimationFrame(function () {
          removeUncheckedIPCs()
          var checked = checkedIPCs()
          body
            .split('\n')
            .forEach(function (line) {
              var split = line.split('\t')
              var ipc = split[0]
              var description = split[1]
              if (checked.indexOf(ipc) !== -1) return
              var li = document.createElement('li')
              var label = document.createElement('label')
              var input = document.createElement('input')
              input.setAttribute('type', 'checkbox')
              input.setAttribute('value', ipc)
              input.setAttribute('name', 'classifications[]')
              input.addEventListener('change', function () {
                if (this.checked) {
                  removeUncheckedIPCs(this.value)
                }
              })
              label.appendChild(input)
              label.appendChild(
                document.createTextNode(
                  ' ' + ipc + ': ' + description
                )
              )
              list.appendChild(li)
              li.appendChild(label)
            })
        })
      })
      request.open(
        'GET', '/ipc?search=' + encodeURIComponent(input.value)
      )
      request.send()
    } else {
      window.requestAnimationFrame(function () {
        removeUncheckedIPCs()
      })
    }
  }
}

function checkedIPCs () {
  var returned = []
  eachIPCItem(function (li, input) {
    if (input.checked) {
      returned.push(input.value)
    }
  })
  return returned
}

function removeUncheckedIPCs (ipc) {
  var toRemove = []
  eachIPCItem(function (li, input) {
    if (
      !input.checked &&
      (
        ipc === undefined ||
        input.value === ipc
      )
    ) {
      toRemove.push(li)
    }
  })
  toRemove.forEach(function (element) {
    element.parentNode.removeChild(element)
  })
}

function eachIPCItem (iterator) {
  var list = document.getElementById('ipcs')
  var children = list.children
  for (var index = 0; index < children.length; index++) {
    var li = children[index]
    var input = li.getElementsByTagName('input')[0]
    iterator(li, input)
  }
}

var DOCUMENT_TYPES = [
  'application/excel',
  'application/msword',
  'application/pdf',
  'application/rtf',
  'application/vnd.openxmlformats-officedocument.' +
  'spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.' +
  'wordprocessingml.document',
  'application/x-excel',
  'text/richtext'
]

var DOCUMENT_EXTENSIONS = [
  'pdf', 'doc', 'rtf', 'docx', 'xls', 'xlsx', 'ps', 'latex', 'tex'
]

var SOFTWARE_TYPES = [
  'application/java',
  'application/java-byte-code',
  'application/javascript',
  'application/x-bytecode.python',
  'application/x-java-class',
  'application/x-javascript',
  'text/javascript',
  'text/x-javascript',
  'text/x-script.phyton'
]

var SOFTWARE_EXTENSIONS = [
  'c', 'cpp', 'cc', 'js', 'java', 'rb', 'py'
]

var SOFTWARE_WARNING = [
  'The attachment above looks like computer software.',
  'Please consider releasing under an',
  '<a href=https://opensource.org/licenses>',
  'open source software license',
  '</a>.'
].join(' ')

var DOCUMENT_WARNING = [
  'This attachment looks like a word-processing document',
  'rather than a data file.',
  'You should publish documents through a preprint server instead,',
  'and describey what you’ve found succinctly above.'
].join(' ')

// Add a listener to <input type=file> that displays warnings and errors
// about attachments that are likely documents or source code.
function warnAboutFileTypes () {
  document.getElementById('attachments')
    .addEventListener('change', onChange)

  function onChange (event) {
    event.preventDefault()
    event.stopPropagation()
    var looksLikeSoftware = false
    var looksLikeDocument = false
    var input = event.target
    var files = input.files
    for (var index = 0; index < files.length; index++) {
      var file = files[index]
      SOFTWARE_EXTENSIONS.forEach(function (extension) {
        if (file.name.endsWith(extension)) looksLikeSoftware = true
      })
      if (!looksLikeSoftware) {
        looksLikeSoftware = SOFTWARE_TYPES.some(function (type) {
          return file.type === type
        })
      }
      DOCUMENT_EXTENSIONS.forEach(function (extension) {
        if (file.name.endsWith(extension)) looksLikeDocument = true
      })
      if (!looksLikeDocument) {
        looksLikeDocument = DOCUMENT_TYPES.some(function (type) {
          return file.type === type
        })
      }
    }
    var warning
    if (looksLikeSoftware || looksLikeDocument) {
      warning = input.nextSibling
      if (!warning) {
        warning = document.createElement('p')
        setClassName(warning)
        warning.innerHTML = looksLikeDocument
          ? DOCUMENT_WARNING
          : SOFTWARE_WARNING
        input.parentNode.appendChild(warning)
      } else {
        setClassName(warning)
        warning.innerHTML = looksLikeDocument
          ? DOCUMENT_WARNING
          : SOFTWARE_WARNING
      }
    } else {
      warning = input.nextSibling
      if (warning) {
        warning.parentNode.removeChild(warning)
      }
    }
    function setClassName (warning) {
      warning.className = looksLikeDocument ? 'problem' : 'legal'
    }
  }
}

if (!String.prototype.endsWith) {
  // eslint-disable-next-line no-extend-native
  String.prototype.endsWith = function (search, position) {
    if (!(position < this.length)) {
      position = this.length
    }
    var length = search.length
    return this.substr(position - length, length) === search
  }
}
