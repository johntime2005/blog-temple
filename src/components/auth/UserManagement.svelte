<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount } from "svelte";

interface Props {
	adminToken?: string; // 管理员token（可选，会从localStorage读取）
}

let { adminToken: initialAdminToken = "" }: Props = $props();

// 状态管理 - adminToken
let adminToken = $state(initialAdminToken);

// 组件挂载时从localStorage读取token
onMount(() => {
	if (!adminToken) {
		const storedToken = localStorage.getItem("admin-token");
		if (storedToken) {
			adminToken = storedToken;
		}
	}
});

// 状态管理
let username = $state("");
let password = $state("");
let confirmPassword = $state("");
let email = $state("");
let isLoading = $state(false);
let errorMessage = $state("");
let successMessage = $state("");
let showPassword = $state(false);

// 处理用户创建
async function handleCreateUser(e: Event) {
	e.preventDefault();
	errorMessage = "";
	successMessage = "";

	// 验证输入
	if (!username.trim() || !password.trim()) {
		errorMessage = "用户名和密码不能为空";
		return;
	}

	if (password !== confirmPassword) {
		errorMessage = "两次输入的密码不一致";
		return;
	}

	if (password.length < 6) {
		errorMessage = "密码长度至少为6个字符";
		return;
	}

	if (username.length < 3 || username.length > 20) {
		errorMessage = "用户名长度必须在3-20个字符之间";
		return;
	}

	if (!/^[a-zA-Z0-9_]+$/.test(username)) {
		errorMessage = "用户名只能包含字母、数字和下划线";
		return;
	}

	isLoading = true;

	try {
		const response = await fetch("/api/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				username,
				password,
				email: email.trim() || undefined,
				adminToken,
			}),
		});

		const data = await response.json();

		if (data.success) {
			successMessage = `用户 ${data.username} 创建成功！`;
			// 清空表单
			username = "";
			password = "";
			confirmPassword = "";
			email = "";
		} else {
			errorMessage = data.message || "创建用户失败";
		}
	} catch (error) {
		console.error("Create user error:", error);
		errorMessage = "创建用户失败，请稍后重试";
	} finally {
		isLoading = false;
	}
}

// 生成随机密码
function generatePassword() {
	const chars =
		"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
	let pass = "";
	for (let i = 0; i < 12; i++) {
		pass += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	password = pass;
	confirmPassword = pass;
	showPassword = true;
}
</script>

<div class="user-management">
	<div class="section-header">
		<Icon icon="mdi:account-plus" />
		<h2>创建新用户</h2>
	</div>

	<form class="create-user-form" onsubmit={handleCreateUser}>
		{#if errorMessage}
			<div class="message error-message">
				<Icon icon="mdi:alert-circle" />
				<span>{errorMessage}</span>
			</div>
		{/if}

		{#if successMessage}
			<div class="message success-message">
				<Icon icon="mdi:check-circle" />
				<span>{successMessage}</span>
			</div>
		{/if}

		<div class="form-row">
			<div class="form-group">
				<label for="new-username">
					<Icon icon="mdi:account" />
					<span>用户名 *</span>
				</label>
				<input
					type="text"
					id="new-username"
					bind:value={username}
					placeholder="3-20个字符，仅字母数字下划线"
					disabled={isLoading}
					autocomplete="off"
				/>
			</div>

			<div class="form-group">
				<label for="new-email">
					<Icon icon="mdi:email" />
					<span>邮箱（可选）</span>
				</label>
				<input
					type="email"
					id="new-email"
					bind:value={email}
					placeholder="user@example.com"
					disabled={isLoading}
					autocomplete="off"
				/>
			</div>
		</div>

		<div class="form-row">
			<div class="form-group">
				<label for="new-password">
					<Icon icon="mdi:lock" />
					<span>密码 *</span>
				</label>
				<div class="password-input">
					<input
						type={showPassword ? 'text' : 'password'}
						id="new-password"
						bind:value={password}
						placeholder="至少6个字符"
						disabled={isLoading}
						autocomplete="new-password"
					/>
					<button
						type="button"
						class="toggle-password"
						onclick={() => (showPassword = !showPassword)}
						disabled={isLoading}
					>
						<Icon icon={showPassword ? 'mdi:eye-off' : 'mdi:eye'} />
					</button>
				</div>
			</div>

			<div class="form-group">
				<label for="confirm-password">
					<Icon icon="mdi:lock-check" />
					<span>确认密码 *</span>
				</label>
				<input
					type={showPassword ? 'text' : 'password'}
					id="confirm-password"
					bind:value={confirmPassword}
					placeholder="再次输入密码"
					disabled={isLoading}
					autocomplete="new-password"
				/>
			</div>
		</div>

		<div class="form-actions">
			<button
				type="button"
				class="generate-password-btn"
				onclick={generatePassword}
				disabled={isLoading}
			>
				<Icon icon="mdi:key-variant" />
				<span>生成随机密码</span>
			</button>

			<button type="submit" class="submit-btn" disabled={isLoading}>
				{#if isLoading}
					<Icon icon="mdi:loading" class="spinning" />
					<span>创建中...</span>
				{:else}
					<Icon icon="mdi:account-plus" />
					<span>创建用户</span>
				{/if}
			</button>
		</div>
	</form>
</div>

<style>
	.user-management {
		background: var(--card-bg);
		border-radius: 12px;
		padding: 2rem;
		margin-bottom: 2rem;
		box-shadow: var(--shadow-md);
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid var(--line-divider);
	}

	.section-header :global(svg) {
		font-size: 1.75rem;
		color: var(--primary);
	}

	.section-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-color);
	}

	.create-user-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		font-size: 0.875rem;
	}

	.message :global(svg) {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.error-message {
		background: rgba(239, 68, 68, 0.1);
		color: rgb(239, 68, 68);
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	.success-message {
		background: rgba(34, 197, 94, 0.1);
		color: rgb(34, 197, 94);
		border: 1px solid rgba(34, 197, 94, 0.2);
	}

	.form-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
	}

	.form-group label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 0.5rem;
		color: var(--text-color);
	}

	.form-group label :global(svg) {
		font-size: 1.125rem;
		opacity: 0.7;
	}

	.form-group input {
		padding: 0.75rem 1rem;
		border: 2px solid var(--line-divider);
		border-radius: 8px;
		background: var(--page-bg);
		color: var(--text-color);
		font-size: 0.875rem;
		transition: all 0.2s ease;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
	}

	.form-group input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.password-input {
		position: relative;
		display: flex;
		align-items: center;
	}

	.password-input input {
		flex: 1;
		padding-right: 3rem;
	}

	.toggle-password {
		position: absolute;
		right: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: transparent;
		border: none;
		color: var(--text-color);
		opacity: 0.6;
		cursor: pointer;
		transition: opacity 0.2s ease;
	}

	.toggle-password:hover:not(:disabled) {
		opacity: 1;
	}

	.toggle-password :global(svg) {
		font-size: 1.25rem;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.form-actions button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.form-actions button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.generate-password-btn {
		background: var(--card-bg);
		color: var(--text-color);
		border: 2px solid var(--line-divider) !important;
	}

	.generate-password-btn:hover:not(:disabled) {
		background: var(--page-bg);
		border-color: var(--primary) !important;
	}

	.submit-btn {
		background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
		color: white;
		flex: 1;
		min-width: 200px;
	}

	.submit-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.4);
	}

	.submit-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	:global(.spinning) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
