// 这是文章路由模块
const express = require('express')
const router = express.Router()

// 导入数据验证模块
const expressJoi = require('@escook/express-joi')
// 导入文章数据验证模块
const { add_article_schema, get_article_list_schema } = require('../schema/article')

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


// 发布新文章
router.post('/add', upload.single('pic'), expressJoi(add_article_schema), article_handler.addArticle)

// 获取文章列表
router.get('/getlist', expressJoi(get_article_list_schema), article_handler.getArticleList)


// 导出路由模块
module.exports = router
