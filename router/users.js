// 导入express
const express = require('express');
// 创建路由对象
const router = express.Router();

// 导入路由处理函数模块
const userHandler = require('../router_handler/users');


// 创建用户微信登录注册路由
router.post('/users', userHandler.register);

// 创建tonken刷新路由
router.post('/refreshToken', userHandler.refreshToken);




// 导出路由对象
module.exports = router;