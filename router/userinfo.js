// 导入express
const express = require('express');
// 创建路由对象
const router = express.Router();

// 导入路由处理函数模块
const userinfo_handler = require('../router_handler/userinfo');

// 创建用户信息的路由
router.get('/userinfo', userinfo_handler.getUserInfo);

// 创建更新用户等级信息的路由
router.post('/userlevel', userinfo_handler.updateUserLevel);

// 导出路由对象
module.exports = router;
