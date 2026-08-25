import './env'
import express from 'express'
import { STATUS_CODES } from 'http'
import logger from 'morgan'
import auth from './server/routes/auth.js'
import api from './server/routes/api.js'
import jwt from 'express-jwt'
import path from 'path'
import historyApiFallback from 'connect-history-api-fallback'
import bodyParser from 'body-parser'

const app = express()
const router = express.Router()

let port = process.env.PORT

app.disable('x-powered-by') // Express默认会加上X-Powered-By响应头，这里关掉
app.set('etag', false) // Express默认会给响应体生成ETag，这里关掉
app.set('json spaces', 2) // 所有JSON响应体都缩进两个空格输出

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(logger('dev'))

app.use(function (req, res, next) {
  let start = new Date()
  res.on('finish', function () { // Express没有洋葱模型，响应结束时才能拿到耗时
    let ms = new Date() - start
    console.log('%s %s - %s', req.method, req.originalUrl, ms)
  })
  next()
})

app.on('error', function (err, req) {
  console.log('server error', err)
})

router.use('/auth', auth) // 挂载到express的Router上，同时会让所有的auth的请求路径前面加上'/auth'的请求路径。
router.use('/api', jwt({secret: 'vue-koa-demo'}), api) // 所有走/api/打头的请求都需要经过jwt验证。

const notFound = function (req, res) { // 没有任何中间件应答的请求
  res.status(404).type('text').send(STATUS_CODES[404])
}

app.use(function (req, res, next) { // 没有挂载allowedMethods，OPTIONS请求不该被路由自动应答
  if (req.method === 'OPTIONS') {
    return notFound(req, res)
  }
  next()
})

app.use(router) // 将路由规则挂载到Express上。
app.use(historyApiFallback())
app.use(express.static(path.resolve('dist'), { // 将webpack打包好的项目目录作为Express静态文件服务的目录
  acceptRanges: false,
  etag: false,
  setHeaders: function (res, filePath) {
    res.setHeader('Cache-Control', 'max-age=0')
    const ext = path.extname(filePath)
    if (ext) {
      res.type(ext)
    }
  }
}))

app.use(notFound)

app.use(function (err, req, res, next) { //  如果JWT验证失败，返回验证失败信息
  if (err.status === 401) {
    res.status(401).json({
      success: false,
      token: null,
      info: 'Protected resource, use Authorization header to get access'
    })
  } else {
    app.emit('error', err, req)
    const status = err.status || err.statusCode || 500
    res.status(status).type('text').send(STATUS_CODES[status] || STATUS_CODES[500])
  }
})

export default app.listen(port, () => {
  console.log(`Express is listening in ${port}`)
})
