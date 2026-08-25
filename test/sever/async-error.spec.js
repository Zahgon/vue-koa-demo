jest.mock('../../server/models/todolist.js', () => ({
  __esModule: true,
  default: {
    getTodolistById: jest.fn(() => Promise.reject(new Error('database is down'))),
    createTodolist: jest.fn(() => Promise.reject(new Error('database is down'))),
    removeTodolist: jest.fn(() => Promise.reject(new Error('database is down'))),
    updateTodolist: jest.fn(() => Promise.reject(new Error('database is down')))
  }
}))

jest.mock('../../server/models/user.js', () => ({
  __esModule: true,
  default: {
    getUserById: jest.fn(() => Promise.reject(new Error('database is down'))),
    getUserByName: jest.fn(() => Promise.reject(new Error('database is down')))
  }
}))

import server from '../../app.js'
import request from 'supertest'

afterEach(() => {
  server.close()
})

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoibW9sdW5lcmZpbm4iLCJpZCI6MiwiaWF0IjoxNTA5ODAwNTg2fQ.JHHqSDNUgg9YAFGWtD0m3mYc9-XR3Gpw9gkZQXPSavM'

const expectServerError = (response) => {
  expect(response.status).toBe(500)
  expect(response.headers['content-type']).toBe('text/plain; charset=utf-8')
  expect(response.text).toBe('Internal Server Error')
}

describe('Async errors should be handed to the error handling middleware', () => {
  test('Failed to get todolist -> 500 if the database is down', async () => {
    const response = await request(server).get('/api/todolist/2').set('Authorization', `Bearer ${token}`)
    expectServerError(response)
  })

  test('Failed to post todolist -> 500 if the database is down', async () => {
    const response = await request(server)
      .post('/api/todolist')
      .set('Authorization', `Bearer ${token}`)
      .send({status: false, content: '来自测试', id: 2})
    expectServerError(response)
  })

  test('Failed to remove todolist -> 500 if the database is down', async () => {
    const response = await request(server).delete('/api/todolist/2/1').set('Authorization', `Bearer ${token}`)
    expectServerError(response)
  })

  test('Failed to update todolist -> 500 if the database is down', async () => {
    const response = await request(server).put('/api/todolist/2/1/0').set('Authorization', `Bearer ${token}`)
    expectServerError(response)
  })

  test('Failed to get user info -> 500 if the database is down', async () => {
    const response = await request(server).get('/auth/user/2')
    expectServerError(response)
  })

  test('Failed to login -> 500 if the database is down', async () => {
    const response = await request(server).post('/auth/user').send({name: 'Molunerfinn', password: '123'})
    expectServerError(response)
  })
})
