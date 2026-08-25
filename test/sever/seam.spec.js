import fs from 'fs'
import path from 'path'
import server from '../../app.js'
import request from 'supertest'

afterEach(() => {
  server.close()
})

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoibW9sdW5lcmZpbm4iLCJpZCI6MiwiaWF0IjoxNTA5ODAwNTg2fQ.JHHqSDNUgg9YAFGWtD0m3mYc9-XR3Gpw9gkZQXPSavM'

const hasDist = fs.existsSync(path.resolve('dist', 'index.html'))

describe('Router mount points', () => {
  test('Get user info only under the /auth prefix', async () => {
    const mounted = await request(server).get('/auth/user/2')
    expect(mounted.status).toBe(200)
    expect(mounted.body.user_name).toBe('molunerfinn')

    const unmounted = await request(server).get('/user/2')
    expect(unmounted.body.user_name).toBeUndefined()
  })

  test('Only the requests under the /api prefix need the JWT', async () => {
    const guarded = await request(server).get('/api/todolist/2')
    expect(guarded.status).toBe(401)

    const unguarded = await request(server).get('/todolist/2')
    expect(unguarded.status).not.toBe(401)
  })

  test('Getting an unrouted /api path should return 401 if not set the JWT', async () => {
    const response = await request(server).get('/api/not-a-route')
    expect(response.status).toBe(401)
  })
})

describe('Response body of a failed JWT check', () => {
  test('Should return the fixed 401 info if not set the Authorization header', async () => {
    const response = await request(server).get('/api/todolist/2')
    expect(response.status).toBe(401)
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8')
    expect(response.headers['content-length']).toBe('111')
    expect(response.headers['www-authenticate']).toBeUndefined()
    expect(response.text).toBe([
      '{',
      '  "success": false,',
      '  "token": null,',
      '  "info": "Protected resource, use Authorization header to get access"',
      '}'
    ].join('\n'))
  })

  test('A bad token & a malformed Authorization header share the same 401', async () => {
    const badToken = await request(server).get('/api/todolist/2').set('Authorization', 'Bearer not-a-token')
    const badHeader = await request(server).get('/api/todolist/2').set('Authorization', 'NotBearer abc')
    expect(badToken.status).toBe(401)
    expect(badHeader.status).toBe(401)
    expect(badToken.text).toBe(badHeader.text)
    expect(badToken.headers['content-length']).toBe('111')
  })
})

describe('Serialization of the JSON response body', () => {
  test('Should indent by two spaces & end without a newline', async () => {
    const response = await request(server).get('/api/todolist/3').set('Authorization', `Bearer ${token}`)
    expect(response.status).toBe(200)
    expect(response.text).toBe('{\n  "success": true,\n  "result": []\n}')
  })

  test('Should return Chinese as raw UTF-8 bytes without escaping', async () => {
    const response = await request(server).post('/auth/user').send({name: 'MARK', password: '123'})
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8')
    expect(response.headers['content-length']).toBe('54')
    expect(response.text).toBe('{\n  "success": false,\n  "info": "用户不存在！"\n}')
    expect(Buffer.from(response.text, 'utf8').includes(Buffer.from('用户不存在！', 'utf8'))).toBe(true)
  })
})

describe('Response for a user that is not exist', () => {
  test('Should return 204 without any body & Content-Type', async () => {
    const response = await request(server).get('/auth/user/10')
    expect(response.status).toBe(204)
    expect(response.headers['content-type']).toBeUndefined()
    expect(response.headers['content-length']).toBeUndefined()
    expect(response.text).toBeFalsy()
  })
})

describe('Keeping the upstream behaviour', () => {
  test('Getting user info should still leak the password hash', async () => {
    const response = await request(server).get('/auth/user/2')
    expect(response.status).toBe(200)
    expect(response.body.password).toMatch(/^\$2[aby]\$/)
  })

  test('Get todolist -> [] if the id is not a number', async () => {
    const response = await request(server).get('/api/todolist/abc').set('Authorization', `Bearer ${token}`)
    expect(response.status).toBe(200)
    expect(response.body.result).toEqual([])
  })
})

describe('Overriding the default responses of the framework', () => {
  test('Should return a plain text 404 if no route matches the method', async () => {
    const response = await request(server).delete('/auth/user/2')
    expect(response.status).toBe(404)
    expect(response.headers['content-type']).toBe('text/plain; charset=utf-8')
    expect(response.headers['allow']).toBeUndefined()
    expect(response.text).toBe('Not Found')
  })

  test('Should not answer an OPTIONS request from the router', async () => {
    const response = await request(server).options('/auth/user')
    expect(response.status).toBe(404)
    expect(response.headers['allow']).toBeUndefined()
    expect(response.text).toBe('Not Found')
  })

  test('Should return a plain text 400 if the JSON body is not parseable', async () => {
    const response = await request(server)
      .post('/auth/user')
      .set('Content-Type', 'application/json')
      .send('{"name": ')
    expect(response.status).toBe(400)
    expect(response.headers['content-type']).toBe('text/plain; charset=utf-8')
    expect(response.text).toBe('Bad Request')
  })

  test('Should have no X-Powered-By & no ETag', async () => {
    const response = await request(server).get('/auth/user/2')
    expect(response.headers['x-powered-by']).toBeUndefined()
    expect(response.headers['etag']).toBeUndefined()
  })
})

describe('Parsing the request body', () => {
  test('Successed to login if posting a form encoded body', async () => {
    const response = await request(server)
      .post('/auth/user')
      .type('form')
      .send({name: 'Molunerfinn', password: '123'})
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.token).toBeTruthy()
  })

  test('The body should be an empty object if the Content-Type is not parseable', async () => {
    const response = await request(server)
      .post('/auth/user')
      .set('Content-Type', 'text/plain')
      .send('{"name": "Molunerfinn", "password": "123"}')
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(false)
    expect(response.body.info).toBe('用户不存在！')
  })
})

describe('Static files & the frontend routing fallback', () => {
  const maybe = hasDist ? test : test.skip

  maybe('Should fall back to index.html if the path is not matched', async () => {
    const response = await request(server).get('/some/deep/spa/path').set('Accept', 'text/html')
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('text/html; charset=utf-8')
    expect(response.headers['cache-control']).toBe('max-age=0')
    expect(response.headers['accept-ranges']).toBeUndefined()
    expect(response.headers['etag']).toBeUndefined()
  })

  maybe('Should fall back to index.html on an unknown /api path if set the JWT', async () => {
    const response = await request(server)
      .get('/api/not-a-route')
      .set('Accept', 'text/html')
      .set('Authorization', `Bearer ${token}`)
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('text/html; charset=utf-8')
  })

  test('Should not fall back if the request does not accept html', async () => {
    const response = await request(server).get('/some/deep/spa/path').set('Accept', 'application/json')
    expect(response.status).toBe(404)
    expect(response.headers['content-type']).toBe('text/plain; charset=utf-8')
    expect(response.text).toBe('Not Found')
  })
})
