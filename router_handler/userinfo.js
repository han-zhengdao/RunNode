// 导入数据库操作模块
const db = require('../db/index');

// 获取用户信息的处理函数
exports.getUserInfo = async (req, res) => {
    try {
        // 根据用户id查询用户信息
        const sql = 'SELECT * FROM users WHERE id = ?';
        const [results] = await db.query(sql, [req.auth.id]);
        
        if (results.length !== 1) return res.cc('获取用户信息失败！');
        const user = results[0];
        console.log('userssss:', user);
        
        user.levelName = getLevelName(user.level); // 增加等级名称
        res.send({
            status: 0,
            message: '获取用户信息成功',
            data: user
        });
    } catch (err) {
        res.cc(err);
    }
}

// 积分变动与等级自动更新
exports.changeUserPoints = async (userId, change, reason, callback) => {
    try {
        await db.query('UPDATE users SET points = points + ? WHERE id = ?', [change, userId]);
        
        // 插入积分日志
        try {
            await db.query(
                'INSERT INTO points_log (user_id, points_change, reason) VALUES (?, ?, ?)',
                [userId, change, reason]
            );
        } catch (logErr) {
            console.error('积分日志插入失败:', logErr);
        }
        
        // 更新等级
        await updateUserLevel(userId, callback);
    } catch (err) {
        console.error('积分更新失败:', err);
        if (callback) callback(err);
    }
};

const updateUserLevel = async (userId, callback) => {
    try {
        const [results] = await db.query('SELECT points FROM users WHERE id = ?', [userId]);
        
        if (results.length === 0) {
            if (callback) callback(new Error('用户不存在'));
            return;
        }
        
        const points = results[0].points;
        let level = 1;
        if (points > 1500) level = 6;
        else if (points > 1000) level = 5;
        else if (points > 600) level = 4;
        else if (points > 300) level = 3;
        else if (points > 100) level = 2;
        
        await db.query('UPDATE users SET level = ? WHERE id = ?', [level, userId]);
        
        if (callback) callback(null);
    } catch (err) {
        console.error('更新用户等级失败:', err);
        if (callback) callback(err);
    }
}

exports.decayUserPoints = () => {
    db.query('UPDATE users SET points = FLOOR(points * 0.95)'); // 每月基础衰减5%
    // 连续30天不活跃的用户再衰减10%
    db.query('UPDATE users SET points = FLOOR(points * 0.9) WHERE last_active < DATE_SUB(NOW(), INTERVAL 30 DAY)');
}

function getLevelName(level) {
    const levelNames = {
        1: '深海窥屏鱼类',
        2: '偶尔冒泡的锦鲤',
        3: '冲鸭冲鸭冲鸭',
        4: '永动机型话痨',
        5: '人形自走热点',
        6: '神龙见首不见尾的传说'
    };
    return levelNames[level] || '未知等级';
}

// 更新用户等级信息的处理函数
exports.updateUserLevel = async (req, res) => {
    try {
        // 定义更新用户等级信息的sql语句
        const sql = 'UPDATE users SET level = ? WHERE id = ?';
        // 执行更新用户等级信息的sql语句
        const [results] = await db.query(sql, [req.body.level, req.auth.id]);
        
        if (results.affectedRows !== 1) return res.cc('更新用户等级信息失败！');
        res.send({
            status: 0,
            message: '更新用户等级信息成功！'
        })
    } catch (err) {
        res.cc(err);
    }
}

