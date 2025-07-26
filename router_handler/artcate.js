// 导入数据库操作模块
const db = require('../db/index')

// 获取文章分类列表
exports.getArtCates = (req, res) => {
    const sql = 'SELECT * FROM categories'
    db.query(sql, (err, results) => {
        if (err) return res.cc(err)
        res.send({
            status: 0,
            message: '获取文章分类列表成功',
            data: results
        })
    })
}

// 新增文章分类
exports.addArtCate = (req, res) => {
    const { name } = req.body
    if (!name) return res.cc('请输入分类名称')
    
    const sql = 'INSERT INTO categories (name) VALUES (?)'
    db.query(sql, [name], (err, results) => {
        if (err) return res.cc(err)
        if (results.affectedRows !== 1) return res.cc('新增分类失败')
            console.log(results.affectedRows);
            
        res.cc('新增分类成功', 0)
    })
}

// 删除文章分类
exports.delArtCate = (req, res) => {
    // 定义标记删除文章分类的SQL语句
    const sql = 'UPDATE categories SET is_active = 0 WHERE id = ?'
    db.query(sql, req.params.id, (err, results) => {
        if (err) return res.cc(err)
        if (results.affectedRows !== 1) return res.cc('删除分类失败')
        res.cc('删除分类成功', 0)
    })
}   

// 根据id更新文章分类函数
exports.update = (req, res) => {
    // 定义查询文章分类名称是否存在的sql
    const sql = 'SELECT * FROM categories WHERE name = ?'
    db.query(sql, req.body.name, (err, results) => {
        if (err) return res.cc(err)
        if (results.length > 0) return res.cc('分类名称已存在')
        // 定义更新文章分类的sql
        const sql = 'UPDATE categories SET name = ? WHERE id = ?'
        db.query(sql, [req.body.name, req.body.id], (err, results) => {
            if (err) return res.cc(err)
            if (results.affectedRows !== 1) return res.cc('更新分类失败')
            res.cc('更新分类成功', 0)
        })
    })
}

