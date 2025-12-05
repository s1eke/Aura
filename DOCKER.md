# Aura Docker 部署指南

## 快速开始

### 使用 Docker Compose（推荐）

1. **构建并启动服务**
   ```bash
   docker-compose up -d
   ```

2. **查看日志**
   ```bash
   docker-compose logs -f aura
   ```

3. **停止服务**
   ```bash
   docker-compose down
   ```

### 使用 Docker 命令

1. **构建镜像**
   ```bash
   docker build -t aura-app .
   ```

2. **运行容器（带数据持久化）**
   ```bash
   docker run -d \
     --name aura \
     -p 3000:3000 \
     -v $(pwd)/data/uploads:/app/public/uploads \
     -v $(pwd)/data/prisma:/app/prisma \
     -e NEXTAUTH_SECRET=your-secret-here \
     -e NEXTAUTH_URL=http://localhost:3000 \
     --restart unless-stopped \
     aura-app
   ```

## 数据持久化

Aura 使用两个卷来持久化数据：

### 1. `/app/public/uploads` - 用户上传的文件

包含以下内容：
- **头像**：`/uploads/avatars/` - 用户和 AI 角色的头像图片
- **聊天图片**：`/uploads/YYYY/MM/DD/` - 用户在聊天中发送的图片
- **背景图片**：`/uploads/YYYY/MM/DD/` - 聊天背景图片

**建议挂载方式**：
```bash
-v /path/to/persistent/storage/uploads:/app/public/uploads
```

### 2. `/app/prisma` - SQLite 数据库

包含：
- `dev.db` - 应用的 SQLite 数据库文件
- `dev.db-journal` - 数据库日志文件（如果存在）

**建议挂载方式**：
```bash
-v /path/to/persistent/storage/prisma:/app/prisma
```

## 环境变量

必需的环境变量：
```bash
NEXTAUTH_SECRET=<随机生成的密钥>
NEXTAUTH_URL=<你的应用URL>
```

生成 NEXTAUTH_SECRET：
```bash
openssl rand -base64 32
```

## 备份和恢复

### 备份

备份用户数据：
```bash
# 备份上传的文件
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz ./data/uploads

# 备份数据库
cp ./data/prisma/dev.db ./backups/dev.db-$(date +%Y%m%d)
```

### 恢复

```bash
# 恢复上传的文件
tar -xzf uploads-backup-20231201.tar.gz -C ./data/

# 恢复数据库
cp ./backups/dev.db-20231201 ./data/prisma/dev.db
```

## 更新应用

1. **停止容器**
   ```bash
   docker-compose down
   ```

2. **拉取最新代码并重新构建**
   ```bash
   git pull
   docker-compose build
   ```

3. **启动新容器**
   ```bash
   docker-compose up -d
   ```

注意：由于使用了卷挂载，用户数据和数据库不会丢失。

## 初始化用户

首次部署后创建用户：
```bash
docker-compose exec aura npm run create-user
```

## 故障排查

### 容器无法启动
```bash
# 查看日志
docker-compose logs aura

# 检查容器状态
docker-compose ps
```

### 文件上传失败
- 确保 `/app/public/uploads` 目录有写入权限
- 检查磁盘空间是否充足

### 数据库错误
- 确保 `/app/prisma` 目录有写入权限
- 检查数据库文件是否损坏

## 生产环境建议

1. **使用 Nginx 反向代理**（启用 HTTPS）
2. **定期备份数据**（建议每日备份）
3. **监控磁盘空间**（uploads 目录会随时间增长）
4. **设置日志轮转**
5. **使用环境变量文件**（不要在 docker-compose.yml 中硬编码敏感信息）
