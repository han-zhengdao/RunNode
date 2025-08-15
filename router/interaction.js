const express = require('express')
const router = express.Router()
const interactionHandler = require('../router_handler/interaction')
const expressJoi = require('@escook/express-joi')
const { create_comment_schema, get_comments_schema, like_comment_schema, create_reply_schema, get_replies_schema, like_reply_schema, follow_user_schema, get_following_schema, get_followers_schema, get_follow_status_schema, like_article_schema, increase_view_count_schema, report_schema } = require('../schema/interaction')

// 帖子浏览量
router.post('/increaseviewcount/:articleId', expressJoi(increase_view_count_schema), interactionHandler.increaseViewCount)

// 点赞帖子
router.post('/likearticle', expressJoi(like_article_schema), interactionHandler.likeArticle)

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

// 举报投诉
router.post('/report', expressJoi(report_schema), interactionHandler.report)

// 导出路由
module.exports = router