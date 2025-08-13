const express = require('express')
const router = express.Router()
const interactionHandler = require('../router_handler/interaction')
const expressJoi = require('@escook/express-joi')
const { create_comment_schema, get_comments_schema, like_comment_schema, create_reply_schema, get_replies_schema, like_reply_schema, follow_user_schema, get_following_schema, get_followers_schema, get_follow_status_schema } = require('../schema/interaction')

// 点赞文章
router.post('/like', interactionHandler.likeArticle)

// 点赞评论
router.post('/like-comment', expressJoi(like_comment_schema), interactionHandler.likeComment)

// 关注用户
router.post('/follow', expressJoi(follow_user_schema), interactionHandler.followUser)

// 获取关注列表
router.get('/following', expressJoi(get_following_schema), interactionHandler.getFollowing)

// 获取粉丝列表
router.get('/followers', expressJoi(get_followers_schema), interactionHandler.getFollowers)

// 获取关注状态
router.get('/follow-status', expressJoi(get_follow_status_schema), interactionHandler.getFollowStatus)

// 发表评论
router.post('/comment', expressJoi(create_comment_schema), interactionHandler.createComment)

// 获取评论列表
router.get('/comments', expressJoi(get_comments_schema), interactionHandler.getComments)

// 回复评论
router.post('/reply', expressJoi(create_reply_schema), interactionHandler.createReply)

// 获取回复列表
router.get('/replies', expressJoi(get_replies_schema), interactionHandler.getReplies)

// 点赞回复
router.post('/like-reply', expressJoi(like_reply_schema), interactionHandler.likeReply)

module.exports = router