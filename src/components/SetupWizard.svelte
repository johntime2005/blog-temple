<script lang="ts">
import { onMount } from "svelte";
import type {
	ProfileInfoData,
	SetupData,
	SiteInfoData,
	ThemeConfigData,
	ValidationErrors,
} from "../types/setup";

let currentStep = 1;
let isLoading = false;
let errorMessage = "";

// 表单数据
let siteInfo: SiteInfoData = {
	siteUrl: "https://demo-firefly.netlify.app/",
	title: "",
	subtitle: "",
	description: "",
	keywords: "",
};

let profileInfo: ProfileInfoData = {
	name: "",
	bio: "",
	githubUsername: "",
	bilibiliUid: "",
	bangumiUserId: "",
};

let themeConfig: ThemeConfigData = {
	themeHue: 155,
};

// 验证错误
let errors: ValidationErrors = {};

// 验证单个步骤
function validateStep(step: number): boolean {
	errors = {};

	if (step === 1) {
		// 验证网站信息
		if (!siteInfo.siteUrl.trim()) {
			errors.siteUrl = "请输入网站 URL";
		} else if (!/^https?:\/\/.+/.test(siteInfo.siteUrl)) {
			errors.siteUrl = "URL 格式不正确（需要以 http:// 或 https:// 开头）";
		}

		if (!siteInfo.title.trim()) {
			errors.title = "请输入网站标题";
		}

		if (!siteInfo.subtitle.trim()) {
			errors.subtitle = "请输入网站副标题";
		}

		if (!siteInfo.description.trim()) {
			errors.description = "请输入网站描述";
		}
	} else if (step === 2) {
		// 验证个人信息
		if (!profileInfo.name.trim()) {
			errors.name = "请输入你的名字";
		}

		if (!profileInfo.bio.trim()) {
			errors.bio = "请输入个人简介";
		}
	} else if (step === 3) {
		// 验证主题配置
		if (themeConfig.themeHue < 0 || themeConfig.themeHue > 360) {
			errors.themeHue = "主题色相需要在 0-360 之间";
		}
	}

	return Object.keys(errors).length === 0;
}

// 下一步
function nextStep() {
	if (validateStep(currentStep)) {
		if (currentStep < 3) {
			currentStep++;
		}
	}
}

// 上一步
function prevStep() {
	if (currentStep > 1) {
		currentStep--;
		errors = {};
	}
}

// 提交配置
async function submitConfig() {
	if (!validateStep(3)) {
		return;
	}

	isLoading = true;
	errorMessage = "";

	try {
		// 确保 URL 以斜杠结尾
		const normalizedUrl = siteInfo.siteUrl.endsWith("/")
			? siteInfo.siteUrl
			: `${siteInfo.siteUrl}/`;

		const setupData: SetupData = {
			siteInfo: {
				...siteInfo,
				siteUrl: normalizedUrl,
			},
			profileInfo,
			themeConfig,
		};

		const response = await fetch("/api/generate-config", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(setupData),
		});

		if (!response.ok) {
			throw new Error("生成配置文件失败");
		}

		// 获取 blob 数据
		const blob = await response.blob();

		// 创建下载链接
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "firefly-config.zip";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);

		// 跳转到完成页面
		window.location.href = "/setup/complete/";
	} catch (error) {
		console.error("提交配置失败:", error);
		errorMessage = error instanceof Error ? error.message : "提交失败，请重试";
	} finally {
		isLoading = false;
	}
}

// 主题色预览
$: themeColorStyle = `hsl(${themeConfig.themeHue}, 60%, 60%)`;
</script>

