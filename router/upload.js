// 这是上传路由模块
const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs').promises
const { uploadMiddleware } = require('../schema/upload')

// 确保临时目录存在
const tempDir = path.join(__dirname, '../uploads/temp')
fs.mkdir(tempDir, { recursive: true }).catch(console.error)

// 配置multer中间件
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tempDir)
    },
    filename: function (req, file, cb) {
        // 保留原始文件扩展名
        const ext = path.extname(file.originalname)
        cb(null, Date.now() + ext)
    }
})

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 限制5MB
    },
    fileFilter: (req, file, cb) => {
        // 只允许上传图片
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('只允许上传图片文件！'))
        }
        cb(null, true)
    }
})

// 限制最大上传9张图片，字段名必须为pics
const uploadMultiple = upload.array('pics', 9)

// 临时图片上传
router.post('/temp', uploadMultiple, uploadMiddleware, (req, res) => {
    // 构建图片URL数组
    const imageUrls = req.files.map(file => {
        return `/uploads/temp/${file.filename}`
    })
    
    // 返回成功响应
    res.send({
        status: 0,
        message: '图片上传成功！',
        data: {
            image_urls: imageUrls
        }
    })


})

module.exports = router