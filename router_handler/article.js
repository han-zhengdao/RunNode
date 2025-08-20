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

        // 2.处理临时图片
        let imageUrls = []
        if (tempImages && Array.isArray(tempImages) && tempImages.length > 0) {
            for (const tempImage of tempImages) {
                const tempPath = path.join(__dirname, '..', 'uploads', 'temp', tempImage)
                const finalPath = path.join(__dirname, '..', 'uploads', 'posts', tempImage)
                
                try {
                    await fs.rename(tempPath, finalPath)
                    imageUrls.push(`/uploads/posts/${tempImage}`)
                } catch (moveError) {
                    console.error('移动图片失败:', tempImage, moveError)
                    // 如果移动失败，继续处理其他图片
                }
            }
        }



        // 3.插入文章数据
        const sql = 'INSERT INTO posts SET user_id=?, category_id=?, content=?, like_count=0, comment_count=0, view_count=0, status=1'
        const [results] = await db.query(sql, [user_id, cate_id, content])
        
        const article_id = results.insertId

        // 4.插入图片数据
        if (imageUrls.length > 0) {
            for (const imageUrl of imageUrls) {
                const imageSql = 'INSERT INTO post_images SET post_id=?, image_url=?'
                try {
                    const [imageResults] = await db.query(imageSql, [article_id, imageUrl])
                } catch (imageErr) {
                    console.error('插入图片记录失败:', imageUrl, imageErr)
                }
            }
        }

        res.send({
            status: 0,
            message: '发布文章成功',
            data: {
                article_id,
                image_urls: imageUrls
            }
        })
    } catch (err) {
        console.error('发布文章时出错:', err)
        res.cc(err)
    }
}

// 获取文章列表
exports.getArticleList = async (req, res) => {
    const { pageNum = 1, pageSize = 10, cate_id, state } = req.query
    const currentUserId = req.auth ? req.auth.id : null // 获取当前登录用户ID，如果未登录则为null
    
    // 确保分页参数是数字类型
    const page = parseInt(pageNum) || 1
    const size = parseInt(pageSize) || 10

    // 准备查询条件
    let conditions = []
    let values = []

    // 如果有分类id，添加到查询条件
    if (cate_id) {
        conditions.push('p.category_id = ?')
        values.push(cate_id)
    }

    // 如果有状态，添加到查询条件
    if (state) {
        conditions.push('p.status = ?')
        values.push(state)
    }

    // 拼接where子句
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    try {
        // 查询文章总数
        const countSql = `SELECT COUNT(*) as total FROM posts p ${whereClause}`
        const [countResults] = await db.query(countSql, values)
        const total = countResults[0].total

        // 查询文章列表
        const sql = `
            SELECT 
                p.*, 
                c.name as cate_name, 
                u.nickname as user_nickname, 
                u.avatar as user_avatar, 
                u.level as user_level,
                GROUP_CONCAT(pi.image_url) as image_urls,
                CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as is_liked
            FROM posts p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN post_images pi ON p.id = pi.post_id
            LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = ?
            ${whereClause}
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT ?, ?
        `
        const [rows] = await db.query(sql, [currentUserId, ...values, (page - 1) * size, size])

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
                pagenum: page,
                pagesize: size,
                articles
            }
        })
    } catch (err) {
        res.cc(err)
    }
}

// 获取文章详情
exports.getArticleDetail = async (req, res) => {
    try {
        const { id } = req.params
        const currentUserId = req.auth ? req.auth.id : null // 获取当前登录用户ID，如果未登录则为null
        
        // 查询文章详情，包含用户信息和图片
        const sql = `
            SELECT 
                p.id,
                p.content,
                p.category_id,
                p.created_at,
                p.like_count,
                p.comment_count,
                p.view_count,
                p.status,
                u.nickname,
                u.avatar,
                u.id as user_id,
                u.level,
                c.name as cate_name,
                GROUP_CONCAT(pi.image_url) as image_urls
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN post_images pi ON p.id = pi.post_id
            WHERE p.id = ?
            GROUP BY p.id
        `
        
        const [articles] = await db.query(sql, [id])
        
        if (articles.length === 0) {
            return res.send({
                status: 1,
                message: '文章不存在'
            })
        }
        
        const article = articles[0]
        
        // 查询当前用户是否点赞了该文章
        let isLiked = false
        if (currentUserId) {
            const [likeResults] = await db.query('SELECT id FROM likes WHERE user_id = ? AND post_id = ?', [currentUserId, id])
            isLiked = likeResults.length > 0
        }
        
        // 处理图片数据
        const processedArticle = {
            ...article,
            image_urls: article.image_urls ? article.image_urls.split(',') : [],
            is_liked: isLiked // 添加is_liked字段
        }
        
        res.send({
            status: 0,
            message: '获取文章详情成功',
            data: processedArticle
        })
    } catch (error) {
        console.error('获取文章详情失败:', error)
        res.cc(error)
    }
}

