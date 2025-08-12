const joi = require('joi')

// 发表评论的验证规则
const create_comment_schema = {
  body: {
    articleId: joi.number().integer().min(1).required(),
    content: joi.string().min(1).max(500).required()
  }
}

// 获取评论列表的验证规则
const get_comments_schema = {
  query: {
    articleId: joi.number().integer().min(1).required(),
    pageNum: joi.number().integer().min(1).default(1),
    pageSize: joi.number().integer().min(1).max(50).default(10)
  }
}

// 点赞评论的验证规则
const like_comment_schema = {
  body: {
    commentId: joi.number().integer().min(1).required()
  }
}

// 回复评论的验证规则
const create_reply_schema = {
  body: {
    commentId: joi.number().integer().min(1).required(),
    content: joi.string().min(1).max(500).required()
  }
}

// 获取回复列表的验证规则
const get_replies_schema = {
  query: {
    commentId: joi.number().integer().min(1).required(),
    pageNum: joi.number().integer().min(1).default(1),
    pageSize: joi.number().integer().min(1).max(50).default(10)
  }
}

// 点赞回复的验证规则
const like_reply_schema = {
  body: {
    replyId: joi.number().integer().min(1).required()
  }
}

module.exports = {
  create_comment_schema,
  get_comments_schema,
  like_comment_schema,
  create_reply_schema,
  get_replies_schema,
  like_reply_schema
}