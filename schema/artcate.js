// 导入验证规则的模块
const joi = require('joi')

// 定义文章分类的验证规则
const name = joi.string().min(1).max(20).required()
// 定义删除文章分类的验证规则
const id = joi.number().integer().required()


// 定义新增文章分类的验证规则
exports.add_cate_schema = joi.object({
    name
})

// 定义删除文章分类的验证规则
exports.del_cate_schema = joi.object({
    id
})

// 定义更新文章分类的验证规则
exports.update_cate_schema = joi.object({
    id,
    name
})