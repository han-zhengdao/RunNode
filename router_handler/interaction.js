// 导入数据库操作模块
const db = require('../db/index')


exports.likeArticle = async (req, res) => {
  const { articleId } = req.body
  
  try {
    // 检查用户是否已经点赞过该帖子
    const [results] = await db.query('SELECT * FROM likes WHERE user_id = ? AND post_id = ?', [req.auth.id, articleId])
    
    if (results.length > 0) {
      // 如果已经点赞，则执行取消点赞（删除记录）
      await db.query('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [req.auth.id, articleId])
      // 更新帖子点赞计数
      await db.query('UPDATE posts SET like_count = like_count - 1 WHERE id = ?', [articleId])
      
      res.send({
        status: 0,
        message: '取消点赞成功',
        data: {
          articleId,
          isLiked: false
        }
      })
    } else {
      // 添加点赞记录
      await db.query('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [req.auth.id, articleId])
      // 更新帖子点赞计数
      await db.query('UPDATE posts SET like_count = like_count + 1 WHERE id = ?', [articleId])
      
      res.send({
        status: 0,
        message: '点赞成功',
        data: {
          articleId,
          isLiked: true
        }
      })
    }
  } catch (err) {
    res.cc(err)
  }
}

exports.followUser = (req, res) => {
  // 处理关注逻辑
  const { userId } = req.body
  res.send({
    status: 0,
    message: '关注成功',
    data: { userId }
  })
}

exports.createComment = (req, res) => {
  // 处理评论创建
  const { articleId, content } = req.body
  res.send({
    status: 0,
    message: '评论成功',
    data: { commentId: Date.now() }
  })
}

exports.getComments = (req, res) => {
  // 获取评论列表
  const { articleId } = req.query
  res.send({
    status: 0,
    message: '获取成功',
    data: {
      total: 0,
      list: []
    }
  })
}