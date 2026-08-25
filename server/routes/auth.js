import auth from '../controllers/user.js'
import express from 'express'
const router = express.Router()

router.get('/user/:id', auth.getUserInfo) // 定义url的参数是id
router.post('/user', auth.postUserAuth)

export default router
