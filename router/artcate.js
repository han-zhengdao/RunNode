// 这是文章分类路由模块
const express = require('express')
const router = express.Router()

// 导入数据验证模块
const expressJoi = require('@escook/express-joi')
// 导入文章分类数据验证模块
const { add_cate_schema, del_cate_schema, update_cate_schema } = require('../schema/artcate')

// 导入文章分类模块
const artcate_handler = require('../router_handler/artcate')


// 获取文章分类列表
router.get('/getlist', artcate_handler.getArtCates)

// 新增文章分类
router.post('/add', expressJoi(add_cate_schema), artcate_handler.addArtCate)

// 删除文章分类
router.get('/del/:id', expressJoi(del_cate_schema), artcate_handler.delArtCate)

// 根据id更新文章分类函数
router.post('/update', expressJoi(update_cate_schema), artcate_handler.update)




// 导出路由模块
module.exports = router
