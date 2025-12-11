#!/bin/bash

# Cloudflare Blog Public Template Sync Script
# This script syncs the current repository to a "public template" repository,
# excluding all private content (diary posts, secrets, private configs).

set -e

# Configuration
PUBLIC_REPO_URL="git@github.com:johntime2005/blog-template.git" # Replace with actual public repo URL if different
Did setup remote? 0
TEMP_DIR=$(mktemp -d)
CURRENT_DIR=$(pwd)

echo "🚀 Starting Public Template Sync..."
echo "📂 Temporary directory: $TEMP_DIR"

# 1. Clone the public repo (if it exists) or initialize a new one
echo "⬇️  Cloning/Initializing public repo..."
if git clone "$PUBLIC_REPO_URL" "$TEMP_DIR"; then
    cd "$TEMP_DIR"
else
    echo "⚠️  Could not clone remote. Assuming it's new or empty."
    mkdir -p "$TEMP_DIR"
    cd "$TEMP_DIR"
    git init
    git remote add origin "$PUBLIC_REPO_URL"
    git checkout -b main
fi

# 2. Clean the temp directory (except .git)
echo "🧹 Cleaning old files in public repo..."
find . -maxdepth 1 -not -name '.git' -not -name '.' -not -name '..' -exec rm -rf {} +

# 3. Copy files from the private repo
echo "cp Copying files from private repo..."

# Define excludes
RSYNC_EXCLUDES=(
    "--exclude=.git"
    "--exclude=.env*"
    "--exclude=node_modules"
    "--exclude=.wrangler"
    "--exclude=.DS_Store"
    "--exclude=dist"
    # Private Content
    "--exclude=src/content/posts/diary"
    "--exclude=src/content/posts/private"
    "--exclude=private-*"
    # Development/Admin docs that shouldn't be public
    "--exclude=ADMIN_*"
    "--exclude=*_GUIDE.md" 
    "--exclude=REPO_STRUCTURE.md"
)

# Use rsync to copy
rsync -av "${RSYNC_EXCLUDES[@]}" "$CURRENT_DIR/" .

# 4. Create a dummy README.md for the diary folder to keep structure (optional)
mkdir -p src/content/posts/diary
echo "# Private Diary" > src/content/posts/diary/README.md
echo "This directory is a placeholder. Private content is not included in the template." >> src/content/posts/diary/README.md

# 5. Commit and Push
echo "📦 Committing changes..."
git add .

# Check if there are changes
if git diff --staged --quiet; then
    echo "✅ No changes to sync."
else
    git commit -m "chore: sync with main repo template $(date +'%Y-%m-%d')"
    echo " Pushing to public repo..."
    # Note: user needs to set up the remote repo first and have permissions
    # git push origin main 
    echo "⚠️  'git push origin main' is commented out for safety. Run it manually in $TEMP_DIR to verify first."
fi

echo "✅ Sync preparation complete!"
echo "👉 Go to $TEMP_DIR to verify and push."