// 获取用户自己的帖子列表
exports.getMyArticles = async (req, res) => {
    const { pageNum = 1, pageSize = 10, state } = req.query
    const currentUserId = req.auth.id

    // 转换为数字类型
    const page = parseInt(pageNum)
    const size = parseInt(pageSize)

    // 构建查询条件
    const conditions = ['p.user_id = ?']
    const values = [currentUserId]

    // 添加状态筛选条件
    if (state !== undefined && state !== '') {
        conditions.push('p.state = ?')
        values.push(state)
    }

    // 拼接where子句
    const whereClause = 'WHERE ' + conditions.join(' AND ')

    try {
        // 查询文章总数
        const countSql = `SELECT COUNT(*) as total FROM posts p ${whereClause}`
        const [countResults] = await db.query(countSql, values)
        const total = countResults[0].total

        // 查询文章列表
        const sql = `
            SELECT 
                p.*, 
                c.name as cate_name, 
                u.nickname as user_nickname, 
                u.avatar as user_avatar, 
                u.level as user_level,
                GROUP_CONCAT(pi.image_url) as image_urls
            FROM posts p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN post_images pi ON p.id = pi.post_id
            ${whereClause}
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT ?, ?
        `
        const [rows] = await db.query(sql, [...values, (page - 1) * size, size])

        // 处理图片URL
        const articles = rows.map(row => ({
            ...row,
            image_urls: row.image_urls ? row.image_urls.split(',') : []
        }))

        res.send({
            status: 0,
            message: '获取我的文章列表成功',
            data: {
                total,
                pagenum: page,
                pagesize: size,
                articles
            }
        })
    } catch (err) {
        res.cc(err)
    }
}

// 修改文章
exports.updateArticle = async (req, res) => {
    const { id } = req.params
    const { content, category_id, state } = req.body
    const currentUserId = req.auth.id

    try {
        // 检查文章是否存在且属于当前用户
        const [articleResults] = await db.query('SELECT id, user_id FROM posts WHERE id = ?', [id])
        if (articleResults.length === 0) {
            return res.cc('文章不存在')
        }
        
        if (articleResults[0].user_id !== currentUserId) {
            return res.cc('无权限修改此文章')
        }

        // 更新文章信息
        const updateSql = 'UPDATE posts SET content = ?, category_id = ?, state = ?, updated_at = NOW() WHERE id = ?'
        const [updateResults] = await db.query(updateSql, [content, category_id, state, id])

        if (updateResults.affectedRows !== 1) {
            return res.cc('更新文章失败')
        }

        res.send({
            status: 0,
            message: '更新文章成功'
        })
    } catch (err) {
        res.cc(err)
    }
}

// 删除文章
exports.deleteArticle = async (req, res) => {
    const { id } = req.params
    const currentUserId = req.auth.id

    try {
        // 检查文章是否存在且属于当前用户
        const [articleResults] = await db.query('SELECT id, user_id FROM posts WHERE id = ?', [id])
        if (articleResults.length === 0) {
            return res.cc('文章不存在')
        }
        
        if (articleResults[0].user_id !== currentUserId) {
            return res.cc('无权限删除此文章')
        }

        // 开始事务
        await db.query('START TRANSACTION')

        try {
            // 删除文章相关的点赞记录
            await db.query('DELETE FROM likes WHERE post_id = ?', [id])

            // 删除文章相关的评论点赞记录
            await db.query('DELETE cl FROM comment_likes cl INNER JOIN comments c ON cl.comment_id = c.id WHERE c.post_id = ?', [id])

            // 删除文章相关的回复点赞记录
            await db.query('DELETE rl FROM reply_likes rl INNER JOIN comment_replies cr ON rl.reply_id = cr.id WHERE cr.post_id = ?', [id])

            // 删除文章相关的回复
            await db.query('DELETE FROM comment_replies WHERE post_id = ?', [id])

            // 删除文章相关的评论
            await db.query('DELETE FROM comments WHERE post_id = ?', [id])

            // 删除文章相关的图片
            await db.query('DELETE FROM post_images WHERE post_id = ?', [id])

            // 删除文章
            const [deleteResults] = await db.query('DELETE FROM posts WHERE id = ?', [id])

            if (deleteResults.affectedRows !== 1) {
                throw new Error('删除文章失败')
            }

            // 提交事务
            await db.query('COMMIT')

            res.send({
                status: 0,
                message: '删除文章成功'
            })
        } catch (error) {
            // 回滚事务
            await db.query('ROLLBACK')
            throw error
        }
    } catch (err) {
        res.cc(err)
    }
}

// 获取文章详情（用于编辑）
exports.getArticleForEdit = async (req, res) => {
    const { id } = req.params
    const currentUserId = req.auth.id

    try {
        // 查询文章详情，包含用户信息和图片
        const sql = `
            SELECT 
                p.id,
                p.content,
                p.category_id,
                p.state,
                p.created_at,
                p.updated_at,
                p.like_count,
                p.comment_count,
                p.view_count,
                u.nickname,
                u.avatar,
                u.id as user_id,
                u.level,
                c.name as cate_name,
                GROUP_CONCAT(pi.image_url) as image_urls
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN post_images pi ON p.id = pi.post_id
            WHERE p.id = ? AND p.user_id = ?
            GROUP BY p.id
        `
        
        const [articles] = await db.query(sql, [id, currentUserId])
        
        if (articles.length === 0) {
            return res.send({
                status: 1,
                message: '文章不存在或无权限访问'
            })
        }
        
        const article = articles[0]
        
        // 处理图片数据
        const processedArticle = {
            ...article,
            image_urls: article.image_urls ? article.image_urls.split(',') : []
        }
        
        res.send({
            status: 0,
            message: '获取文章详情成功',
            data: processedArticle
        })
    } catch (error) {
        console.error('获取文章详情失败:', error)
        res.cc(error)
    }
}