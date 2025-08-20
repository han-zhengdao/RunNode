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

// 获取用户获赞情况
exports.getUserLikes = async (req, res) => {
  const { pageNum = 1, pageSize = 10 } = req.query
  const currentUserId = req.auth.id
  
  // 转换为数字类型
  const page = parseInt(pageNum)
  const size = parseInt(pageSize)
  
  try {
    // 获取等级名称函数
    const getLevelName = (level) => {
      const levelNames = {
        1: '深海窥屏鱼类',
        2: '偶尔冒泡的锦鲤',
        3: '冲鸭冲鸭冲鸭',
        4: '永动机型话痨',
        5: '人形自走热点',
        6: '神龙见首不见尾的传说'
      };
      return levelNames[level] || '未知等级';
    };

    // 查询用户获赞总数
    const [countResults] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM likes l WHERE l.post_id IN (SELECT id FROM posts WHERE user_id = ?) AND l.status = 1) +
        (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id IN (SELECT id FROM comments WHERE user_id = ?) AND cl.status = 1) +
        (SELECT COUNT(*) FROM reply_likes rl WHERE rl.reply_id IN (SELECT id FROM comment_replies WHERE user_id = ?) AND rl.status = 1)
      as total
    `, [currentUserId, currentUserId, currentUserId])
    const total = countResults[0].total

    // 查询帖子获赞情况
    const postLikesSql = `
      SELECT 
        'post' as type,
        l.created_at as like_time,
        l.id as like_id,
        u.id as liker_id,
        u.nickname as liker_nickname,
        u.avatar as liker_avatar,
        u.level as liker_level,
        p.id as target_id,
        p.content as target_content,
        p.created_at as target_created_at,
        p.like_count as target_like_count,
        p.comment_count as target_comment_count,
        p.view_count as target_view_count,
        c.name as category_name,
        GROUP_CONCAT(pi.image_url) as image_urls
      FROM likes l
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN posts p ON l.post_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN post_images pi ON p.id = pi.post_id
      WHERE p.user_id = ? AND l.status = 1
      GROUP BY l.id
    `

    // 查询评论获赞情况
    const commentLikesSql = `
      SELECT 
        'comment' as type,
        cl.created_at as like_time,
        cl.id as like_id,
        u.id as liker_id,
        u.nickname as liker_nickname,
        u.avatar as liker_avatar,
        u.level as liker_level,
        c.id as target_id,
        c.content as target_content,
        c.created_at as target_created_at,
        c.like_count as target_like_count,
        c.reply_count as target_reply_count,
        p.id as post_id,
        p.content as post_content,
        p.created_at as post_created_at,
        cat.name as category_name
      FROM comment_likes cl
      LEFT JOIN users u ON cl.user_id = u.id
      LEFT JOIN comments c ON cl.comment_id = c.id
      LEFT JOIN posts p ON c.post_id = p.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      WHERE c.user_id = ? AND cl.status = 1
    `

    // 查询回复获赞情况
    const replyLikesSql = `
      SELECT 
        'reply' as type,
        rl.created_at as like_time,
        rl.id as like_id,
        u.id as liker_id,
        u.nickname as liker_nickname,
        u.avatar as liker_avatar,
        u.level as liker_level,
        cr.id as target_id,
        cr.content as target_content,
        cr.created_at as target_created_at,
        cr.like_count as target_like_count,
        c.id as comment_id,
        c.content as comment_content,
        c.created_at as comment_created_at,
        p.id as post_id,
        p.content as post_content,
        p.created_at as post_created_at,
        cat.name as category_name
      FROM reply_likes rl
      LEFT JOIN users u ON rl.user_id = u.id
      LEFT JOIN comment_replies cr ON rl.reply_id = cr.id
      LEFT JOIN comments c ON cr.comment_id = c.id
      LEFT JOIN posts p ON cr.post_id = p.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      WHERE cr.user_id = ? AND rl.status = 1
    `

    // 执行三个查询
    const [postLikes] = await db.query(postLikesSql, [currentUserId])
    const [commentLikes] = await db.query(commentLikesSql, [currentUserId])
    const [replyLikes] = await db.query(replyLikesSql, [currentUserId])

    // 合并所有获赞记录并按时间排序
    const allLikes = [...postLikes, ...commentLikes, ...replyLikes]
      .sort((a, b) => new Date(b.like_time) - new Date(a.like_time))
      .slice((page - 1) * size, page * size)

    // 处理数据格式
    const likeList = allLikes.map(like => {
      const liker = {
        id: like.liker_id,
        nickname: like.liker_nickname,
        avatar: like.liker_avatar,
        level: like.liker_level,
        levelName: getLevelName(like.liker_level)
      }

      const baseData = {
        type: like.type,
        likeId: like.like_id,
        likeTime: like.like_time,
        liker: liker
      }

      switch (like.type) {
        case 'post':
          return {
            ...baseData,
            target: {
              id: like.target_id,
              content: like.target_content,
              createdAt: like.target_created_at,
              likeCount: like.target_like_count,
              commentCount: like.target_comment_count,
              viewCount: like.target_view_count,
              categoryName: like.category_name,
              imageUrls: like.image_urls ? like.image_urls.split(',') : []
            }
          }
        case 'comment':
          return {
            ...baseData,
            target: {
              id: like.target_id,
              content: like.target_content,
              createdAt: like.target_created_at,
              likeCount: like.target_like_count,
              replyCount: like.target_reply_count
            },
            post: {
              id: like.post_id,
              content: like.post_content,
              createdAt: like.post_created_at,
              categoryName: like.category_name
            }
          }
        case 'reply':
          return {
            ...baseData,
            target: {
              id: like.target_id,
              content: like.target_content,
              createdAt: like.target_created_at,
              likeCount: like.target_like_count
            },
            comment: {
              id: like.comment_id,
              content: like.comment_content,
              createdAt: like.comment_created_at
            },
            post: {
              id: like.post_id,
              content: like.post_content,
              createdAt: like.post_created_at,
              categoryName: like.category_name
            }
          }
        default:
          return baseData
      }
    })

    res.send({
      status: 0,
      message: '获取获赞情况成功',
      data: {
        total,
        pagenum: page,
        pagesize: size,
        list: likeList
      }
    })
  } catch (err) {
    console.error('获取用户获赞情况失败:', err)
    res.cc(err)
  }
}

// 获取当前用户点赞情况
exports.getMyLikes = async (req, res) => {
  const { pageNum = 1, pageSize = 10 } = req.query
  const currentUserId = req.auth.id
  
  // 转换为数字类型
  const page = parseInt(pageNum)
  const size = parseInt(pageSize)
  
  try {
    // 获取等级名称函数
    const getLevelName = (level) => {
      const levelNames = {
        1: '深海窥屏鱼类',
        2: '偶尔冒泡的锦鲤',
        3: '冲鸭冲鸭冲鸭',
        4: '永动机型话痨',
        5: '人形自走热点',
        6: '神龙见首不见尾的传说'
      };
      return levelNames[level] || '未知等级';
    };

    // 查询当前用户点赞总数
    const [countResults] = await db.query(`
            SELECT 
        (SELECT COUNT(*) FROM likes WHERE user_id = ? AND status = 1) +
        (SELECT COUNT(*) FROM comment_likes WHERE user_id = ? AND status = 1) +
        (SELECT COUNT(*) FROM reply_likes WHERE user_id = ? AND status = 1)
      as total
    `, [currentUserId, currentUserId, currentUserId])
    const total = countResults[0].total

    // 查询帖子点赞情况
    const postLikesSql = `
      SELECT 
        'post' as type,
        l.created_at as like_time,
        l.id as like_id,
        p.id as target_id,
        p.content as target_content,
        p.created_at as target_created_at,
        p.like_count as target_like_count,
        p.comment_count as target_comment_count,
        p.view_count as target_view_count,
        c.name as category_name,
        GROUP_CONCAT(pi.image_url) as image_urls,
        u.id as author_id,
        u.nickname as author_nickname,
        u.avatar as author_avatar,
        u.level as author_level
      FROM likes l
      LEFT JOIN posts p ON l.post_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN post_images pi ON p.id = pi.post_id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE l.user_id = ? AND l.status = 1
      GROUP BY l.id
    `

    // 查询评论点赞情况
    const commentLikesSql = `
      SELECT 
        'comment' as type,
        cl.created_at as like_time,
        cl.id as like_id,
        c.id as target_id,
        c.content as target_content,
        c.created_at as target_created_at,
        c.like_count as target_like_count,
        c.reply_count as target_reply_count,
        p.id as post_id,
        p.content as post_content,
        p.created_at as post_created_at,
        cat.name as category_name,
        u.id as author_id,
        u.nickname as author_nickname,
        u.avatar as author_avatar,
        u.level as author_level
      FROM comment_likes cl
      LEFT JOIN comments c ON cl.comment_id = c.id
      LEFT JOIN posts p ON c.post_id = p.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE cl.user_id = ? AND cl.status = 1
    `

    // 查询回复点赞情况
    const replyLikesSql = `
      SELECT 
        'reply' as type,
        rl.created_at as like_time,
        rl.id as like_id,
        cr.id as target_id,
        cr.content as target_content,
        cr.created_at as target_created_at,
        cr.like_count as target_like_count,
        c.id as comment_id,
        c.content as comment_content,
        c.created_at as comment_created_at,
        p.id as post_id,
        p.content as post_content,
        p.created_at as post_created_at,
        cat.name as category_name,
        u.id as author_id,
        u.nickname as author_nickname,
        u.avatar as author_avatar,
        u.level as author_level
      FROM reply_likes rl
      LEFT JOIN comment_replies cr ON rl.reply_id = cr.id
      LEFT JOIN comments c ON cr.comment_id = c.id
      LEFT JOIN posts p ON cr.post_id = p.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      LEFT JOIN users u ON cr.user_id = u.id
      WHERE rl.user_id = ? AND rl.status = 1
    `

    // 执行三个查询
    const [postLikes] = await db.query(postLikesSql, [currentUserId])
    const [commentLikes] = await db.query(commentLikesSql, [currentUserId])
    const [replyLikes] = await db.query(replyLikesSql, [currentUserId])

    // 合并所有点赞记录并按时间排序
    const allLikes = [...postLikes, ...commentLikes, ...replyLikes]
      .sort((a, b) => new Date(b.like_time) - new Date(a.like_time))
      .slice((page - 1) * size, page * size)

    // 处理数据格式
    const likeList = allLikes.map(like => {
      const author = {
        id: like.author_id,
        nickname: like.author_nickname,
        avatar: like.author_avatar,
        level: like.author_level,
        levelName: getLevelName(like.author_level)
      }

      const baseData = {
        type: like.type,
        likeId: like.like_id,
        likeTime: like.like_time,
        author: author
      }

      switch (like.type) {
        case 'post':
          return {
            ...baseData,
            target: {
              id: like.target_id,
              content: like.target_content,
              createdAt: like.target_created_at,
              likeCount: like.target_like_count,
              commentCount: like.target_comment_count,
              viewCount: like.target_view_count,
              categoryName: like.category_name,
              imageUrls: like.image_urls ? like.image_urls.split(',') : []
            }
          }
        case 'comment':
          return {
            ...baseData,
            target: {
              id: like.target_id,
              content: like.target_content,
              createdAt: like.target_created_at,
              likeCount: like.target_like_count,
              replyCount: like.target_reply_count
            },
            post: {
              id: like.post_id,
              content: like.post_content,
              createdAt: like.post_created_at,
              categoryName: like.category_name
            }
          }
        case 'reply':
          return {
            ...baseData,
            target: {
              id: like.target_id,
              content: like.target_content,
              createdAt: like.target_created_at,
              likeCount: like.target_like_count
            },
            comment: {
              id: like.comment_id,
              content: like.comment_content,
              createdAt: like.comment_created_at
            },
            post: {
              id: like.post_id,
              content: like.post_content,
              createdAt: like.post_created_at,
              categoryName: like.category_name
            }
          }
        default:
          return baseData
      }
    })

    res.send({
      status: 0,
      message: '获取点赞情况成功',
      data: {
        total,
        pagenum: page,
        pagesize: size,
        list: likeList
      }
    })
  } catch (err) {
    console.error('获取当前用户点赞情况失败:', err)
    res.cc(err)
  }
}

// 获取当前用户评论和回复
exports.getMyComments = async (req, res) => {
  const { pageNum = 1, pageSize = 10 } = req.query
  const currentUserId = req.auth.id
  
  // 转换为数字类型
  const page = parseInt(pageNum)
  const size = parseInt(pageSize)
  
  try {
    // 获取等级名称函数
    const getLevelName = (level) => {
      const levelNames = {
        1: '深海窥屏鱼类',
        2: '偶尔冒泡的锦鲤',
        3: '冲鸭冲鸭冲鸭',
        4: '永动机型话痨',
        5: '人形自走热点',
        6: '神龙见首不见尾的传说'
      };
      return levelNames[level] || '未知等级';
    };

    // 查询当前用户评论和回复总数
    const [countResults] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM comments WHERE user_id = ?) +
        (SELECT COUNT(*) FROM comment_replies WHERE user_id = ?)
      as total
    `, [currentUserId, currentUserId])
    const total = countResults[0].total

    // 查询评论情况
    const commentsSql = `
      SELECT 
        'comment' as type,
        c.id as target_id,
        c.content as target_content,
        c.created_at as target_created_at,
        c.like_count as target_like_count,
        c.reply_count as target_reply_count,
        p.id as post_id,
        p.content as post_content,
        p.created_at as post_created_at,
        p.like_count as post_like_count,
        p.comment_count as post_comment_count,
        p.view_count as post_view_count,
        cat.name as category_name,
        GROUP_CONCAT(pi.image_url) as image_urls,
        u.id as author_id,
        u.nickname as author_nickname,
        u.avatar as author_avatar,
        u.level as author_level
      FROM comments c
      LEFT JOIN posts p ON c.post_id = p.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      LEFT JOIN post_images pi ON p.id = pi.post_id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE c.user_id = ?
      GROUP BY c.id
    `

    // 查询回复情况
    const repliesSql = `
      SELECT 
        'reply' as type,
        cr.id as target_id,
        cr.content as target_content,
        cr.created_at as target_created_at,
        cr.like_count as target_like_count,
        c.id as comment_id,
        c.content as comment_content,
        c.created_at as comment_created_at,
        c.like_count as comment_like_count,
        c.reply_count as comment_reply_count,
        p.id as post_id,
        p.content as post_content,
        p.created_at as post_created_at,
        p.like_count as post_like_count,
        p.comment_count as post_comment_count,
        p.view_count as post_view_count,
        cat.name as category_name,
        GROUP_CONCAT(pi.image_url) as image_urls,
        u.id as author_id,
        u.nickname as author_nickname,
        u.avatar as author_avatar,
        u.level as author_level
      FROM comment_replies cr
      LEFT JOIN comments c ON cr.comment_id = c.id
      LEFT JOIN posts p ON cr.post_id = p.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      LEFT JOIN post_images pi ON p.id = pi.post_id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE cr.user_id = ?
      GROUP BY cr.id
    `

    // 执行两个查询
    const [comments] = await db.query(commentsSql, [currentUserId])
    const [replies] = await db.query(repliesSql, [currentUserId])

    // 合并所有评论和回复记录并按时间排序
    const allComments = [...comments, ...replies]
      .sort((a, b) => new Date(b.target_created_at) - new Date(a.target_created_at))
      .slice((page - 1) * size, page * size)

    // 处理数据格式
    const commentList = allComments.map(item => {
      const author = {
        id: item.author_id,
        nickname: item.author_nickname,
        avatar: item.author_avatar,
        level: item.author_level,
        levelName: getLevelName(item.author_level)
      }

      const baseData = {
        type: item.type,
        author: author
      }

      switch (item.type) {
        case 'comment':
          return {
            ...baseData,
            target: {
              id: item.target_id,
              content: item.target_content,
              createdAt: item.target_created_at,
              likeCount: item.target_like_count,
              replyCount: item.target_reply_count
            },
            post: {
              id: item.post_id,
              content: item.post_content,
              createdAt: item.post_created_at,
              likeCount: item.post_like_count,
              commentCount: item.post_comment_count,
              viewCount: item.post_view_count,
              categoryName: item.category_name,
              imageUrls: item.image_urls ? item.image_urls.split(',') : []
            }
          }
        case 'reply':
          return {
            ...baseData,
            target: {
              id: item.target_id,
              content: item.target_content,
              createdAt: item.target_created_at,
              likeCount: item.target_like_count
            },
            comment: {
              id: item.comment_id,
              content: item.comment_content,
              createdAt: item.comment_created_at,
              likeCount: item.comment_like_count,
              replyCount: item.comment_reply_count
            },
            post: {
              id: item.post_id,
              content: item.post_content,
              createdAt: item.post_created_at,
              likeCount: item.post_like_count,
              commentCount: item.post_comment_count,
              viewCount: item.post_view_count,
              categoryName: item.category_name,
              imageUrls: item.image_urls ? item.image_urls.split(',') : []
            }
          }
        default:
          return baseData
      }
    })
        
        res.send({
            status: 0,
      message: '获取评论和回复成功',
      data: {
        total,
        pagenum: page,
        pagesize: size,
        list: commentList
      }
    })
    } catch (err) {
    console.error('获取当前用户评论和回复失败:', err)
    res.cc(err)
  }
}

// 提交意见反馈
exports.submitFeedback = async (req, res) => {
  const { type, title, content, contact_info } = req.body
  const userId = req.auth.id
  
  try {
    // 获取反馈类型名称
    const getTypeName = (type) => {
      const typeNames = {
        1: '功能建议',
        2: '界面优化',
        3: '内容问题',
        4: '性能问题',
        5: '其他'
      };
      return typeNames[type] || '未知类型';
    };

    // 插入反馈记录
    const sql = 'INSERT INTO feedbacks (user_id, type, type_name, title, content, contact_info, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, NOW())'
    const [results] = await db.query(sql, [userId, type, getTypeName(type), title, content, contact_info || null])
    
    res.send({
      status: 0,
      message: '意见反馈提交成功，感谢您的建议！',
      data: { 
        feedbackId: results.insertId,
        type: type,
        typeName: getTypeName(type),
        title,
        content,
        contact_info,
        createdAt: new Date()
      }
    })
  } catch (err) {
    console.error('提交意见反馈失败:', err)
    res.cc(err)
  }
}
