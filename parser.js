var clarinet = require('clarinet')
var stream = require('stream')
var util = require('util')
var ParserState = require('./parserState')
var _ = require('lodash')

var defaults = {
  resourcePath: ''
}

function JsonParser (opts) {
  this.opts = _.defaults(opts, defaults)
  this.parser = clarinet.parser()
  this.parserState = new ParserState()
  stream.Transform.call(this)
  this._readableState.objectMode = true
}

util.inherits(JsonParser, stream.Transform)

JsonParser.prototype._transform = function (chunk, encoding, callback) {
  if (encoding !== 'buffer') this.emit('error', new Error('unsupported encoding'))

  this.processChunk(chunk, callback)
}

JsonParser.prototype._flush = function (callback) {
  callback()
}

JsonParser.prototype.processChunk = function (chunk, callback) {
  var parser = this.parser
  var state = this.parserState

  if (!state.isEventsRegistered) {
    registerEvents.call(this)
    state.isEventsRegistered = true
  }
  state.chunkCallback = callback
  parser.write(chunk.toString()).close()
}

function registerEvents () {
  var state = this.parserState
  var resourcePath
  var parser = this.parser
  var scope = this
  var objMeta = state.objectMetaData

  if (this.opts.resourcePath) {
    resourcePath = processPath(this.opts.resourcePath)
  } else {
    resourcePath = ""
  }

  function processPath (path) {
    var segments = getPathSegments(path)
    // return joinPathSegments(segments)
  	return segments
  }

  parser.onerror = function (e) {
    scope.emit('error', e)
  }

  parser.onvalue = function (v) {
	if (state.isPathfound) processValue(v)
  }

  function processValue (value) {
    var obj = state.object
    var path = getRelativePath()
    if (!path) {
      console.log('################inside processValue emitting data')
      return scope.push(value)
    }
    var tokens = path.split('.')
    for (var i = 0; i < tokens.length - 1; i++) {
      // console.log('******* tokens[i]=', tokens[i])
      // console.log('******* obj[tokens[i]]=', obj[tokens[i]])
      if (typeof obj[tokens[i]] !== 'object') obj[tokens[i]] = {}
      if (Array.isArray(obj[tokens[i]])) {
      	obj = obj[tokens[i]][obj[tokens[i]].length - 1]
      } else {
      	obj = obj[tokens[i]]
      }
      // console.log('*********final obj=', obj)
    }
    if (obj[tokens[i]] && Array.isArray(obj[tokens[i]])) {
      obj[tokens[i]].push(value)
    } else {
      obj[tokens[i]] = value
      if(objMeta[state.currentPath] !== 'object' && objMeta[state.currentPath] !== 'Array') {
        lastIndex = state.currentPath.lastIndexOf('.')
        state.currentPath = state.currentPath.substring(0, lastIndex)
      }
    }
  }

  parser.onopenobject = function (key) {
	if (state.isPathfound) processOpenObject()
	if (state.isPathfound && !objMeta[state.currentPath]) objMeta[state.currentPath] = 'object'

	if (state.currentPath) {
	  state.currentPath = state.currentPath + '.' + key	
	} else {
	  state.currentPath = key
	}

	lastKey = key
	checkForResourcePath()

	if (!state.typeofResource && state.isPathfound) state.typeofResource = 'object'
  }

  function processOpenObject () {
    var obj = state.object
    var path = getRelativePath()
    if(!path) return
    var tokens = path.split('.')

    for (var i = 0; i < tokens.length - 1; i++) {
      if (typeof obj[tokens[i]] !== 'object') obj[tokens[i]] = {}
      if (Array.isArray(obj[tokens[i]])) {
      	obj = obj[tokens[i]][obj[tokens[i]].length - 1]
      } else {
      	obj = obj[tokens[i]]
      }
    }

    if (tokens[i] && Array.isArray(obj[tokens[i]])) {
      obj[tokens[i]].push({})
    } else {
      obj[tokens[i]] = {}
    }
  }

  parser.onkey = function (key) {
	if (state.currentPath) {
	  state.currentPath = state.currentPath + '.' + key	
	} else {
	  state.currentPath = key
	}
	lastKey = key
	checkForResourcePath()
  }

  parser.oncloseobject = function () {
	processCloseObject()
	if (objMeta[state.currentPath] === 'object') {
      lastIndex = state.currentPath.lastIndexOf('.')
      state.currentPath = state.currentPath.substring(0, lastIndex)
	}
	checkForResourcePath()
  }

  function processCloseObject () {
  	var lastIndex
  	var currentPath

    if (state.currentPath === resourcePath) {
      scope.push(state.object)
      state.object = {}
    } 
  }

  parser.onopenarray = function () {
	if (state.isPathfound) {
	  processOpenArray()
	  if (state.isPathfound && !objMeta[state.currentPath]) objMeta[state.currentPath] = 'Array'	
	}
	if (!state.typeofResource && state.isPathfound) state.typeofResource = 'Array'
  }

  function processOpenArray () {
    var obj = state.object
    var path = getRelativePath()
    if (!path) return
    var tokens = path.split('.')
    for (var i = 0; i < tokens.length - 1; i++) {
      if (typeof obj[tokens[i]] !== 'object') obj[tokens[i]] = {}
      if (Array.isArray(obj[tokens[i]])) {
      	obj = obj[tokens[i]][obj[tokens[i]].length - 1]
      } else {
      	obj = obj[tokens[i]]
      }
    }

    obj[tokens[i]] = []
  }

  parser.onclosearray = function () {
	processCloseArray()
	if (objMeta[state.currentPath] === 'Array') {
      lastIndex = state.currentPath.lastIndexOf('.')
      state.currentPath = state.currentPath.substring(0, lastIndex)
	}
  }

  function processCloseArray () {
  	
  }

  parser.onend = function () {
	state.chunkCallback()
  }

  function checkForResourcePath () {
  	if (!resourcePath) state.isPathfound = true
  	if (resourcePath) {
      if ((state.currentPath + '.').indexOf(resourcePath + '.') === 0) {
        state.isPathfound = true
      } else {
        state.isPathfound = false
      }
    }
  }

  function getRelativePath () {
    var tokens
    var jsonPath
    var index

    if (resourcePath) {
      jsonPath = state.currentPath.substring(resourcePath.length)
      if (!jsonPath) return
      if (jsonPath[0] === '.') jsonPath = jsonPath.substring(1)
    } else {
      jsonPath = state.currentPath
    }

    return jsonPath
  }
}

