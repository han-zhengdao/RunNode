// 导入数据验证模块
const joi = require('joi')

// 定义发布新文章的数据验证规则
const content = joi.string().required().min(1).max(10000)
// 定义发布文章的分类id
const cate_id = joi.number().integer().required()
// 定义文章图片数组（可选）
const pics = joi.array().items(joi.any()).optional()
// 定义临时图片文件名数组（可选）
const tempImages = joi.array().items(joi.string()).optional()

// 定义分页参数的验证规则
const pageNum = joi.number().integer().min(1).default(1)
const pageSize = joi.number().integer().min(1).max(100).default(10)
// 定义文章id的验证规则
const id = joi.number().integer().min(1).required()

// 定义发布文章的数据验证模块
const add_article_schema = {
    body: {
        content,
        cate_id,
        pics,
        tempImages
    }
}

// 定义获取文章列表的数据验证模块
const get_article_list_schema = {
    query: {
        pageNum,
        pageSize,
        cate_id: joi.number().integer().min(1).optional(),
        state: joi.number().integer().valid(0, 1).optional()
    }
}

// 定义获取文章详情的数据验证模块
const get_article_detail_schema = {
    params: {
        id
    }
}

// 获取我的文章列表的验证规则
const get_my_articles_schema = {
  query: {
    pageNum: joi.number().integer().min(1).default(1),
    pageSize: joi.number().integer().min(1).max(50).default(10),
    state: joi.string().valid('已发布', '草稿').optional()
  }
}

// 修改文章的验证规则
const update_article_schema = {
  body: {
    content: joi.string().min(1).max(10000).required(),
    category_id: joi.number().integer().min(1).required(),
    state: joi.string().valid('已发布', '草稿').required()
  }
}

// 删除文章的验证规则
const delete_article_schema = {
  params: {
    id: joi.number().integer().min(1).required()
  }
}

// 获取文章详情（用于编辑）的验证规则
const get_article_for_edit_schema = {
  params: {
    id: joi.number().integer().min(1).required()
  }
}

module.exports = {
  add_article_schema,
  get_article_list_schema,
  get_article_detail_schema,
  get_my_articles_schema,
  update_article_schema,
  delete_article_schema,
  get_article_for_edit_schema
}



