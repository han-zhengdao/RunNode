// 导入数据库操作模块
const db = require('../db/index');
// 导入axios模块
const axios = require('axios');
// 导入生成token的模块
const jwt = require('jsonwebtoken')
// 导入全局配置文件
const config = require('../config');
// 导入积分变动与等级自动更新模块
const { changeUserPoints } = require('./userinfo');


// 微信一键注册
exports.register = async (req, res) => {
    // 接收请求体数据
    const { code, nickname, avatar } = req.body;
    
    // 验证必要参数
    if (!code) {
        return res.status(400).json({ status: 1, message: '缺少微信授权码' });
    }
    
    const appid = 'wx62bd77b42697a800';
    const secret = '384fd0c8341b262b36772f4ecc881d0e';

    // 请求微信 code2Session 接口
    const wechatApiUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    
    try {
        const response = await axios.get(wechatApiUrl, { timeout: 10000 });
        
        // 检查微信API返回的错误
        if (response.data.errcode) {
            return res.status(400).json({ status: 1, message: `微信登录失败: ${response.data.errmsg}` });
        }
        
        // 获取openid
        const { openid } = response.data;
        
        if (!openid) {
            return res.status(400).json({ status: 1, message: '微信登录失败，未获取到用户标识' });
        }
        
        // 查询数据库中是否存在该用户
        const sql = 'SELECT * FROM users WHERE openid = ?';
        const [results] = await db.query(sql, [openid]);
                
                if (results.length === 0) {
                    // 用户不存在，进行注册
                    const insertSql = 'INSERT INTO users (openid, nickname, avatar, points, level) VALUES (?, ?, ?, 100, 1)';
                    const [insertResults] = await db.query(insertSql, [openid, nickname || '微信用户', avatar || '']);
                    
                    const userId = insertResults.insertId;
                    
                    // 生成token
                    const tokenStr = jwt.sign({ id: userId, openid }, config.jwtSecretKey, { expiresIn: config.expiresIn });
                    const refreshTokenStr = jwt.sign({ id: userId, openid }, config.jwtSecretKey, { expiresIn: '7d' });
                    
                    // 新用户注册奖励积分
                    changeUserPoints(userId, 50, '新用户注册奖励', (pointsErr) => {
                        if (pointsErr) {
                            console.error('积分奖励失败:', pointsErr);
                        }
                        
                        res.json({
                            status: 0,
                            message: '注册成功',
                            token: 'Bearer ' + tokenStr,
                            refreshToken: refreshTokenStr,
                            user: {
                                id: userId,
                                openid,
                                nickname: nickname || '微信用户',
                                avatar: avatar || '',
                                points: 150, // 100初始积分 + 50奖励积分
                                level: 1
                            }
                        });
                    });
                } else {
                    // 用户已存在，直接登录
                    const user = results[0];
                    
                    // 生成token
                    const tokenStr = jwt.sign({ id: user.id, openid }, config.jwtSecretKey, { expiresIn: config.expiresIn });
                    const refreshTokenStr = jwt.sign({ id: user.id, openid }, config.jwtSecretKey, { expiresIn: '7d' });
                    
                    // 登录奖励积分
                    changeUserPoints(user.id, 10, '每日登录奖励', (pointsErr) => {
                        if (pointsErr) {
                            console.error('积分奖励失败:', pointsErr);
                        }
                        
                        res.json({
                            status: 0,
                            message: '登录成功',
                            token: 'Bearer ' + tokenStr,
                            refreshToken: refreshTokenStr,
                            user: {
                                id: user.id,
                                openid: user.openid,
                                nickname: user.nickname,
                                avatar: user.avatar,
                                points: user.points + 10,
                                level: user.level
                            }
                        });
                    });
                }
    } catch (error) {
        console.error('微信登录过程中出错:', error);
        console.error('错误详情:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
        
        if (error.code === 'ECONNABORTED') {
            return res.status(408).json({ status: 1, message: '微信登录超时，请重试' });
        }
        if (error.response) {
            return res.status(500).json({ status: 1, message: '微信API请求失败' });
        }
        
        // 数据库相关错误的详细处理
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({ status: 1, message: '数据库表不存在，请检查数据库配置' });
        }
        if (error.code === 'ECONNREFUSED') {
            return res.status(500).json({ status: 1, message: '数据库连接被拒绝，请检查数据库服务' });
        }
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            return res.status(500).json({ status: 1, message: '数据库访问权限不足' });
        }
        
        return res.status(500).json({ 
            status: 1, 
            message: `数据库操作失败：${error.message || '未知错误'}，请重试` 
        });
    }
};

// 刷新token
exports.refreshToken = (req, res) => {
    // 获取refreshToken
    const { refreshToken } = req.body;
    if (!refreshToken) return res.cc('请提供refreshToken');

    // 验证refreshToken
    jwt.verify(refreshToken, config.jwtSecretKey, (err, decoded) => {
        if (err) return res.cc('刷新令牌无效或已过期');

        // 生成新的token
        const newToken = jwt.sign({ openid: decoded.openid, nickname: decoded.nickname, avatar: decoded.avatar }, config.jwtSecretKey, { expiresIn: config.expiresIn });
        
        res.send({
            status: 0,
            message: '刷新令牌成功',
            data: { token: newToken }
        });
    });
};

