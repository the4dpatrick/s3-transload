const s3Transload = require('../index')
const nock = require('nock')
const fs = require('fs')

const IMAGE_BASE_URL = 'https://aws.amazon.com'
const IMAGE_URL_PATH = '/favicon.ico'

const BUCKET_NAME = 'bucketName'
const ITEM_KEY = 'itemKey'
const S3_BASE_URL = 'https://s3.amazonaws.com'
const S3_URL_PATH = `/${BUCKET_NAME}/${ITEM_KEY}`

fdescribe('s3-transload', () => {
  afterEach(() => {
    nock.cleanAll()
  })

  describe('when able to request image', () => {
    let imageScope, s3Scope
    beforeEach(() => {
      imageScope = nock(IMAGE_BASE_URL)
        .get(IMAGE_URL_PATH)
        .reply(200, (uri, requestBody) => {
          return fs.createReadStream(__dirname + '/favicon.ico')
        })

      s3Scope = nock(S3_BASE_URL)
                  .put(S3_URL_PATH)
                  .reply(200)
    })

    it('successfully requested an image without error', (done) => {
      s3Transload.urlToS3(`${IMAGE_BASE_URL}${IMAGE_URL_PATH}`, BUCKET_NAME, ITEM_KEY, (err, data) => {
        expect(imageScope.isDone()).toBe(true)
        done()
      })
    })

    it('image is uploaded s3', (done) => {
      s3Transload.urlToS3(`${IMAGE_BASE_URL}${IMAGE_URL_PATH}`, BUCKET_NAME, ITEM_KEY, (err, data) => {
        expect(s3Scope.isDone()).toBe(true)
        done()
      })
    })
  })

  describe('when not able to request image', () => {
    let imageScope, s3Scope
    beforeEach(() => {
      imageScope = nock(IMAGE_BASE_URL)
        .get(IMAGE_URL_PATH)
        .reply(400)

      s3Scope = nock(S3_BASE_URL)
                  .put(S3_URL_PATH)
                  .reply(200)
    })

    it('returns error after image request', (done) => {
      s3Transload.urlToS3(`${IMAGE_BASE_URL}${IMAGE_URL_PATH}`, BUCKET_NAME, ITEM_KEY, (err, data) => {
        expect(err).toEqual(new Error('request item did not respond with HTTP 200'))
        expect(imageScope.isDone()).toBe(true)
        done()
      })
    })

    it('image was not uploaded to s3', (done) => {
      s3Transload.urlToS3(`${IMAGE_BASE_URL}${IMAGE_URL_PATH}`, BUCKET_NAME, ITEM_KEY, (err, data) => {
        expect(s3Scope.isDone()).toBe(false)
        done()
      })
    })
  })

  describe('when able to upload image', () => {
    let imageScope, s3Scope
    beforeEach(() => {
      imageScope = nock(IMAGE_BASE_URL)
        .get(IMAGE_URL_PATH)
        .reply(200, (uri, requestBody) => {
          return fs.createReadStream(__dirname + '/favicon.ico')
        })

      s3Scope = nock(S3_BASE_URL)
                  .put(S3_URL_PATH)
                  .reply(200)
    })

    it('successfully requested an image without error', (done) => {
      s3Transload.urlToS3(`${IMAGE_BASE_URL}${IMAGE_URL_PATH}`, BUCKET_NAME, ITEM_KEY, (err, data) => {
        expect(imageScope.isDone()).toBe(true)
        done()
      })
    })

    it('image was uploaded to s3', (done) => {
      s3Transload.urlToS3(`${IMAGE_BASE_URL}${IMAGE_URL_PATH}`, BUCKET_NAME, ITEM_KEY, (err, data) => {
        expect(s3Scope.isDone()).toBe(true)
        done()
      })
    })
  })

  describe('when not able to upload image', () => {
    let imageScope, s3Scope
    beforeEach(() => {
      imageScope = nock(IMAGE_BASE_URL)
        .get(IMAGE_URL_PATH)
        .reply(200, (uri, requestBody) => {
          return fs.createReadStream(__dirname + '/favicon.ico')
        })

      s3Scope = nock(S3_BASE_URL)
                  .put(S3_URL_PATH)
                  .reply(400)
    })

    // Combined specs here because of test flakiness if separated
    it('successfully requested an image without error & no image was uploaded to s3', (done) => {
      s3Transload.urlToS3(`${IMAGE_BASE_URL}${IMAGE_URL_PATH}`, BUCKET_NAME, ITEM_KEY, (err, data) => {
        // successfully requested an image without error
        expect(imageScope.isDone()).toBe(true)

        // no image was uploaded to s3
        expect(err).not.toBeNull()
        expect(data).toBeUndefined()
        expect(s3Scope.isDone()).toBe(true)
        done()
      })
    })
  })
})
