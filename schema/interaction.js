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

// 关注用户的验证规则
const follow_user_schema = {
  body: {
    userId: joi.number().integer().min(1).required()
  }
}

// 获取关注列表的验证规则
const get_following_schema = {
  query: {
    userId: joi.number().integer().min(1).optional(),
    pageNum: joi.number().integer().min(1).default(1),
    pageSize: joi.number().integer().min(1).max(50).default(10)
  }
}

// 获取粉丝列表的验证规则
const get_followers_schema = {
  query: {
    userId: joi.number().integer().min(1).optional(),
    pageNum: joi.number().integer().min(1).default(1),
    pageSize: joi.number().integer().min(1).max(50).default(10)
  }
}

// 获取关注状态的验证规则
const get_follow_status_schema = {
  query: {
    userId: joi.number().integer().min(1).required()
  }
}

// 增加浏览量的验证规则
const increase_view_count_schema = {
  params: {
    articleId: joi.number().integer().min(1).required()
  }
}

// 点赞文章的验证规则
const like_article_schema = {
  body: {
    articleId: joi.number().integer().min(1).required()
  }
}

// 举报投诉的验证规则对象
const report_schema = {
  body: {
    target_type: joi.number().integer().valid(1, 2, 3).required(), // 1-帖子，2-评论，3-回复
    target_id: joi.number().integer().min(1).required(),
    reason: joi.string().valid(1, 2, 3).required() // 1-内容违规，2-垃圾信息，3-其他
  }
}

// 获取用户获赞情况的验证规则
const get_user_likes_schema = {
  query: {
    pageNum: joi.number().integer().min(1).default(1),
    pageSize: joi.number().integer().min(1).max(50).default(10)
  }
}

// 获取当前用户点赞情况的验证规则
const get_my_likes_schema = {
  query: {
    pageNum: joi.number().integer().min(1).default(1),
    pageSize: joi.number().integer().min(1).max(50).default(10)
  }
}

// 获取当前用户评论和回复的验证规则
const get_my_comments_schema = {
  query: {
    pageNum: joi.number().integer().min(1).default(1),
    pageSize: joi.number().integer().min(1).max(50).default(10)
  }
}

// 意见反馈的验证规则
const feedback_schema = {
  body: {
    type: joi.number().integer().valid(1, 2, 3, 4, 5).required(), // 1-功能建议，2-界面优化，3-内容问题，4-性能问题，5-其他
    title: joi.string().min(1).max(100).required(),
    content: joi.string().min(1).max(2000).required(),
    contact_info: joi.string().max(100).optional() // 联系方式，可选
  }
}

module.exports = {
  create_comment_schema,
  get_comments_schema,
  like_comment_schema,
  create_reply_schema,
  get_replies_schema,
  like_reply_schema,
  increase_view_count_schema,
  like_article_schema,
  follow_user_schema,
  get_following_schema,
  get_followers_schema,
  get_follow_status_schema,
  report_schema,
  get_user_likes_schema,
  get_my_likes_schema,
  get_my_comments_schema,
  feedback_schema
}