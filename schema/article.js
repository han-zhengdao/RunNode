// 导入数据验证模块
const joi = require('joi')

// 定义发布新文章的数据验证规则
const content = joi.string().required().min(1).max(10000)
// 定义发布文章的分类id
const cate_id = joi.number().integer().required()
// 定义文章图片数组（可选）
const pics = joi.array().items(joi.any()).optional()

// 定义分页参数的验证规则
const pageNum = joi.number().integer().min(1).default(1)
const pageSize = joi.number().integer().min(1).max(100).default(10)

// 定义发布文章的数据验证模块
exports.add_article_schema = {
    body: {
        content,
        cate_id,
        pics
    }
}

// 定义获取文章列表的数据验证模块
exports.get_article_list_schema = {
    query: {
        pageNum,
        pageSize
    }
}



