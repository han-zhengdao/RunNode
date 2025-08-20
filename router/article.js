// 这是文章路由模块
const express = require('express')
const router = express.Router()

// 导入数据验证模块
const expressJoi = require('@escook/express-joi')
// 导入文章数据验证模块
const { add_article_schema, get_article_list_schema, get_article_detail_schema, get_my_articles_schema, get_article_for_edit_schema, update_article_schema, delete_article_schema } = require('../schema/article')

// 导入发布文章处理模块
const article_handler = require('../router_handler/article')

// 导入multer中间件用于处理文件上传
const multer = require('multer')
// 导入路径模块
const path = require('path')
// 配置multer中间件
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'))
    },
    filename: function (req, file, cb) {
        // 保留原始文件扩展名
        const ext = path.extname(file.originalname)
        cb(null, Date.now() + ext)
    }
})

const upload = multer({ storage: storage })

// 限制最大上传6张图片
// 限制最大上传6张图片，字段名必须为pics
const uploadMultiple = upload.array('pics', 6)

// 发布新文章
router.post('/add', expressJoi(add_article_schema), article_handler.addArticle)

// 获取文章列表
router.get('/getlist', expressJoi(get_article_list_schema), article_handler.getArticleList)

// 获取文章详情
router.get('/detail/:id', expressJoi(get_article_detail_schema), article_handler.getArticleDetail)

// 获取我的文章列表
router.get('/my', expressJoi(get_my_articles_schema), article_handler.getMyArticles)

// 获取文章详情（用于编辑）
router.get('/edit/:id', expressJoi(get_article_for_edit_schema), article_handler.getArticleForEdit)

// 修改文章
router.put('/:id', expressJoi(update_article_schema), article_handler.updateArticle)

// 删除文章
router.delete('/:id', expressJoi(delete_article_schema), article_handler.deleteArticle)

// 导出路由模块
module.exports = router
