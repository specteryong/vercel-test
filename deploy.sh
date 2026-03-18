#!/bin/bash

# Vercel 日记网站一键部署脚本
# 用法：./deploy.sh

set -e

echo "🚀 开始部署 Vercel 日记网站..."

# 检查 git 是否安装
if ! command -v git &> /dev/null; then
    echo "❌ 错误：git 未安装，请先安装 git"
    exit 1
fi

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 初始化 git（如果需要）
if [ ! -d ".git" ]; then
    echo "📦 初始化 git 仓库..."
    git init
fi

# 添加所有文件
echo "📝 添加文件..."
git add .

# 提交更改
echo "💾 提交更改..."
git commit -m "feat: 添加云端存储和实时保存功能" || echo "⚠️  没有更改需要提交"

# 检查远程仓库
if ! git remote | grep -q "origin"; then
    echo "🔗 添加远程仓库..."
    read -p "请输入 GitHub 仓库 URL (例如：https://github.com/specteryong/vercel-test.git): " REPO_URL
    git remote add origin "$REPO_URL"
fi

# 设置主分支
echo "🌿 设置主分支..."
git branch -M main

# 推送
echo "📤 推送到 GitHub..."
git push -u origin main

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 下一步："
echo "1. 访问 https://vercel.com/dashboard"
echo "2. 导入你的 GitHub 仓库"
echo "3. 在 Storage 标签创建 KV 数据库"
echo "4. 等待 Vercel 自动部署"
echo ""
echo "📖 详细指南：查看 vercel-部署指南.md"
echo ""
