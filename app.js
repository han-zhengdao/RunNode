// 导入express模块
const express = require('express')
// 创建express实例
const app = express()

// 导入cors中间件
const cors = require('cors')
// 注册cors中间件
app.use(cors())

// 配置解析表单数据的中间件
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// 添加全局请求日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('请求体:', req.body);
    next();
});

// 托管静态资源
app.use('/uploads', express.static('./uploads'))

// 一定要在路由之前，封装res.cc函数
app.use((req, res, next) => {
    // status默认值为1，表示失败的情况
    // err的值，可能是一个错误对象，也可能是一个错误的描述字符串
    res.cc = function (err, status = 1) {
        res.send({
            status,
            message: err instanceof Error ? err.message : err
        })
    }
    next()
})

// 导入验证规则
const joi = require('joi')

// 一定要在路由之前配置解析Token的中间件
const { expressjwt: expressJwt } = require('express-jwt')
const config = require('./config')
app.use(expressJwt({ secret: config.jwtSecretKey, algorithms: ['HS256'] }).unless({
    path: [
        /^\/api\//,
        /^\/uploads\//
    ]
}))

// 导入并使用用户路由模块
const userRouter = require('./router/users')
app.use('/api', userRouter)

// 导入并使用用户信息的路由模块
const userinfoRouter = require('./router/userinfo')
app.use('/my', userinfoRouter)

// 导入文章分类路由模块
const artcateRouter = require('./router/artcate')
// 使用路由模块
app.use('/my/artcate', artcateRouter)

// 导入文章路由模块
const articleRouter = require('./router/article')
// 使用路由模块
app.use('/my/article', articleRouter)

// 导入上传路由模块
const uploadRouter = require('./router/upload')
// 使用路由模块
app.use('/api/upload', uploadRouter)

// 导入互动路由模块
const interactionRouter = require('./router/interaction')
// 使用路由模块
app.use('/my/interaction', interactionRouter)

// 定义错误处理中间件
app.use((err, req, res, next) => {
    // 判断错误是否为验证失败的错误
    if (err instanceof joi.ValidationError) return res.cc(err)
    // 判断错误是否为token认证失败的错误
    if (err.name === 'UnauthorizedError') return res.cc('身份认证失败！')
    // 判断是否为multer相关错误
    if (err.name === 'MulterError') return res.cc(err.message)

    // 其他错误处理
    return res.cc(err)
})

// 导入node-schedule模块
const schedule = require('node-schedule')
const { decayUserPoints } = require('./router_handler/userinfo')
const { cleanupTempFiles } = require('./utils/cleanup')

// 每月1号凌晨0点执行积分衰减
schedule.scheduleJob('0 0 1 * *', () => {
    console.log('开始执行每月积分衰减...')
    decayUserPoints()
})

// 每天凌晨3点执行临时文件清理
schedule.scheduleJob('0 3 * * *', () => {
    console.log('开始清理临时文件...')
    cleanupTempFiles()
})

// 监听端口
app.listen(3000,'127.0.0.1', () => {
    console.log('API 服务已启动：http://127.0.0.1:3000')
})