# Node.js API 服务

## 项目简介
这是一个基于 Express.js 的 Node.js API 服务，提供用户管理、文章管理、互动功能等服务。

## 功能特性
- 用户注册、登录、信息管理
- 文章发布、分类管理
- 评论、回复、点赞功能
- 用户关注、粉丝管理
- 意见反馈功能
- 文件上传功能

## 技术栈
- Node.js
- Express.js
- MySQL
- JWT 认证
- Multer 文件上传
- Joi 数据验证

## 安装和运行

### 环境要求
- Node.js >= 14.0.0
- MySQL >= 5.7

### 安装依赖
```bash
npm install
```

### 配置数据库
1. 创建数据库
2. 导入数据库表结构
3. 修改 `config.js` 中的数据库配置

### 启动服务
```bash
# 开发环境
npm run dev

# 生产环境
npm start
```

## API 接口

### 用户相关
- POST /api/reguser - 用户注册
- POST /api/login - 用户登录
- GET /my/userinfo - 获取用户信息
- PUT /my/userinfo - 更新用户信息

### 文章相关
- GET /my/article/list - 获取文章列表
- POST /my/article/add - 发布文章
- GET /my/article/:id - 获取文章详情

### 互动相关
- POST /my/interaction/follow - 关注/取消关注
- POST /my/interaction/likearticle - 点赞文章
- POST /my/interaction/comment - 发表评论
- GET /my/interaction/my-likes - 获取我的点赞
- GET /my/interaction/my-comments - 获取我的评论

## 端口配置
默认端口：3001

## 许可证
ISC
