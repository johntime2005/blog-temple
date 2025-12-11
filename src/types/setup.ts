/**
 * 初始化向导相关的类型定义
 */

// 向导步骤枚举
export enum SetupStep {
	SiteInfo = 1,
	ProfileInfo = 2,
	ThemeConfig = 3,
}

// 网站基本信息
export interface SiteInfoData {
	siteUrl: string; // 网站 URL
	title: string; // 网站标题
	subtitle: string; // 网站副标题
	description: string; // 网站描述
	keywords: string; // 关键词（逗号分隔）
}

// 个人资料信息
export interface ProfileInfoData {
	name: string; // 名字/昵称
	bio: string; // 个人简介
	githubUsername?: string; // GitHub 用户名
	bilibiliUid?: string; // Bilibili UID
	bangumiUserId?: string; // Bangumi 用户 ID
}

// 主题配置信息
export interface ThemeConfigData {
	themeHue: number; // 主题色色相 (0-360)
}

// 完整的设置数据
export interface SetupData {
	siteInfo: SiteInfoData;
	profileInfo: ProfileInfoData;
	themeConfig: ThemeConfigData;
}

// API 响应类型
export interface GenerateConfigResponse {
	success: boolean;
	message?: string;
	downloadUrl?: string; // Blob URL for download
	files?: {
		[filename: string]: string; // filename -> content
	};
}

// 表单验证错误
export interface ValidationErrors {
	[field: string]: string;
}
