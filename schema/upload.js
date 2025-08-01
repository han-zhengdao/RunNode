const joi = require('joi')

// 定义上传文件的验证规则
const uploadSchema = joi.object({
    // 表示文件的类型是图片
    fileType: joi.string().valid('image/jpeg', 'image/png', 'image/gif').required(),
    // 文件大小限制为5MB
    fileSize: joi.number().max(5 * 1024 * 1024).required()
})

// 定义验证上传文件的中间件
const uploadMiddleware = (req, res, next) => {
    // 1.验证文件数量
    if (!req.files || req.files.length === 0) {
        return res.cc('请选择要上传的图片')
    }
    if (req.files.length > 9) {
        return res.cc('最多只能上传9张图片')
    }

    // 2.验证每个文件的信息
    for (const file of req.files) {
        const { error } = uploadSchema.validate({
            fileType: file.mimetype,
            fileSize: file.size
        })
        // 3.验证失败
        if (error) {
            return res.cc(`文件 ${file.originalname} 验证失败：${error.details[0].message}`)
        }
    }
    // 4.所有文件验证成功
    next()
}

// 导出中间件
module.exports = {
    uploadMiddleware
}