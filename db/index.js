// 导入数据库模块
const mysql = require('mysql2/promise');

// 创建数据库连接对象
const db = mysql.createPool({
    host: '117.72.213.251',
    user: 'rundata',
    password: 'hanzhengdao526.*',
    database: 'rundata'
})

// 向外共享db数据库连接对象
module.exports = db;