// 导入数据库操作模块
const db = require('../db/index')

// 点赞帖子
exports.likeArticle = async (req, res) => {
  const { articleId } = req.body
  
  try {
    // 检查用户是否已经点赞过该帖子 (status = 1)
    const [results] = await db.query('SELECT * FROM likes WHERE user_id = ? AND post_id = ? AND status = 1', [req.auth.id, articleId])
    
    if (results.length > 0) {
      // 如果已经点赞，则执行取消点赞（逻辑删除）
      await db.query('UPDATE likes SET status = 0, updated_at = NOW() WHERE user_id = ? AND post_id = ?', [req.auth.id, articleId])
      // 更新帖子点赞计数（确保不会小于0）
      await db.query('UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?', [articleId])
      
      res.send({
        status: 0,
        message: '取消点赞成功',
        data: {
          articleId,
          isLiked: false
        }
      })
    } else {
      // 检查是否存在逻辑删除的记录
      const [deletedResults] = await db.query('SELECT id FROM likes WHERE user_id = ? AND post_id = ? AND status = 0', [req.auth.id, articleId])
      if (deletedResults.length > 0) {
        // 如果存在逻辑删除的记录，则恢复点赞（更新状态）
        await db.query('UPDATE likes SET status = 1, updated_at = NOW() WHERE user_id = ? AND post_id = ?', [req.auth.id, articleId])
      } else {
        // 否则，添加新的点赞记录
        await db.query('INSERT INTO likes (user_id, post_id, status) VALUES (?, ?, 1)', [req.auth.id, articleId])
      }
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

// 获取关注状态
exports.getFollowStatus = async (req, res) => {
  const { userId } = req.query
  const currentUserId = req.auth.id
  
  try {
    // 检查被查询用户是否存在
    const [userResults] = await db.query('SELECT id FROM users WHERE id = ?', [userId])
    if (userResults.length === 0) {
      return res.cc('用户不存在')
    }
    
    // 查询关注状态
    const [followResults] = await db.query('SELECT status FROM follows WHERE from_user_id = ? AND to_user_id = ?', [currentUserId, userId])
    
    let isFollowing = false
    if (followResults.length > 0 && followResults[0].status === 1) {
      isFollowing = true
    }
    
    res.send({
      status: 0,
      message: '获取关注状态成功',
      data: {
        userId: parseInt(userId),
        isFollowing
      }
    })
  } catch (err) {
    res.cc(err)
  }
}

// 获取关注列表
exports.getFollowing = async (req, res) => {
  const { userId, pageNum = 1, pageSize = 10 } = req.query
  const targetUserId = userId || req.auth.id
  
  // 转换为数字类型
  const page = parseInt(pageNum)
  const size = parseInt(pageSize)
  
  try {
    // 检查用户是否存在
    const [userResults] = await db.query('SELECT id FROM users WHERE id = ?', [targetUserId])
    if (userResults.length === 0) {
      return res.cc('用户不存在')
    }
    
    // 查询关注总数（只统计状态为1的记录）
    const [countResults] = await db.query('SELECT COUNT(*) as total FROM follows WHERE from_user_id = ? AND status = 1', [targetUserId])
    const total = countResults[0].total
    
    // 查询关注列表（只显示状态为1的记录）
    const sql = `
      SELECT u.id, u.nickname, u.avatar, u.level, u.followers_count, u.following_count,
             (SELECT COUNT(*) FROM follows f2 WHERE f2.from_user_id = ? AND f2.to_user_id = u.id AND f2.status = 1) as is_following,
             f.created_at as follow_time
      FROM follows f
      LEFT JOIN users u ON f.to_user_id = u.id
      WHERE f.from_user_id = ? AND f.status = 1
      ORDER BY f.created_at DESC
      LIMIT ?, ?
    `
    const [following] = await db.query(sql, [req.auth.id, targetUserId, (page - 1) * size, size])
    
    // 处理关注列表数据
    const followingList = following.map(user => ({
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      level: user.level,
      followers_count: user.followers_count,
      following_count: user.following_count,
      is_following: user.is_following > 0,
      follow_time: user.follow_time
    }))
    
    res.send({
      status: 0,
      message: '获取成功',
      data: {
        total,
        pagenum: page,
        pagesize: size,
        list: followingList
      }
    })
  } catch (err) {
    res.cc(err)
  }
}

// 获取粉丝列表
exports.getFollowers = async (req, res) => {
  const { userId, pageNum = 1, pageSize = 10 } = req.query
  const targetUserId = userId || req.auth.id
  
  // 转换为数字类型
  const page = parseInt(pageNum)
  const size = parseInt(pageSize)
  
  try {
    // 检查用户是否存在
    const [userResults] = await db.query('SELECT id FROM users WHERE id = ?', [targetUserId])
    if (userResults.length === 0) {
      return res.cc('用户不存在')
    }
    
    // 查询粉丝总数（只统计状态为1的记录）
    const [countResults] = await db.query('SELECT COUNT(*) as total FROM follows WHERE to_user_id = ? AND status = 1', [targetUserId])
    const total = countResults[0].total
    
    // 查询粉丝列表（只显示状态为1的记录）
    const sql = `
      SELECT u.id, u.nickname, u.avatar, u.level, u.followers_count, u.following_count,
             (SELECT COUNT(*) FROM follows f2 WHERE f2.from_user_id = ? AND f2.to_user_id = u.id AND f2.status = 1) as is_following,
             f.created_at as follow_time
      FROM follows f
      LEFT JOIN users u ON f.from_user_id = u.id
      WHERE f.to_user_id = ? AND f.status = 1
      ORDER BY f.created_at DESC
      LIMIT ?, ?
    `
    const [followers] = await db.query(sql, [req.auth.id, targetUserId, (page - 1) * size, size])
    
    // 处理粉丝列表数据
    const followersList = followers.map(user => ({
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      level: user.level,
      followers_count: user.followers_count,
      following_count: user.following_count,
      is_following: user.is_following > 0,
      follow_time: user.follow_time
    }))
    
    res.send({
      status: 0,
      message: '获取成功',
      data: {
        total,
        pagenum: page,
        pagesize: size,
        list: followersList
      }
    })
  } catch (err) {
    res.cc(err)
  }
}

// 回复评论
exports.createReply = async (req, res) => {
  const { commentId, content } = req.body
  const user_id = req.auth.id
  
  try {
    // 检查评论是否存在
    const [commentResults] = await db.query('SELECT id, post_id FROM comments WHERE id = ?', [commentId])
    if (commentResults.length === 0) {
      return res.cc('评论不存在')
    }
    
    const post_id = commentResults[0].post_id
    
    // 插入回复
    const sql = 'INSERT INTO comment_replies (comment_id, post_id, user_id, content, like_count, created_at) VALUES (?, ?, ?, ?, 0, NOW())'
    const [results] = await db.query(sql, [commentId, post_id, user_id, content])
    
    // 更新评论的回复数（如果comments表有reply_count字段）
    await db.query('UPDATE comments SET reply_count = reply_count + 1 WHERE id = ?', [commentId])
    
    // 更新文章的评论总数（包含回复）
    await db.query('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?', [post_id])
    
    res.send({
      status: 0,
      message: '回复成功',
      data: { 
        replyId: results.insertId,
        commentId,
        content,
        created_at: new Date()
      }
    })
  } catch (err) {
    res.cc(err)
  }
}

// 获取回复列表
exports.getReplies = async (req, res) => {
  const { commentId, pageNum = 1, pageSize = 10 } = req.query
  
  // 转换为数字类型
  const page = parseInt(pageNum)
  const size = parseInt(pageSize)
  
  try {
    // 检查评论是否存在
    const [commentResults] = await db.query('SELECT id FROM comments WHERE id = ?', [commentId])
    if (commentResults.length === 0) {
      return res.cc('评论不存在')
    }
    
    // 查询回复总数
    const [countResults] = await db.query('SELECT COUNT(*) as total FROM comment_replies WHERE comment_id = ?', [commentId])
    const total = countResults[0].total
    
    // 查询回复列表
    const sql = `
      SELECT r.*, u.nickname, u.avatar, u.level,
             (SELECT COUNT(*) FROM reply_likes rl WHERE rl.reply_id = r.id AND rl.user_id = ? AND rl.status = 1) as is_liked
      FROM comment_replies r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.comment_id = ?
      ORDER BY r.created_at ASC
      LIMIT ?, ?
    `
    const [replies] = await db.query(sql, [req.auth.id, commentId, (page - 1) * size, size])
    
    // 处理回复数据
    const replyList = replies.map(reply => ({
      id: reply.id,
      content: reply.content,
      like_count: reply.like_count,
      is_liked: reply.is_liked > 0,
      created_at: reply.created_at,
      user: {
        id: reply.user_id,
        nickname: reply.nickname,
        avatar: reply.avatar,
        level: reply.level
      }
    }))
    
    res.send({
      status: 0,
      message: '获取成功',
      data: {
        total,
        pagenum: page,
        pagesize: size,
        list: replyList
      }
    })
  } catch (err) {
    res.cc(err)
  }
}

// 点赞回复
exports.likeReply = async (req, res) => {
  const { replyId } = req.body
  const user_id = req.auth.id
  
  try {
    // 检查回复是否存在
    const [replyResults] = await db.query('SELECT id FROM comment_replies WHERE id = ?', [replyId])
    if (replyResults.length === 0) {
      return res.cc('回复不存在')
    }
    
    // 检查是否已经点赞 (status = 1)
    const [likeResults] = await db.query('SELECT id FROM reply_likes WHERE reply_id = ? AND user_id = ? AND status = 1', [replyId, user_id])
    
    if (likeResults.length > 0) {
      // 已点赞，执行取消点赞（逻辑删除）
      await db.query('UPDATE reply_likes SET status = 0, updated_at = NOW() WHERE reply_id = ? AND user_id = ?', [replyId, user_id])
      // 更新回复点赞计数（确保不会小于0）
      await db.query('UPDATE comment_replies SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?', [replyId])
      
      res.send({
        status: 0,
        message: '取消点赞成功',
        data: { isLiked: false }
      })
    } else {
      // 检查是否存在逻辑删除的记录
      const [deletedResults] = await db.query('SELECT id FROM reply_likes WHERE reply_id = ? AND user_id = ? AND status = 0', [replyId, user_id])
      if (deletedResults.length > 0) {
        // 如果存在逻辑删除的记录，则恢复点赞（更新状态）
        await db.query('UPDATE reply_likes SET status = 1, updated_at = NOW() WHERE reply_id = ? AND user_id = ?', [replyId, user_id])
      } else {
        // 否则，添加新的点赞记录
        await db.query('INSERT INTO reply_likes (reply_id, user_id, status) VALUES (?, ?, 1)', [replyId, user_id])
      }
      await db.query('UPDATE comment_replies SET like_count = like_count + 1 WHERE id = ?', [replyId])
      
      res.send({
        status: 0,
        message: '点赞成功',
        data: { isLiked: true }
      })
    }
  } catch (err) {
    res.cc(err)
  }
}

// 关注/取消关注用户
exports.followUser = async (req, res) => {
  const { userId } = req.body
  const currentUserId = req.auth.id
  
  try {
    // 检查是否尝试关注自己
    if (currentUserId === userId) {
      return res.cc('不能关注自己')
    }
    
    // 检查被关注用户是否存在
    const [userResults] = await db.query('SELECT id FROM users WHERE id = ?', [userId])
    if (userResults.length === 0) {
      return res.cc('用户不存在')
    }
    
    // 检查是否已经有关注记录
    const [followResults] = await db.query('SELECT id, status FROM follows WHERE from_user_id = ? AND to_user_id = ?', [currentUserId, userId])
    
    if (followResults.length > 0) {
      // 已有记录，切换关注状态
      const currentStatus = followResults[0].status
      const newStatus = currentStatus === 1 ? 0 : 1
      const message = newStatus === 1 ? '关注成功' : '取消关注成功'
      
      await db.query('UPDATE follows SET status = ?, updated_at = NOW() WHERE from_user_id = ? AND to_user_id = ?', [newStatus, currentUserId, userId])
      
      res.send({
        status: 0,
        message,
        data: { 
          userId,
          isFollowing: newStatus === 1
        }
      })
    } else {
      // 无记录，创建新的关注记录
      await db.query('INSERT INTO follows (from_user_id, to_user_id, status, created_at) VALUES (?, ?, 1, NOW())', [currentUserId, userId])
      
      res.send({
        status: 0,
        message: '关注成功',
        data: { 
          userId,
          isFollowing: true
        }
      })
    }
  } catch (err) {
    res.cc(err)
  }
}

// 点赞评论
exports.likeComment = async (req, res) => {
  const { commentId } = req.body
  
  try {
    // 检查用户是否已经点赞过该评论 (status = 1)
    const [results] = await db.query('SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = ? AND status = 1', [req.auth.id, commentId])
    
    if (results.length > 0) {
      // 如果已经点赞，则执行取消点赞（逻辑删除）
      await db.query('UPDATE comment_likes SET status = 0, updated_at = NOW() WHERE user_id = ? AND comment_id = ?', [req.auth.id, commentId])
      // 更新评论点赞计数（确保不会小于0）
      await db.query('UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?', [commentId])
      
      res.send({
        status: 0,
        message: '取消点赞评论成功',
        data: {
          commentId,
          isLiked: false
        }
      })
    } else {
      // 检查是否存在逻辑删除的记录
      const [deletedResults] = await db.query('SELECT id FROM comment_likes WHERE user_id = ? AND comment_id = ? AND status = 0', [req.auth.id, commentId])
      if (deletedResults.length > 0) {
        // 如果存在逻辑删除的记录，则恢复点赞（更新状态）
        await db.query('UPDATE comment_likes SET status = 1, updated_at = NOW() WHERE user_id = ? AND comment_id = ?', [req.auth.id, commentId])
      } else {
        // 否则，添加新的点赞记录
        await db.query('INSERT INTO comment_likes (user_id, comment_id, status) VALUES (?, ?, 1)', [req.auth.id, commentId])
      }
      // 更新评论点赞计数
      await db.query('UPDATE comments SET like_count = like_count + 1 WHERE id = ?', [commentId])
      
      res.send({
        status: 0,
        message: '点赞评论成功',
        data: {
          commentId,
          isLiked: true
        }
      })
    }
  } catch (err) {
    res.cc(err)
  }
}

// 发表评论
exports.createComment = async (req, res) => {
  const { articleId, content } = req.body
  const user_id = req.auth.id
  
  try {
    // 检查文章是否存在
    const [articleResults] = await db.query('SELECT id FROM posts WHERE id = ?', [articleId])
    if (articleResults.length === 0) {
      return res.cc('文章不存在')
    }
    
    // 插入评论
    const sql = 'INSERT INTO comments (post_id, user_id, content, like_count, created_at) VALUES (?, ?, ?, 0, NOW())'
    const [results] = await db.query(sql, [articleId, user_id, content])
    
    // 更新文章评论数
    await db.query('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?', [articleId])
    
    res.send({
      status: 0,
      message: '评论成功',
      data: { 
        commentId: results.insertId,
        articleId,
        content,
        created_at: new Date()
      }
    })
  } catch (err) {
    res.cc(err)
  }
}

// 获取评论列表
exports.getComments = async (req, res) => {
  const { articleId, pageNum = 1, pageSize = 10 } = req.query
  
  // 转换为数字类型
  const page = parseInt(pageNum)
  const size = parseInt(pageSize)
  
  try {
    // 检查文章是否存在
    const [articleResults] = await db.query('SELECT id FROM posts WHERE id = ?', [articleId])
    if (articleResults.length === 0) {
      return res.cc('文章不存在')
    }
    
    // 查询评论总数（包含回复数）
    const [countResults] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM comments WHERE post_id = ?) + 
        (SELECT COUNT(*) FROM comment_replies WHERE post_id = ?) as total
    `, [articleId, articleId])
    const total = countResults[0].total
    
    // 查询评论列表
    const sql = `
      SELECT c.*, u.nickname, u.avatar, u.level,
             (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = ? AND cl.status = 1) as is_liked,
             (SELECT COUNT(*) FROM comment_replies cr WHERE cr.comment_id = c.id) as reply_count
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at DESC
      LIMIT ?, ?
    `
    const [comments] = await db.query(sql, [req.auth.id, articleId, (page - 1) * size, size])
    
    // 处理评论数据
    const commentList = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      like_count: comment.like_count,
      reply_count: comment.reply_count,
      is_liked: comment.is_liked > 0,
      created_at: comment.created_at,
      user: {
        id: comment.user_id,
        nickname: comment.nickname,
        avatar: comment.avatar,
        level: comment.level
      }
    }))
    
    res.send({
      status: 0,
      message: '获取成功',
      data: {
        total,
        pagenum: page,
        pagesize: size,
        list: commentList
      }
    })
  } catch (err) {
    res.cc(err)
  }
}

// 举报投诉
exports.report = async (req, res) => {
  const { target_type, target_id, reason } = req.body
  const reporter_id = req.auth.id

  try {
    // 检查是否已存在该用户对该对象的举报记录
    const [existingReports] = await db.query('SELECT id FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ?', [reporter_id, target_type, target_id])

    if (existingReports.length > 0) {
      return res.cc('您已举报过该内容，请勿重复举报！')
    }

    const sql = 'INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?, ?, ?, ?)'
    const [results] = await db.query(sql, [reporter_id, target_type, target_id, reason])

    if (results.affectedRows === 1) {
      res.send({
        status: 0,
        message: '举报成功'
      })
    } else {
      res.cc('举报失败')
    }
  } catch (err) {
    res.cc(err)
  }
}

// 增加帖子浏览量
// 1. 进入视口
// 2. 点击进入详情
exports.increaseViewCount = async (req, res) => {
  const { articleId } = req.params
  
  try {
    // 更新帖子浏览量
    await db.query('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [articleId])
    
    res.send({
      status: 0,
      message: '浏览量增加成功'
    })
  } catch (err) {
    res.cc(err)
  }
}