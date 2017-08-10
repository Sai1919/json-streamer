var Parser = require('../parser')
var fs = require('fs')
var should = require('should')

describe.only('Tests', function () {
  describe('Basic behaviour', function () {
  	it('should properly parse a simple file', function (done) {
      var parser = new Parser({resourcePath: 'data'})
      var jsonStream = fs.createReadStream('./test/Fixtures/sample.json')
      var actualData
      var expected = {
        "name": "sai",
        "age": 24,
        "gender": "M"
  	  }

      parser.on('data', function (data) {
        actualData = data
      })

      parser.on('error', function (err) {
        done(err)
      })

      parser.on('end', function () {
      	done()
      })

      jsonStream.pipe(parser)
  	})

  	it('should properly parse a simple file containing array', function (done) {
      var parser = new Parser()
      var jsonStream = fs.createReadStream('./test/Fixtures/array.json')
      var actualData = []
      var expected = [
        {
          "name": "sai",
          "age": 24,
          "single": true,
          "ph": [10, 20, 30] 
        },
        {
          "name": "sai",
          "age": 24,
          "single": true,
          "ph": [40, 50, 60] 
        },
        {
          "name": "sai",
          "age": 24,
          "single": true,
          "ph": [70, 80, 90] 
        }
      ]

      parser.on('data', function (data) {
        actualData.push(data)
      })

      parser.on('error', function (err) {
        done(err)
      })

      parser.on('end', function () {
      	console.log('******inside test end event actualData=', actualData)
      	actualData.length.should.equal(3)
      	actualData.should.deepEqual(expected)
      	done()
      })

      jsonStream.pipe(parser)
  	})

  	it('should properly parse a simple file containing array of primitives', function (done) {
      var parser = new Parser({resourcePath: 'data'})
      var jsonStream = fs.createReadStream('./test/Fixtures/test.json')
      var actualData = []
      var expected = [10, 20, 30, true, "hello", 10.2]

      parser.on('data', function (data) {
        console.log('*****inside data event', data)
        actualData.push(data)
      })

      parser.on('error', function (err) {
        done(err)
      })

      parser.on('end', function () {
      	console.log('******inside end event actualData=', actualData)
      	actualData.should.deepEqual(expected)
      	done()
      })

      jsonStream.pipe(parser)
  	})

  	it('should properly parse a file containing array of objects with deep paths', function (done) {
      var parser = new Parser()
      var jsonStream = fs.createReadStream('./test/Fixtures/deepNested.json')
      var actualData = []
      var expected = [
  		{
  		  "orders": [
  	        {
  	  	      "name": "order1",
  	  	      "date": "12/5/90",
  	  	      "items": [
                {
          	      "name": "order1-item1",
          	      "price": 898,
          	      "delivered": false
                },
                {
          	      "name": "order1-item2",
          	      "price": 89,
          	      "delivered": true
                }
  	  	      ]
  	        },
            {
              "name": "order2",
              "date": "12/5/90",
              "items": [
                {
                  "name": "order2-item1",
                  "price": 98,
                  "delivered": true
                },
                {
                  "name": "order2-item2",
                  "price": 98324,
                  "delivered": true
                }
              ]
            }
  	      ]
        }
      ]

      parser.on('data', function (data) {
        actualData.push(data)
      })

      parser.on('error', function (err) {
        done(err)
      })

      parser.on('end', function () {
      	console.log('*******actualData=', JSON.stringify(actualData, null, 2))
      	actualData.should.deepEqual(expected)
      	done()
      })

      jsonStream.pipe(parser)
  	})
  })
})