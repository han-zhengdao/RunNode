// 这是文章模块
// 导入数据库操作模块
const db = require('../db/index')

// 发布新文章
exports.addArticle = (req, res) => {
    // 1.获取表单数据
    const { content, cate_id } = req.body
    // 2.获取文章图片和用户ID
    const picname = req.file ? req.file.filename : null
    const user_id = req.auth.id
    console.log('这是用户id:',user_id);
    

    // 3.准备要插入的数据
    const articleData = {
        user_id,
        category_id: cate_id,
        content,
        like_count: 0,
        comment_count: 0,
        view_count: 0,
        status: 1,
        created_at: new Date()
    }

    // 4. 发布文章
    const sql = 'INSERT INTO posts SET ?'
    db.query(sql, articleData, (err, results) => {
        if (err) return res.cc(err)
        if(results.affectedRows !== 1) return res.cc('发布文章失败')

        // 获取插入的文章ID
        const article_id = results.insertId

        // 如果有图片，插入图片记录
        if (picname) {
            const imageData = {
                post_id: article_id,
                image_url: picname,
                created_at: new Date()
            }
            const imgSql = 'INSERT INTO post_images SET ?'
            db.query(imgSql, imageData, (err, imgResults) => {
                if (err) return res.cc(err)
                if (imgResults.affectedRows !== 1) return res.cc('保存图片信息失败')

                res.send({
                    status: 0,
                    message: '发布新文章成功',
                    data: {
                        id: article_id
                    }
                })
            })
        }else{
            res.send({
                status: 0,
                message: '发布新文章成功',
                data: {
                    id: article_id
                }
            })
        }
    })
}

// 获取文章列表
exports.getArticleList = (req, res) => {
    // 获取分页参数，默认第1页，每页10条
    const pageNum = parseInt(req.query.pageNum) || 1
    const pageSize = parseInt(req.query.pageSize) || 10
    
    // 计算OFFSET
    const offset = (pageNum - 1) * pageSize
    
    // 查询文章总数
    const countSql = 'SELECT COUNT(DISTINCT p.id) AS total FROM posts p'
    db.query(countSql, (err, countResults) => {
        if (err) return res.cc(err)
        
        const total = countResults[0].total
        
        // 使用LEFT JOIN查询文章及其对应的图片，按创建时间倒序排列，并进行分页
        const sql = `
            SELECT p.*, pi.image_url 
            FROM posts p 
            LEFT JOIN post_images pi ON p.id = pi.post_id
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `
        db.query(sql, [pageSize, offset], (err, results) => {
            if (err) return res.cc(err)
            
            // 处理结果，将相同文章ID的记录合并
            const articlesMap = {}
            
            results.forEach(row => {
                const articleId = row.id
                
                // 如果文章ID不存在于map中，则添加
                if (!articlesMap[articleId]) {
                    articlesMap[articleId] = {
                        ...row,
                        images: []
                    }
                    // 删除重复的image_url字段
                    delete articlesMap[articleId].image_url
                }
                
                // 如果有图片，则添加到images数组中
                if (row.image_url) {
                    articlesMap[articleId].images.push(row.image_url)
                }
            })
            
            // 将map转换为数组
            const articlesWithImages = Object.values(articlesMap)
            
            res.send({
                status: 0,
                message: '获取文章列表成功',
                data: {
                    total,
                    pageNum,
                    pageSize,
                    list: articlesWithImages
                }
            })
        })
    })
}