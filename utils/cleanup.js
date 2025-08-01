const fs = require('fs').promises
const path = require('path')

// 清理临时文件
async function cleanupTempFiles() {
    const tempDir = path.join(__dirname, '../uploads/temp')
    try {
        // 读取临时目录中的所有文件
        const files = await fs.readdir(tempDir)
        const now = Date.now()
        
        // 遍历所有文件
        for (const file of files) {
            const filePath = path.join(tempDir, file)
            try {
                // 获取文件状态
                const stats = await fs.stat(filePath)
                // 如果文件超过24小时未使用，则删除
                if (now - stats.mtimeMs > 24 * 60 * 60 * 1000) {
                    await fs.unlink(filePath)
                    console.log(`已删除临时文件: ${file}`)
                }
            } catch (err) {
                console.error(`处理文件 ${file} 时出错:`, err)
            }
        }
        console.log('临时文件清理完成')
    } catch (err) {
        console.error('清理临时文件时出错:', err)
    }
}

module.exports = {
    cleanupTempFiles
}