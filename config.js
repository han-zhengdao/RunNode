// 全局配置文件
module.exports = {
    // 加密和解密token的密钥
    jwtSecretKey: 'runlongyuan',
    expiresIn: '10h', // token的有效期
    refreshExpiresIn: '30d', // 刷新令牌的有效期
}