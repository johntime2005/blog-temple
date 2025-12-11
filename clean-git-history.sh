#!/bin/bash
# Git 历史清理脚本
# 用于移除已泄露的敏感文件

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}⚠️  Git 历史清理工具 - 危险操作警告 ⚠️${NC}"
echo -e "${YELLOW}此脚本将永久删除Git历史中的敏感文件${NC}"
echo ""

# 要清理的文件列表
FILES_TO_REMOVE=(
    "word_zipfdk_2025110611374200krq.sql"
)

echo -e "${BLUE}将要从Git历史中删除以下文件:${NC}"
for file in "${FILES_TO_REMOVE[@]}"; do
    echo -e "  - ${RED}$file${NC}"
done
echo ""

# 确认操作
read -p "确认继续? 这将重写Git历史 (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}操作已取消${NC}"
    exit 0
fi

echo -e "${YELLOW}开始清理过程...${NC}"

# 方法1: 使用 git filter-repo (推荐,需要先安装)
if command -v git-filter-repo &> /dev/null; then
    echo -e "${GREEN}使用 git-filter-repo 清理...${NC}"

    for file in "${FILES_TO_REMOVE[@]}"; do
        echo -e "  清理: $file"
        git filter-repo --path "$file" --invert-paths --force
    done

    echo -e "${GREEN}✅ 清理完成 (使用 git-filter-repo)${NC}"

elif command -v bfg &> /dev/null; then
    # 方法2: 使用 BFG Repo-Cleaner
    echo -e "${GREEN}使用 BFG Repo-Cleaner 清理...${NC}"

    for file in "${FILES_TO_REMOVE[@]}"; do
        echo -e "  清理: $file"
        bfg --delete-files "$file"
    done

    git reflog expire --expire=now --all
    git gc --prune=now --aggressive

    echo -e "${GREEN}✅ 清理完成 (使用 BFG)${NC}"

else
    # 方法3: 使用原生 git filter-branch (较慢)
    echo -e "${YELLOW}使用 git filter-branch 清理 (较慢)...${NC}"

    for file in "${FILES_TO_REMOVE[@]}"; do
        echo -e "  清理: $file"
        git filter-branch --force --index-filter \
            "git rm --cached --ignore-unmatch $file" \
            --prune-empty --tag-name-filter cat -- --all
    done

    git reflog expire --expire=now --all
    git gc --prune=now --aggressive

    echo -e "${GREEN}✅ 清理完成 (使用 filter-branch)${NC}"
fi

# 从工作区删除文件
echo -e "${YELLOW}从工作区删除敏感文件...${NC}"
for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        echo -e "  已删除: $file"
    fi
done

echo ""
echo -e "${RED}⚠️  下一步操作:${NC}"
echo -e "1. 验证清理结果:"
echo -e "   ${BLUE}git log --all --full-history -- word_zipfdk_2025110611374200krq.sql${NC}"
echo ""
echo -e "2. 强制推送到远程仓库 (⚠️危险):"
echo -e "   ${RED}git push origin --force --all${NC}"
echo -e "   ${RED}git push origin --force --tags${NC}"
echo ""
echo -e "3. 通知团队成员:"
echo -e "   - 所有人需要重新克隆仓库"
echo -e "   - 或执行: ${BLUE}git pull --rebase && git reflog expire --expire=now --all && git gc --prune=now${NC}"
echo ""
echo -e "${YELLOW}⚠️  警告: 强制推送会影响所有协作者!${NC}"
echo ""

# 工具安装提示
echo -e "${BLUE}💡 推荐安装 git-filter-repo (最快速):${NC}"
echo -e "   pip install git-filter-repo"
echo -e "   或访问: https://github.com/newren/git-filter-repo"
