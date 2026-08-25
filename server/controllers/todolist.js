import todolist from '../models/todolist.js'

const getTodolist = async function (req, res, next) {
  try {
    const id = req.params.id // 获取url里传过来的参数里的id
    const result = await todolist.getTodolistById(id) // 通过await “同步”地返回查询结果
    res.json({
      success: true,
      result // 将请求的结果放到response的body里返回
    })
  } catch (err) {
    next(err) // Express不会自动捕获async函数里抛出的异常，需要手动交给错误处理中间件
  }
}

const createTodolist = async function (req, res, next) {
  try {
    const data = req.body
    const success = await todolist.createTodolist(data)
    res.json({
      success
    })
  } catch (err) {
    next(err)
  }
}

const removeTodolist = async function (req, res, next) {
  try {
    const id = req.params.id
    const userId = req.params.userId
    const success = await todolist.removeTodolist(id, userId)

    res.json({
      success
    })
  } catch (err) {
    next(err)
  }
}

const updateTodolist = async function (req, res, next) {
  try {
    const id = req.params.id
    const userId = req.params.userId
    let status = req.params.status
    status === '0' ? status = true : status = false// 状态反转（更新）

    const success = await todolist.updateTodolist(id, userId, status)

    res.json({
      success
    })
  } catch (err) {
    next(err)
  }
}

export default {
  getTodolist,
  createTodolist,
  removeTodolist,
  updateTodolist
}
