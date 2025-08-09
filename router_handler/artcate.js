// 导入数据库操作模块
const db = require('../db/index')

// 获取文章分类列表
exports.getArtCates = async (req, res) => {
    try {
        const sql = 'SELECT * FROM categories'
        const [results] = await db.query(sql)
        res.send({
            status: 0,
            message: '获取文章分类列表成功',
            data: results
        })
    } catch (err) {
        res.cc(err)
    }
}

// 新增文章分类
exports.addArtCate = async (req, res) => {
    const { name } = req.body
    if (!name) return res.cc('请输入分类名称')
    
    try {
        const sql = 'INSERT INTO categories (name) VALUES (?)'
        const [results] = await db.query(sql, [name])
        if (results.affectedRows !== 1) return res.cc('新增分类失败')
        console.log(results.affectedRows);
        
        res.cc('新增分类成功', 0)
    } catch (err) {
        res.cc(err)
    }
}

// 删除文章分类
exports.delArtCate = async (req, res) => {
    try {
        // 定义标记删除文章分类的SQL语句
        const sql = 'UPDATE categories SET is_active = 0 WHERE id = ?'
        const [results] = await db.query(sql, [req.params.id])
        if (results.affectedRows !== 1) return res.cc('删除分类失败')
        res.cc('删除分类成功', 0)
    } catch (err) {
        res.cc(err)
    }
}   

// 根据id更新文章分类函数
exports.update = async (req, res) => {
    try {
        // 定义查询文章分类名称是否存在的sql
        const sql = 'SELECT * FROM categories WHERE name = ?'
        const [results] = await db.query(sql, [req.body.name])
        if (results.length > 0) return res.cc('分类名称已存在')
        
        // 定义更新文章分类的sql
        const updateSql = 'UPDATE categories SET name = ? WHERE id = ?'
        const [updateResults] = await db.query(updateSql, [req.body.name, req.body.id])
        if (updateResults.affectedRows !== 1) return res.cc('更新分类失败')
        res.cc('更新分类成功', 0)
    } catch (err) {
        res.cc(err)
    }
}

