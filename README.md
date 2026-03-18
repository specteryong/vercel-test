# 📔 我的日记 | AI 新闻

一个简约的个人日记网站，集成 AI 行业新闻。

**在线演示：** [vercel-test-xxx.vercel.app](https://vercel-test-xxx.vercel.app)

## ✨ 特性

- 📝 **写日记** - 记录每日思考与感悟
- ⚡ **实时保存** - 输入后自动保存，无需手动点击
- ☁️ **云端存储** - 数据永久保存，支持跨设备同步
- 🤖 **AI 新闻** - 自动获取最新 AI 行业新闻
- 📱 **响应式** - 完美适配手机、平板、电脑
- 🎨 **简约设计** - 专注内容，无干扰
- 📚 **日记归档** - 按月分组，快速查找

## 🚀 快速开始

### 1. 部署到 Vercel

```bash
# 克隆项目
git clone https://github.com/specteryong/vercel-test.git
cd vercel-test

# 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

### 2. 配置 Vercel KV

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 导入你的 GitHub 仓库
3. 进入项目 → Storage → Create Database → KV
4. 等待自动部署完成

### 3. 访问网站

部署完成后，访问 Vercel 分配的域名即可开始使用！

## 📁 项目结构

```
vercel-test/
├── index.html          # 主页
├── styles.css          # 样式表
├── script.js           # 前端逻辑（云端存储 + 实时保存）
├── package.json        # 项目配置
├── vercel.json         # Vercel 部署配置
├── deploy.sh           # 一键部署脚本
└── api/
    └── diary.js        # Serverless API（日记增删改查）
```

## 🛠️ 技术栈

- **前端：** HTML5, CSS3, Vanilla JavaScript
- **后端：** Vercel Serverless Functions
- **数据库：** Vercel KV (Redis)
- **部署：** Vercel
- **版本控制：** GitHub

## 🎯 使用说明

### 写日记
1. 点击 "写日记" 按钮
2. 输入内容（会自动保存）
3. 观察右上角保存状态提示
4. 完成后可直接关闭

### 查看日记
- **今日日记：** 首页显示今日内容
- **日记归档：** 按月查看所有历史日记
- **搜索：** 点击归档条目可查看详情

### AI 新闻
- 自动获取最新 AI 行业新闻
- 30 分钟自动刷新
- 点击 "刷新新闻" 手动更新

## 🔧 本地开发

```bash
# 安装依赖
npm install

# 启动本地开发服务器
npx vercel dev

# 访问 http://localhost:3000
```

## 📊 免费额度

Vercel + KV 完全免费：
- ✅ 100GB 带宽/月
- ✅ 1GB 存储空间
- ✅ 100 万次操作/月
- ✅ 自动 HTTPS 证书
- ✅ 全球 CDN 加速

## 🆚 版本对比

### v2.0（当前版本）
- ✅ 云端存储，数据永不丢失
- ✅ 实时自动保存
- ✅ 跨设备同步
- ✅ Serverless API

### v1.0（旧版本）
- ❌ localStorage 本地存储
- ❌ 手动保存
- ❌ 数据会丢失
- ❌ 无法跨设备

## 📖 详细文档

- [部署指南](vercel-部署指南.md) - 完整部署步骤
- [改进方案](vercel-日记网站改进方案.md) - 技术架构说明

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**开发者：** 雍先生  
**GitHub：** [@specteryong](https://github.com/specteryong)
