const s3Transload = require('../index')
const nock = require('nock')
const fs = require('fs')
const { isEqual } = require('lodash')

const IMAGE_BASE_URL = 'https://aws.amazon.com'
const IMAGE_URL_PATH = '/favicon.ico'
const IMAGE_FILE_PATH = __dirname + IMAGE_URL_PATH
const IMAGE_SIZE = String(fs.statSync(IMAGE_FILE_PATH).size)
const IMAGE_TYPE = 'image/x-icon'

const BUCKET_NAME = 'bucketName'
const ITEM_KEY = 'favicon.ico'
const S3_BASE_URL = 'https://s3.amazonaws.com'
const S3_URL_PATH = `/${BUCKET_NAME}/${ITEM_KEY}`

describe('s3-transload', () => {
  afterEach(() => {
    nock.cleanAll()
  })

  describe('when able to request image', () => {
    let imageScope, s3Scope
    beforeEach(() => {
      imageScope = nock(IMAGE_BASE_URL)
        .get(IMAGE_URL_PATH)
        .reply(200, (uri, requestBody) => {
          return fs.createReadStream(IMAGE_FILE_PATH)
        }, {
          'content-length': IMAGE_SIZE,
          'content-type': IMAGE_TYPE,
        })

      s3Scope = nock(S3_BASE_URL)
                  .put(S3_URL_PATH)
                  .reply(200)
    })
    afterEach(() => {
      nock.cleanAll()
    })

    it('successfully requested an image without error & was uploaded image to s3', (done) => {
      s3Transload.urlToS3(`${IMAGE_BASE_URL}${IMAGE_URL_PATH}`, BUCKET_NAME, ITEM_KEY, (err, data) => {
        expect(imageScope.isDone()).toBe(true)
        expect(s3Scope.isDone()).toBe(true)
        done()
      })
    })

    describe('when able to upload image', () => {
      beforeAll(() => {
        imageScope = nock(IMAGE_BASE_URL)
          .get(IMAGE_URL_PATH)
          .reply(200, (uri, requestBody) => {
            return fs.createReadStream(IMAGE_FILE_PATH)
          }, {
            'content-length': IMAGE_SIZE,
            'content-type': IMAGE_TYPE,
          })

        s3Scope = nock(S3_BASE_URL)
                    .put(S3_URL_PATH)
                    .reply(200)
      })
      afterAll(() => {
        nock.cleanAll()
      })

      it('returns expected data', (done) => {
        s3Transload.urlToS3(`${IMAGE_BASE_URL}${IMAGE_URL_PATH}`, BUCKET_NAME, ITEM_KEY, (err, data) => {
          expect(err).toBeNull()

          const expectedData = {
            contentLength: IMAGE_SIZE,
            contentType: IMAGE_TYPE,
            'location': `${S3_BASE_URL}${S3_URL_PATH}`,
          }
          expect(isEqual(data, expectedData)).toBe(true)
          done()
        })
      })
    })

    describe('when not able to upload image', () => {
      beforeEach(() => {
        nock.cleanAll()
        s3Scope = nock(S3_BASE_URL)
                    .put(S3_URL_PATH)
                    .reply(400)
      })

      // Combined specs here because of test flakiness if separated
      it('successfully requested an image without error & no image was uploaded to s3', (done) => {
        s3Transload.urlToS3(`${IMAGE_BASE_URL}${IMAGE_URL_PATH}`, BUCKET_NAME, ITEM_KEY, (err, data) => {
          // no image was uploaded to s3
          expect(err).not.toBeNull()
          expect(data).toBeUndefined()
          expect(s3Scope.isDone()).toBe(true)
          done()
        })
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
})
