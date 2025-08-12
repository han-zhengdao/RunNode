-- 评论回复表
CREATE TABLE comment_replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comment_id INT NOT NULL COMMENT '所属评论ID',
  post_id INT NOT NULL COMMENT '所属文章ID',
  user_id INT NOT NULL COMMENT '回复用户ID',
  content TEXT NOT NULL COMMENT '回复内容',
  like_count INT DEFAULT 0 COMMENT '点赞数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_comment_id (comment_id),
  INDEX idx_post_id (post_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论回复表';

-- 回复点赞表
CREATE TABLE reply_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reply_id INT NOT NULL COMMENT '回复ID',
  user_id INT NOT NULL COMMENT '点赞用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '点赞时间',
  UNIQUE KEY uk_reply_user (reply_id, user_id) COMMENT '同一用户对同一回复只能点赞一次',
  INDEX idx_reply_id (reply_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (reply_id) REFERENCES comment_replies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='回复点赞表';

-- 为comments表添加回复数字段（如果不存在）
ALTER TABLE comments ADD COLUMN reply_count INT DEFAULT 0 COMMENT '回复数' AFTER like_count;