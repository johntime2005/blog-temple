# ☁️ Cloudflare R2 Image Hosting Guide

To keep your **Private Content** (Diary) strictly private and lightweight, do **NOT** commit images to this repository. Instead, host them on Cloudflare R2.

## 1. Why R2?
- **Privacy**: Images are not in the git history.
- **Performance**: Served via Cloudflare's global network.
- **Cost**: Generous free tier (10GB storage, free egress).

## 2. Setup (One-Time)

1.  **Create Bucket**:
    - Go to Cloudflare Dashboard > **R2**.
    - Click **Create Bucket**.
    - Name it: `blog-images` (or similar).
    - Location: Auto.

2.  **Enable Public Access**:
    - Click on your new bucket `blog-images`.
    - Go to **Settings** tab.
    - Scroll to **Public Access**.
    - **Option A (Easy)**: Click "Allow Access" under **R2.dev subdomain**. Copy the Public URL (e.g., `https://pub-xxxx.r2.dev`).
    - **Option B (Custom Domain)**: Connect a subdomain like `img.yourblog.com` if you have one on Cloudflare.

## 3. Daily Workflow

### Visual Studio Code Extension (Recommended)
Use an extension like **PicGo** or **uPic** to drag-and-drop images directly into Markdown.

#### Config for PicGo (example):
- **Type**: S3 / AWS S3
- **Bucket**: `blog-images`
- **Region**: `auto`
- **Endpoint**: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
    - *Find Account ID in Cloudflare Dashboard URL or Sidebar.*
- **Access Key / Secret Key**:
    - R2 Dashboard > **Manage R2 API Tokens** > **Create Token**.
    - Permission: **Admin Read & Write**.
- **Custom Domain**: Your R2.dev URL or Custom Domain.

### Manual Method
1.  Go to R2 Dashboard > `blog-images` bucket.
2.  Click **Upload**.
3.  Select your image.
4.  Click the uploaded file to get the **Public URL**.
5.  In your Markdown diary:
    ```markdown
    ![My Memory](https://pub-xxxx.r2.dev/my-photo.jpg)
    ```

## 4. Migration Rules
- **✅ Tutorials**: Put images in `src/content/posts/tutorials/images/` (Synced to Public Repo).
- **🔒 Diary**: Upload to **Cloudflare R2** (Never commit to Git).
