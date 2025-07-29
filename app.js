// 导入express
const express = require('express');
// 创建应用对象
const app = express();

// 静态资源托管，必须放在最前面
app.use('/uploads', express.static('uploads'))

// 导入验证规则
const joi = require('joi')
// 解决跨域问题，使用cors中间件
const cors = require('cors')
// 将cors注册为全局中间件
app.use(cors())

// 配置解析json数据的中间件
app.use(express.json())
// 配置解析表单数据的中间件
app.use(express.urlencoded({ extended: false }))

// 在路由之前封装错误处理中间件res.cc
app.use((req, res, next) => {
    // 定义res.cc函数，处理错误信息
    res.cc = (err, status = 1) => {
        res.send(
            {
                status,
                message: err instanceof Error ? err.message : err
            }
        )
    }
    next()
})

// 配置解析token的中间件
const {expressjwt: expressJwt} = require('express-jwt')
// 导入全局配置文件
const config = require('./config')
// 使用expressJwt中间件来解析token
app.use(expressJwt({ secret: config.jwtSecretKey, algorithms: ['HS256'] }).unless({ path: [/^\/api/,/^\/uploads/]}))


// 导入用户路由模块
const userRouter = require('./router/users');
// 使用路由模块
app.use('/api', userRouter);

// 导入用户信息路由模块
const userinfoRouter = require('./router/userinfo');
// 使用路由模块
app.use('/my', userinfoRouter);

// 导入文章分类路由模块
const artcateRouter = require('./router/artcate');
// 使用路由模块
app.use('/my/artcate', artcateRouter);

// 导入文章路由模块
const articleRouter = require('./router/article');
// 使用路由模块
app.use('/my/article', articleRouter);

// 导入互动路由模块
const interactionRouter = require('./router/interaction');
// 使用路由模块
app.use('/my/interaction', interactionRouter);


// 定义错误处理中间件
app.use((err, req, res, next) => {
    // 判断错误是否为验证失败的错误
    if (err instanceof joi.ValidationError) return res.cc(err)
    // 判断错误是否为token认证失败的错误
    if (err.name === 'UnauthorizedError') return res.cc('身份认证失败！')

    // 其他错误处理
    return res.cc(err)
})

// 导入node-schedule模块
const schedule = require('node-schedule');
const { decayUserPoints } = require('./router_handler/userinfo');
// 每月1号凌晨0点执行一次
schedule.scheduleJob('0 0 1 * *', () => {
    console.log('开始执行每月积分衰减...');
    decayUserPoints();
});
// 每分钟的第0秒执行一次
// schedule.scheduleJob('0 * * * * *', () => {
//     console.log('测试：开始执行积分衰减...');
//     decayUserPoints();
// });

// 监听端口
app.listen(3000, () => {
    console.log('服务器已启动 http://localhost:3000');
});