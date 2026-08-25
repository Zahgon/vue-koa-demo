import user from '../models/user.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const getUserInfo = async function (req, res, next) {
  try {
    const id = req.params.id // 获取url里传过来的参数里的id
    const result = await user.getUserById(id) // 通过await “同步”地返回查询结果
    if (result == null) { // 查无此用户时不返回任何内容，只回一个空响应
      res.status(204).end()
    } else {
      res.json(result) // 将请求的结果放到response的body里返回
    }
  } catch (err) {
    next(err) // Express不会自动捕获async函数里抛出的异常，需要手动交给错误处理中间件
  }
}

const postUserAuth = async function (req, res, next) {
  try {
    const data = req.body // post过来的数据存在request.body里
    const userInfo = await user.getUserByName(data.name)
    if (userInfo != null) { // 如果查无此用户会返回null
      if (!bcrypt.compareSync(data.password, userInfo.password)) {
        res.json({
          success: false, // success标志位是方便前端判断返回是正确与否
          info: '密码错误！'
        })
      } else {
        const userToken = {
          name: userInfo.user_name,
          id: userInfo.id
        }
        const secret = 'vue-koa-demo' // 指定密钥
        const token = jwt.sign(userToken, secret) // 签发token
        res.json({
          success: true,
          token: token // 返回token
        })
      }
    } else {
      res.json({
        success: false,
        info: '用户不存在！' // 如果用户不存在返回用户不存在
      })
    }
  } catch (err) {
    next(err)
  }
}

export default {
  getUserInfo,
  postUserAuth
}