function getPathSegments (path) {
  var segments = []
  var buffer = []
  var inLiteral = false
  var escaped = false
  var wasLiteral = false
  var i

  if (!path) return []

  for (i = 0; i < path.length; i++) {
    var char = path[i]

    if (escaped) {
      escaped = false
      if (char === ']') {
        buffer[buffer.length - 1] = char
        continue
      }
    }

    if (char === '\\') escaped = true
    if (!inLiteral && char === ' ' && (buffer.length === 0 || wasLiteral)) continue

    if (!inLiteral && char === '[' && buffer.length === 0) {
      inLiteral = true
      continue
    }

    if (inLiteral && char === ']') {
      inLiteral = false
      wasLiteral = true
      continue
    }

    if (!inLiteral && (char === '.' || char === '[')) {
      segments.push(buffer.join(''))
      buffer = []
      inLiteral = char === '['
      wasLiteral = false
      continue
    }

    buffer.push(char)
  }

  // dont forget about the final segment...
  if (buffer.length) segments.push(buffer.join(''))

  // logger.info(segments)

  return segments
}

function joinPathSegments (segments) {
  if (!segments || !Array.isArray(segments)) return ''

  var path = ''

  for (var i = 0; i < segments.length; i++) {
    var segment = segments[i]
    var requiresBraces = false
    var regx = /\w+/g // this regx matches all strings which contain only a-zA-Z0-9
    var matches = segment.match(regx) || [] // if segment contains only a-zA-Z0-9 then match should
    // return only one string that is same as original Eg: segment = 'hello123' segment.match(regx) would
    // return ['hello123'] Eg2: segment = 'name@#$' will returned ['name'] not the same as original string
    // hence we can assume segment contains some special chars
    if (!matches.length || matches[0] !== segment) {
      requiresBraces = true
    }

    if (segment.indexOf(']') !== -1) {
      segment = segment.replace(/]/g, '\\]')
      requiresBraces = true
    }

    if (path.length) path += '.'
    if (requiresBraces) {
      path += '[' + segment + ']'
    } else {
      path += segment
    }
  }

  return path
}

module.exports = JsonParser