<div class="setup-wizard max-w-3xl mx-auto p-6">
	<!-- 标题 -->
	<div class="text-center mb-8">
		<h1 class="text-4xl font-bold mb-2">🚀 欢迎使用 Firefly 博客</h1>
		<p class="text-neutral-400">让我们花几分钟时间配置你的个性化博客</p>
	</div>

	<!-- 步骤指示器 -->
	<div class="steps-indicator flex justify-center items-center mb-8 space-x-4">
		{#each [1, 2, 3] as step}
			<div class="flex items-center">
				<div
					class="step-circle w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all"
					class:active={currentStep === step}
					class:completed={currentStep > step}
				>
					{#if currentStep > step}
						✓
					{:else}
						{step}
					{/if}
				</div>
				{#if step < 3}
					<div class="step-line w-20 h-1 mx-2" class:completed={currentStep > step}></div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- 表单卡片 -->
	<div class="card p-8 rounded-2xl shadow-lg">
		{#if currentStep === 1}
			<!-- 步骤 1: 网站信息 -->
			<div class="step-content">
				<h2 class="text-2xl font-bold mb-6">📝 网站基本信息</h2>

				<div class="form-group mb-4">
					<label class="block text-sm font-medium mb-2">
						网站 URL <span class="text-red-500">*</span>
					</label>
					<input
						type="url"
						bind:value={siteInfo.siteUrl}
						placeholder="https://blog.example.com/"
						class="input-field w-full p-3 rounded-lg border"
						class:error={errors.siteUrl}
					/>
					{#if errors.siteUrl}
						<p class="text-red-500 text-sm mt-1">{errors.siteUrl}</p>
					{/if}
					<p class="text-neutral-400 text-sm mt-1">你的博客域名，部署到 Cloudflare 后会自动分配</p>
				</div>

				<div class="form-group mb-4">
					<label class="block text-sm font-medium mb-2">
						网站标题 <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						bind:value={siteInfo.title}
						placeholder="我的博客"
						class="input-field w-full p-3 rounded-lg border"
						class:error={errors.title}
					/>
					{#if errors.title}
						<p class="text-red-500 text-sm mt-1">{errors.title}</p>
					{/if}
				</div>

				<div class="form-group mb-4">
					<label class="block text-sm font-medium mb-2">
						网站副标题 <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						bind:value={siteInfo.subtitle}
						placeholder="记录生活，分享技术"
						class="input-field w-full p-3 rounded-lg border"
						class:error={errors.subtitle}
					/>
					{#if errors.subtitle}
						<p class="text-red-500 text-sm mt-1">{errors.subtitle}</p>
					{/if}
				</div>

				<div class="form-group mb-4">
					<label class="block text-sm font-medium mb-2">
						网站描述 <span class="text-red-500">*</span>
					</label>
					<textarea
						bind:value={siteInfo.description}
						placeholder="这是一个记录我的学习笔记、技术分享和生活随笔的博客"
						rows="3"
						class="input-field w-full p-3 rounded-lg border"
						class:error={errors.description}
					></textarea>
					{#if errors.description}
						<p class="text-red-500 text-sm mt-1">{errors.description}</p>
					{/if}
					<p class="text-neutral-400 text-sm mt-1">用于 SEO 优化，建议 50-160 字符</p>
				</div>

				<div class="form-group mb-4">
					<label class="block text-sm font-medium mb-2">
						关键词（可选）
					</label>
					<input
						type="text"
						bind:value={siteInfo.keywords}
						placeholder="个人博客, 技术, 生活, 旅行"
						class="input-field w-full p-3 rounded-lg border"
					/>
					<p class="text-neutral-400 text-sm mt-1">用逗号分隔，用于 SEO 优化</p>
				</div>
			</div>
		{:else if currentStep === 2}
			<!-- 步骤 2: 个人信息 -->
			<div class="step-content">
				<h2 class="text-2xl font-bold mb-6">👤 个人资料</h2>

				<div class="form-group mb-4">
					<label class="block text-sm font-medium mb-2">
						你的名字/昵称 <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						bind:value={profileInfo.name}
						placeholder="张三"
						class="input-field w-full p-3 rounded-lg border"
						class:error={errors.name}
					/>
					{#if errors.name}
						<p class="text-red-500 text-sm mt-1">{errors.name}</p>
					{/if}
				</div>

				<div class="form-group mb-4">
					<label class="block text-sm font-medium mb-2">
						个人简介 <span class="text-red-500">*</span>
					</label>
					<textarea
						bind:value={profileInfo.bio}
						placeholder="热爱技术，喜欢折腾，记录生活"
						rows="2"
						class="input-field w-full p-3 rounded-lg border"
						class:error={errors.bio}
					></textarea>
					{#if errors.bio}
						<p class="text-red-500 text-sm mt-1">{errors.bio}</p>
					{/if}
					<p class="text-neutral-400 text-sm mt-1">一句话介绍自己</p>
				</div>

				<div class="form-group mb-4">
					<label class="block text-sm font-medium mb-2">
						GitHub 用户名（可选）
					</label>
					<input
						type="text"
						bind:value={profileInfo.githubUsername}
						placeholder="octocat"
						class="input-field w-full p-3 rounded-lg border"
					/>
					<p class="text-neutral-400 text-sm mt-1">用于生成 GitHub 主页链接</p>
				</div>

				<div class="form-group mb-4">
					<label class="block text-sm font-medium mb-2">
						Bilibili UID（可选）
					</label>
					<input
						type="text"
						bind:value={profileInfo.bilibiliUid}
						placeholder="123456789"
						class="input-field w-full p-3 rounded-lg border"
					/>
					<p class="text-neutral-400 text-sm mt-1">你的 B 站个人空间 UID</p>
				</div>

				<div class="form-group mb-4">
					<label class="block text-sm font-medium mb-2">
						Bangumi 用户 ID（可选）
					</label>
					<input
						type="text"
						bind:value={profileInfo.bangumiUserId}
						placeholder="123456"
						class="input-field w-full p-3 rounded-lg border"
					/>
					<p class="text-neutral-400 text-sm mt-1">用于追番页面，留空可跳过</p>
				</div>
			</div>
		{:else if currentStep === 3}
			<!-- 步骤 3: 主题配置 -->
			<div class="step-content">
				<h2 class="text-2xl font-bold mb-6">🎨 主题配置</h2>

				<div class="form-group mb-6">
					<label class="block text-sm font-medium mb-2">
						主题色色相 <span class="text-red-500">*</span>
					</label>
					<div class="flex items-center space-x-4">
						<input
							type="range"
							min="0"
							max="360"
							step="1"
							bind:value={themeConfig.themeHue}
							class="flex-1"
						/>
						<input
							type="number"
							min="0"
							max="360"
							bind:value={themeConfig.themeHue}
							class="input-field w-20 p-2 rounded-lg border text-center"
							class:error={errors.themeHue}
						/>
					</div>
					{#if errors.themeHue}
						<p class="text-red-500 text-sm mt-1">{errors.themeHue}</p>
					{/if}
					<p class="text-neutral-400 text-sm mt-1">0=红色, 120=绿色, 240=蓝色</p>
				</div>

				<!-- 主题色预览 -->
				<div class="theme-preview p-6 rounded-xl border-2" style="border-color: {themeColorStyle};">
					<div class="flex items-center space-x-4">
						<div
							class="preview-circle w-16 h-16 rounded-full"
							style="background-color: {themeColorStyle};"
						></div>
						<div>
							<p class="font-bold text-lg">主题色预览</p>
							<p class="text-sm text-neutral-400">HSL({themeConfig.themeHue}, 60%, 60%)</p>
						</div>
					</div>
				</div>

				<!-- 常用主题色快捷选择 -->
				<div class="mt-6">
					<p class="text-sm font-medium mb-3">常用主题色:</p>
					<div class="flex flex-wrap gap-3">
						{#each [
							{ name: '红色', hue: 0 },
							{ name: '橙色', hue: 30 },
							{ name: '黄色', hue: 60 },
							{ name: '绿色', hue: 120 },
							{ name: '青色', hue: 180 },
							{ name: '蓝色', hue: 240 },
							{ name: '紫色', hue: 270 },
							{ name: '粉色', hue: 330 }
						] as preset}
							<button
								type="button"
								on:click={() => themeConfig.themeHue = preset.hue}
								class="preset-btn px-4 py-2 rounded-lg border transition-all"
								class:active={themeConfig.themeHue === preset.hue}
								style="border-color: hsl({preset.hue}, 60%, 60%);"
							>
								<span
									class="inline-block w-4 h-4 rounded-full mr-2"
									style="background-color: hsl({preset.hue}, 60%, 60%);"
								></span>
								{preset.name}
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- 错误消息 -->
		{#if errorMessage}
			<div class="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mt-4">
				{errorMessage}
			</div>
		{/if}

		<!-- 导航按钮 -->
		<div class="flex justify-between mt-8">
			<button
				type="button"
				on:click={prevStep}
				class="btn-secondary px-6 py-3 rounded-lg font-medium transition-all"
				disabled={currentStep === 1}
			>
				← 上一步
			</button>

			{#if currentStep < 3}
				<button
					type="button"
					on:click={nextStep}
					class="btn-primary px-6 py-3 rounded-lg font-medium transition-all"
				>
					下一步 →
				</button>
			{:else}
				<button
					type="button"
					on:click={submitConfig}
					class="btn-primary px-6 py-3 rounded-lg font-medium transition-all"
					disabled={isLoading}
				>
					{#if isLoading}
						⏳ 生成中...
					{:else}
						✓ 生成配置文件
					{/if}
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.card {
		background: var(--card-bg);
		border: 1px solid var(--line-divider);
	}

	.step-circle {
		background: var(--card-bg);
		border: 2px solid var(--line-divider);
		color: var(--text-secondary);
	}

	.step-circle.active {
		background: var(--primary);
		border-color: var(--primary);
		color: white;
		transform: scale(1.1);
	}

	.step-circle.completed {
		background: var(--primary);
		border-color: var(--primary);
		color: white;
	}

	.step-line {
		background: var(--line-divider);
	}

	.step-line.completed {
		background: var(--primary);
	}

	.input-field {
		background: var(--card-bg);
		border-color: var(--line-divider);
		color: var(--text-primary);
		transition: all 0.3s;
	}

	.input-field:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 10%, transparent);
	}

	.input-field.error {
		border-color: #ef4444;
	}

	.btn-primary {
		background: var(--primary);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: transparent;
		border: 1px solid var(--line-divider);
		color: var(--text-primary);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--card-bg);
	}

	.btn-secondary:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.preset-btn {
		background: var(--card-bg);
	}

	.preset-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.preset-btn.active {
		background: var(--primary);
		color: white;
		border-color: var(--primary) !important;
	}

	.theme-preview {
		background: var(--card-bg);
	}
</style>
