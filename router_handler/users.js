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
exports.register = (req, res) => {
    // 接收请求体数据
    const { code, nickname, avatar } = req.body;
    const appid = 'wx62bd77b42697a800';
    const secret = '384fd0c8341b262b36772f4ecc881d0e';

    // 请求微信 code2Session 接口
    axios.get(`https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`)
        .then(response => {
            // 获取openid
            const openid = response.data.openid;
            
            // 查询数据库中是否存在该用户
            const sql = 'SELECT * FROM users WHERE openid = ?';
            db.query(sql, [openid], (err, results) => {
                if (err) return res.cc(err);
                // 如果用户不存在，则插入新用户
                if (results.length === 0) {
                    const insertSql = 'INSERT INTO users (openid, nickname, avatar) VALUES (?, ?, ?)';
                    db.query(insertSql, [openid, nickname, avatar], (err, results) => {
                        if (err) return res.cc(err);
                        // 返回注册成功信息
                        // 生成token
                        // const id = results[0].id;
                        const id = results.insertId;
                        console.log('idddddd:', id);
                        
                        const userInfo = { id, openid, nickname, avatar };
                        const token = jwt.sign(userInfo, config.jwtSecretKey, { expiresIn: config.expiresIn });
                        // 生成refreshToken
                        const refreshToken = jwt.sign(userInfo, config.jwtSecretKey, { expiresIn: config.refreshExpiresIn });
                        console.log('token:', token);
                        
                        changeUserPoints(id, 5, '每日上线',  () => {
                            
                            res.send({
                                status: 0,
                                message: '注册成功',
                                data: { nickname, avatar, token, refreshToken }
                            })
                        })
                        
                    });
                } else {
                    // 如果用户已存在，更新他们的昵称和头像
                    const updateSql = 'UPDATE users SET nickname = ?, avatar = ? WHERE openid = ?';
                    db.query(updateSql, [nickname, avatar, openid], (updateErr, updateResults) => {
                        if (updateErr) return res.cc(updateErr);

                        // 用户信息已更新，现在用【新的】信息生成 token 并返回
                        const id = results[0].id;
                        const userInfo = { id, openid, nickname, avatar }; // 使用来自 req.body 的新数据
                        const token = jwt.sign(userInfo, config.jwtSecretKey, { expiresIn: config.expiresIn });
                        const refreshToken = jwt.sign(userInfo, config.jwtSecretKey, { expiresIn: config.refreshExpiresIn });
                        console.log('token:', token);
                        // 登录成功后，给用户加每日上线积分
                        changeUserPoints(id, 5, '每日上线',  () => {
                            
                            res.send({
                                status: 0,
                                message: '登录成功',
                                data: { nickname, avatar, token, refreshToken }
                            })
                        })  
                    });
                }
            });
        })
        .catch(err => {
            // 打印完整的错误对象，这非常重要！
        if (err.response) {
            // 如果是 HTTP 错误（比如 4xx, 5xx），打印响应体
            console.error('微信接口请求失败 - 响应数据:', err.response.data);
            console.error('微信接口请求失败 - 响应状态:', err.response.status);
        } else if (err.request) {
            // 如果是请求已发出但没有收到响应
            console.error('微信接口请求无响应:', err.request);
        } else {
            // 如果是请求设置时出错
            console.error('Axios 请求设置错误:', err.message);
        }
            res.cc('微信登录失败，请稍后再试！');
        });
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