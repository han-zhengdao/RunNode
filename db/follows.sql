-- 用户关注表
CREATE TABLE IF NOT EXISTS follows (
  id INT PRIMARY KEY AUTO_INCREMENT,
  from_user_id BIGINT UNSIGNED NOT NULL COMMENT '关注人ID',
  to_user_id BIGINT UNSIGNED NOT NULL COMMENT '被关注人ID',
  status TINYINT DEFAULT 1 COMMENT '关注状态：1-关注中，0-已取消',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '关注时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_follow (from_user_id, to_user_id),
  INDEX idx_from_user (from_user_id),
  INDEX idx_to_user (to_user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户关注表';

-- 为用户表添加关注统计字段（如果不存在）
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS following_count INT DEFAULT 0 COMMENT '关注数',
ADD COLUMN IF NOT EXISTS followers_count INT DEFAULT 0 COMMENT '粉丝数';

-- 创建触发器：关注记录插入时更新统计
DELIMITER //
CREATE TRIGGER after_follow_insert
AFTER INSERT ON follows
FOR EACH ROW
BEGIN
    IF NEW.status = 1 THEN
        -- 更新关注者的关注数
        UPDATE users SET following_count = following_count + 1 WHERE id = NEW.from_user_id;
        -- 更新被关注者的粉丝数
        UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.to_user_id;
    END IF;
END//
DELIMITER ;

-- 创建触发器：关注状态更新时更新统计
DELIMITER //
CREATE TRIGGER after_follow_update
AFTER UPDATE ON follows
FOR EACH ROW
BEGIN
    -- 如果从取消关注变为关注
    IF OLD.status = 0 AND NEW.status = 1 THEN
        UPDATE users SET following_count = following_count + 1 WHERE id = NEW.from_user_id;
        UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.to_user_id;
    -- 如果从关注变为取消关注
    ELSEIF OLD.status = 1 AND NEW.status = 0 THEN
        UPDATE users SET following_count = following_count - 1 WHERE id = NEW.from_user_id;
        UPDATE users SET followers_count = followers_count - 1 WHERE id = NEW.to_user_id;
    END IF;
END//
DELIMITER ;

-- 创建触发器：物理删除记录时更新统计（保留以防万一）
DELIMITER //
CREATE TRIGGER after_follow_delete
AFTER DELETE ON follows
FOR EACH ROW
BEGIN
    IF OLD.status = 1 THEN
        -- 更新关注者的关注数
        UPDATE users SET following_count = following_count - 1 WHERE id = OLD.from_user_id;
        -- 更新被关注者的粉丝数
        UPDATE users SET followers_count = followers_count - 1 WHERE id = OLD.to_user_id;
    END IF;
END//
DELIMITER ;