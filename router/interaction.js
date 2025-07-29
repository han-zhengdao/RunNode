const express = require('express')
const router = express.Router()
const interactionHandler = require('../router_handler/interaction')

// 点赞文章
router.post('/like', interactionHandler.likeArticle)

// 关注用户
router.post('/follow', interactionHandler.followUser)

// 发表评论
router.post('/comment', interactionHandler.createComment)

// 获取评论列表
router.get('/comments', interactionHandler.getComments)

module.exports = router