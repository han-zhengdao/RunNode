// 这是文章模块
// 导入数据库操作模块
const db = require('../db/index')
const fs = require('fs').promises
const path = require('path')

// 发布新文章
exports.addArticle = async (req, res) => {
    try {
        // 1.获取表单数据
        const { content, cate_id, tempImages } = req.body
        const user_id = req.auth.id

        // 确保posts目录存在
        const postsDir = path.join(__dirname, '../uploads/posts')
        await fs.mkdir(postsDir, { recursive: true })

        // 2.移动临时文件到正式目录
        const movedFiles = []
        if (tempImages && tempImages.length > 0) {
            for (const tempPath of tempImages) {
                // 从路径中提取文件名
                const filename = path.basename(tempPath)
                const oldPath = path.join(__dirname, '../uploads/temp', filename)
                const newPath = path.join(postsDir, filename)
                
                try {
                    await fs.rename(oldPath, newPath)
                    movedFiles.push(filename)
                } catch (err) {
                    console.error(`移动文件 ${filename} 时出错:`, err)
                    // 如果文件移动失败，跳过该文件
                    continue
                }
            }
        }

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
        const [results] = await db.promise().query(sql, articleData)
        
        if (results.affectedRows !== 1) {
            return res.cc('发布文章失败')
        }

        // 获取插入的文章ID
        const article_id = results.insertId

        // 如果有图片，插入图片记录
        if (movedFiles.length > 0) {
            const imageValues = movedFiles.map(filename => [
                article_id,
                filename,
                new Date()
            ])
            
            const imgSql = 'INSERT INTO post_images (post_id, image_url, created_at) VALUES ?'
            const [imgResults] = await db.promise().query(imgSql, [imageValues])
            
            if (imgResults.affectedRows !== movedFiles.length) {
                return res.cc('保存图片信息失败')
            }

            // 获取所有图片的URL
            const imageUrls = movedFiles.map(filename => `/uploads/posts/${filename}`)
            res.send({
                status: 0,
                message: '发布文章成功',
                data: {
                    article_id,
                    image_urls: imageUrls
                }
            })
        } else {
            res.send({
                status: 0,
                message: '发布文章成功',
                data: {
                    article_id
                }
            })
        }
    } catch (err) {
        console.error('发布文章时出错:', err)
        res.cc(err)
    }
}

// 获取文章列表
exports.getArticleList = (req, res) => {
    const { pagenum = 1, pagesize = 10, cate_id, state } = req.body

    // 准备查询条件
    let conditions = []
    let values = []

    // 如果有分类id，添加到查询条件
    if (cate_id) {
        conditions.push('category_id = ?')
        values.push(cate_id)
    }

    // 如果有状态，添加到查询条件
    if (state) {
        conditions.push('status = ?')
        values.push(state)
    }

    // 拼接where子句
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    // 查询文章总数
    const countSql = `SELECT COUNT(*) as total FROM posts ${whereClause}`
    db.query(countSql, values, (err, [{ total }]) => {
        if (err) return res.cc(err)

        // 查询文章列表
        const sql = `
            SELECT p.*, c.name as cate_name, 
                   GROUP_CONCAT(pi.image_url) as image_urls
            FROM posts p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN post_images pi ON p.id = pi.post_id
            ${whereClause}
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT ?, ?
        `
        db.query(sql, [...values, (pagenum - 1) * pagesize, pagesize], (err, rows) => {
            if (err) return res.cc(err)

            // 处理图片URL
            const articles = rows.map(row => ({
                ...row,
                image_urls: row.image_urls ? row.image_urls.split(',') : []
            }))

            res.send({
                status: 0,
                message: '获取文章列表成功',
                data: {
                    total,
                    pagenum: +pagenum,
                    pagesize: +pagesize,
                    articles
                }
            })
        })
    })
}