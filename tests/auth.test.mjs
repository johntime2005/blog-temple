/**
 * 认证链路端到端测试
 *
 * 用真实的 wrangler pages dev（Pages Functions 运行时）跑通认证各分支：
 *   1. GET /auth/login          → 302 GitHub、Set-Cookie oauth_state
 *   2. /auth/callback 的 state/CSRF 各失败分支（无 cookie、不匹配、伪造签名、过期）
 *   3. 未登录 / 无效 token 访问 /api/auth/key   → 拒绝
 *   4. 站长 session               → 发键、密钥与构建端派生一致、清单可解密（端到端）
 *   5. 普通用户 session           → 403 拒绝
 *   6. /api/auth/verify、current-user、logout、session 失效链路
 *
 * 不伪造 OAuth 响应：GitHub code 交换无法离线完成，涉及真实 GitHub 的
 * 「登录成功」最后一步需要线上配置后人工验证（见任务报告）。
 * 测试中的 session 记录是直接写入本地 KV 的测试数据准备，
 * 与生产 callback 写入的结构完全一致。
 *
 * 运行：node tests/auth.test.mjs
 * 前置：dist/ 已用 GITHUB_CLIENT_SECRET=<TEST_SECRET> 构建（脚本会校验）
 */

import assert from "node:assert/strict";
import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { setTimeout as sleep } from "node:timers/promises";

const require = createRequire(import.meta.url);
const CryptoJS = require("crypto-js");

const PORT = 8791;
const BASE = `http://127.0.0.1:${PORT}`;
const TEST_SECRET = "firefly-test-secret";
const OWNER = "johntime2005";
const PERSIST_DIR = "tests/.wrangler-state";
const MANIFEST_SLUG = "system:private-manifest";

// ── 工具 ──────────────────────────────────────────────────

async function hmacSha256Hex(secret, message) {
	const { createHmac } = await import("node:crypto");
	return createHmac("sha256", secret).update(message).digest("hex");
}

function kvPut(key, value, ttlSeconds) {
	const ttl = ttlSeconds ? `--ttl ${ttlSeconds}` : "";
	execSync(
		`npx wrangler kv key put ${JSON.stringify(key)} ${JSON.stringify(value)} --namespace-id POST_ENCRYPTION --local --persist-to ${PERSIST_DIR} ${ttl}`,
		{ stdio: "pipe" },
	);
}

// kv put 触碰 persist 目录会让 dev server 短暂重载，写完后等它恢复可用
async function kvSettle() {
	await sleep(800);
	await waitForServer(20000);
}

async function waitForServer(timeoutMs = 60000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${BASE}/api/auth/verify/`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token: "" }),
			});
			if (res.status < 500) return;
		} catch {
			// 未就绪
		}
		await sleep(500);
	}
	throw new Error("wrangler pages dev 启动超时");
}

function getSetCookies(res) {
	return res.headers.getSetCookie ? res.headers.getSetCookie() : [];
}

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
	try {
		await fn();
		passed++;
		console.log(`  ✅ ${name}`);
	} catch (err) {
		failed++;
		failures.push({ name, err });
		console.error(`  ❌ ${name}\n     ${err.message}`);
	}
}

// ── 前置校验 ──────────────────────────────────────────────

if (!existsSync("dist/index.html")) {
	console.error(
		"dist/ 不存在，请先构建：GITHUB_CLIENT_SECRET=firefly-test-secret pnpm build",
	);
	process.exit(1);
}

// 清单必须是用 TEST_SECRET 构建出来的，否则端到端解密无从谈起
const manifestRaw = JSON.parse(
	readFileSync("dist/api/private-manifest.json", "utf8"),
);
if (!manifestRaw.data) {
	console.error(
		"dist/api/private-manifest.json 无密文（构建时未设置加密主密钥）。\n请用 GITHUB_CLIENT_SECRET=firefly-test-secret pnpm build 重新构建。",
	);
	process.exit(1);
}

// ── 启动本地 Pages 运行时 ─────────────────────────────────

rmSync(PERSIST_DIR, { recursive: true, force: true });

const wrangler = spawn(
	"npx",
	[
		"wrangler",
		"pages",
		"dev",
		"dist",
		"--port",
		String(PORT),
		"--kv",
		"POST_ENCRYPTION",
		"--persist-to",
		PERSIST_DIR,
		"--binding",
		`GITHUB_CLIENT_SECRET=${TEST_SECRET}`,
		"--binding",
		"GITHUB_CLIENT_ID=test-client-id",
		"--binding",
		`GITHUB_OWNER_USERNAME=${OWNER}`,
		"--binding",
		"ADMIN_PASSWORD=test-admin-pass",
		"--compatibility-date",
		"2025-11-18",
	],
	{ stdio: ["ignore", "pipe", "pipe"], detached: true },
);

let wranglerLog = "";
wrangler.stdout.on("data", (d) => {
	wranglerLog += d;
});
wrangler.stderr.on("data", (d) => {
	wranglerLog += d;
});

function cleanup() {
	try {
		process.kill(-wrangler.pid, "SIGTERM");
	} catch {}
}
process.on("exit", cleanup);
process.on("SIGINT", () => {
	cleanup();
	process.exit(130);
});

try {
	await waitForServer();
	console.log("wrangler pages dev 已就绪\n");

	// ══ 1. OAuth 授权入口 ══════════════════════════════════
	console.log("── OAuth 授权入口 ──");

	let savedState = "";

	await test("GET /auth/login → 302 GitHub 并携带 state/redirect_uri", async () => {
		const res = await fetch(`${BASE}/auth/login?redirect=/posts/x/`, {
			redirect: "manual",
		});
		assert.equal(res.status, 302);
		const loc = new URL(res.headers.get("location"));
		assert.equal(loc.hostname, "github.com");
		assert.equal(loc.pathname, "/login/oauth/authorize");
		assert.equal(loc.searchParams.get("client_id"), "test-client-id");
		assert.ok(loc.searchParams.get("state"));
		assert.ok(loc.searchParams.get("redirect_uri").endsWith("/auth/callback/"));

		const cookies = getSetCookies(res);
		const stateCookie = cookies.find((c) => c.startsWith("oauth_state="));
		assert.ok(stateCookie, "缺少 oauth_state cookie");
		assert.match(stateCookie, /HttpOnly/i);
		assert.match(stateCookie, /SameSite=Lax/i);
		savedState = decodeURIComponent(
			stateCookie.split(";")[0].split("=").slice(1).join("="),
		);
		assert.equal(loc.searchParams.get("state"), savedState);

		const redirectCookie = cookies.find((c) => c.startsWith("auth_redirect="));
		assert.ok(redirectCookie?.includes("%2Fposts%2Fx%2F"));
	});

	await test("GET /auth → 302 /auth/login/（保留 redirect）", async () => {
		const res = await fetch(`${BASE}/auth?redirect=/posts/x/`, {
			redirect: "manual",
		});
		assert.equal(res.status, 302);
		assert.ok(res.headers.get("location").includes("/auth/login/"));
	});

	await test("open redirect 防护：外站 redirect 被重置为 /", async () => {
		const res = await fetch(
			`${BASE}/auth/login?redirect=${encodeURIComponent("https://evil.example")}`,
			{ redirect: "manual" },
		);
		const cookies = getSetCookies(res);
		const redirectCookie = cookies.find((c) => c.startsWith("auth_redirect="));
		assert.ok(redirectCookie.startsWith("auth_redirect=%2F;"));
	});

	// ══ 2. Callback state/CSRF 校验 ═══════════════════════
	console.log("\n── OAuth 回调 state/CSRF 校验 ──");

	await test("无 state cookie → 403", async () => {
		const res = await fetch(
			`${BASE}/auth/callback?code=x&state=${encodeURIComponent(savedState)}`,
			{ redirect: "manual" },
		);
		assert.equal(res.status, 403);
	});

	await test("state 参数与 cookie 不匹配 → 403", async () => {
		const res = await fetch(`${BASE}/auth/callback?code=x&state=tampered`, {
			redirect: "manual",
			headers: { Cookie: `oauth_state=${encodeURIComponent(savedState)}` },
		});
		assert.equal(res.status, 403);
	});

	await test("伪造签名的 state → 403", async () => {
		const forged = `${Date.now()}.deadbeef.${"0".repeat(64)}`;
		const res = await fetch(
			`${BASE}/auth/callback?code=x&state=${encodeURIComponent(forged)}`,
			{
				redirect: "manual",
				headers: { Cookie: `oauth_state=${encodeURIComponent(forged)}` },
			},
		);
		assert.equal(res.status, 403);
	});

	await test("过期的 state（签名正确但超时）→ 403", async () => {
		const staleTs = Date.now() - 11 * 60 * 1000;
		const payload = `${staleTs}.cafebabe`;
		const sig = await hmacSha256Hex(TEST_SECRET, payload);
		const stale = `${payload}.${sig}`;
		const res = await fetch(
			`${BASE}/auth/callback?code=x&state=${encodeURIComponent(stale)}`,
			{
				redirect: "manual",
				headers: { Cookie: `oauth_state=${encodeURIComponent(stale)}` },
			},
		);
		assert.equal(res.status, 403);
	});

	await test("用户拒绝授权（error=access_denied）→ 400 友好页", async () => {
		const res = await fetch(`${BASE}/auth/callback?error=access_denied`, {
			redirect: "manual",
		});
		assert.equal(res.status, 400);
		const html = await res.text();
		assert.ok(html.includes("取消了 GitHub 授权"));
	});

	// ══ 3. 未登录 / 无效凭证 ══════════════════════════════
	console.log("\n── 未登录与无效凭证 ──");

	await test("key：缺少 token → 400", async () => {
		const res = await fetch(`${BASE}/api/auth/key/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: "", slug: "diary/x" }),
		});
		assert.equal(res.status, 400);
	});

	await test("key：无效 token（KV 未命中 + GitHub 拒绝）→ 401", async () => {
		const res = await fetch(`${BASE}/api/auth/key/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: "not-a-real-token", slug: "diary/x" }),
		});
		assert.equal(res.status, 401);
		const data = await res.json();
		assert.equal(data.valid, false);
	});

	await test("verify：无效 token → valid:false", async () => {
		const res = await fetch(`${BASE}/api/auth/verify/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: "not-a-real-token" }),
		});
		const data = await res.json();
		assert.equal(data.valid, false);
	});

	await test("current-user：无凭证 → authenticated:false", async () => {
		const res = await fetch(`${BASE}/api/auth/current-user`);
		const data = await res.json();
		assert.equal(data.authenticated, false);
	});

	await test("私密清单静态文件公开可取但为密文", async () => {
		const res = await fetch(`${BASE}/api/private-manifest.json`);
		assert.equal(res.status, 200);
		const body = await res.json();
		assert.ok(body.data);
		assert.throws(() => JSON.parse(body.data), "密文不应是可解析的明文 JSON");
		assert.ok(!body.data.includes("diary/"), "密文不应包含明文路径");
	});

	// ══ 4. 站长 session（管理员访问） ═════════════════════
	console.log("\n── 站长 session ──");

	const ADMIN_TOKEN = "a".repeat(64);
	kvPut(
		`session:${ADMIN_TOKEN}`,
		JSON.stringify({
			username: OWNER,
			role: "admin",
			githubToken: "gho_localtest",
			provider: "github",
			createdAt: new Date().toISOString(),
		}),
	);
	await kvSettle();

	await test("verify：admin session → valid + username + role", async () => {
		const res = await fetch(`${BASE}/api/auth/verify/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: ADMIN_TOKEN }),
		});
		const data = await res.json();
		assert.equal(data.valid, true);
		assert.equal(data.username, OWNER);
		assert.equal(data.role, "admin");
	});

	await test("current-user：Bearer session → 用户信息", async () => {
		const res = await fetch(`${BASE}/api/auth/current-user`, {
			headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
		});
		const data = await res.json();
		assert.equal(data.authenticated, true);
		assert.equal(data.user.username, OWNER);
		assert.equal(data.user.role, "admin");
	});

	await test("current-user：blog_session cookie 也可认证", async () => {
		const res = await fetch(`${BASE}/api/auth/current-user`, {
			headers: { Cookie: `blog_session=${ADMIN_TOKEN}` },
		});
		const data = await res.json();
		assert.equal(data.authenticated, true);
	});

	let manifestKey = "";
	await test("key：admin session → 发键，且与构建端派生一致", async () => {
		const res = await fetch(`${BASE}/api/auth/key/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: ADMIN_TOKEN, slug: MANIFEST_SLUG }),
		});
		assert.equal(res.status, 200);
		const data = await res.json();
		assert.equal(data.valid, true);
		const expected = await hmacSha256Hex(TEST_SECRET, MANIFEST_SLUG);
		assert.equal(data.key, expected, "运行时派生密钥与构建端不一致");
		manifestKey = data.key;
	});

	await test("端到端：用发下来的密钥解开构建期加密清单", async () => {
		const bytes = CryptoJS.AES.decrypt(manifestRaw.data, manifestKey);
		const plaintext = bytes.toString(CryptoJS.enc.Utf8);
		assert.ok(plaintext, "解密结果为空");
		const posts = JSON.parse(plaintext);
		assert.ok(Array.isArray(posts));
		assert.ok(posts.length > 0, "清单为空");
		assert.ok(posts[0].data.title, "清单条目缺少标题");
	});

	await test("key：admin session 对文章 slug 同样发键", async () => {
		const slug = "diary/2026-3-13-随笔";
		const res = await fetch(`${BASE}/api/auth/key/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: ADMIN_TOKEN, slug }),
		});
		const data = await res.json();
		assert.equal(data.valid, true);
		assert.equal(data.key, await hmacSha256Hex(TEST_SECRET, slug));
	});

	// ══ 5. 普通用户拒绝 ═══════════════════════════════════
	console.log("\n── 普通用户 ──");

	const USER_TOKEN = "b".repeat(64);
	kvPut(
		`session:${USER_TOKEN}`,
		JSON.stringify({
			username: "some-visitor",
			role: "user",
			provider: "github",
			createdAt: new Date().toISOString(),
		}),
	);
	await kvSettle();

	await test("verify：user session → valid 但 role=user", async () => {
		const res = await fetch(`${BASE}/api/auth/verify/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: USER_TOKEN }),
		});
		const data = await res.json();
		assert.equal(data.valid, true);
		assert.equal(data.role, "user");
	});

	await test("key：user session → 403 仅站长", async () => {
		const res = await fetch(`${BASE}/api/auth/key/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: USER_TOKEN, slug: MANIFEST_SLUG }),
		});
		assert.equal(res.status, 403);
		const data = await res.json();
		assert.equal(data.valid, false);
	});

	// ══ 5.5 统一管理员鉴权（/api/admin/* 中间件） ═════════
	console.log("\n── 统一管理员鉴权 ──");

	await test("admin API：无凭证 → 401（中间件拒绝）", async () => {
		const res = await fetch(`${BASE}/api/admin/categories`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "list" }),
		});
		assert.equal(res.status, 401);
	});

	await test("admin API：普通用户 session → 401", async () => {
		const res = await fetch(`${BASE}/api/admin/categories`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "list", token: USER_TOKEN }),
		});
		assert.equal(res.status, 401);
	});

	await test("admin API：OAuth admin session（body token）→ 200", async () => {
		const res = await fetch(`${BASE}/api/admin/categories`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "list", token: ADMIN_TOKEN }),
		});
		assert.equal(res.status, 200);
		const data = await res.json();
		assert.equal(data.success, true);
	});

	await test("admin API：OAuth admin session（Bearer）→ 200", async () => {
		const res = await fetch(`${BASE}/api/admin/categories`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${ADMIN_TOKEN}`,
			},
			body: JSON.stringify({ action: "list" }),
		});
		assert.equal(res.status, 200);
	});

	let passwordAdminToken = "";
	await test("ADMIN_PASSWORD 登录 → 发放管理 token", async () => {
		const res = await fetch(`${BASE}/api/admin/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password: "test-admin-pass" }),
		});
		assert.equal(res.status, 200);
		const data = await res.json();
		assert.ok(data.data.token);
		passwordAdminToken = data.data.token;
	});

	await test("管理 token 调 admin API → 200（统一层识别）", async () => {
		const res = await fetch(`${BASE}/api/admin/categories`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "list", token: passwordAdminToken }),
		});
		assert.equal(res.status, 200);
	});

	await test("verify 也认管理 token → valid + role=admin", async () => {
		const res = await fetch(`${BASE}/api/auth/verify/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: passwordAdminToken }),
		});
		const data = await res.json();
		assert.equal(data.valid, true);
		assert.equal(data.role, "admin");
	});

	await test("ADMIN_PASSWORD 错误密码 → 401", async () => {
		const res = await fetch(`${BASE}/api/admin/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password: "wrong-pass" }),
		});
		assert.equal(res.status, 401);
	});

	// ── 密码管理与分享链路（KV 全真） ──
	let generatedPassword = "";
	await test("manage-passwords generate → 返回强密码", async () => {
		const res = await fetch(`${BASE}/api/admin/manage-passwords`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				action: "generate",
				token: ADMIN_TOKEN,
				encryptionId: "test-enc-id",
			}),
		});
		assert.equal(res.status, 200);
		const data = await res.json();
		assert.equal(data.success, true);
		assert.ok(data.password?.length >= 16);
		generatedPassword = data.password;
	});

	await test("get-password → 取回同一明文", async () => {
		const res = await fetch(`${BASE}/api/admin/get-password`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: ADMIN_TOKEN, encryptionId: "test-enc-id" }),
		});
		assert.equal(res.status, 200);
		const data = await res.json();
		assert.equal(data.password, generatedPassword);
	});

	await test("verify-password 用生成的密码换密钥（密码解锁链路）", async () => {
		const res = await fetch(`${BASE}/api/verify-password`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				encryptionId: "test-enc-id",
				postSlug: "diary/test-post",
				password: generatedPassword,
			}),
		});
		const data = await res.json();
		assert.equal(data.success, true);
		assert.equal(
			data.token,
			await hmacSha256Hex(TEST_SECRET, "diary/test-post"),
		);
	});

	await test("manage-passwords list 包含刚生成的条目", async () => {
		const res = await fetch(`${BASE}/api/admin/manage-passwords`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "list", token: ADMIN_TOKEN }),
		});
		const data = await res.json();
		assert.ok(data.passwords.some((x) => x.encryptionId === "test-enc-id"));
	});

	await test("manage-passwords delete → 密码与明文一并清除", async () => {
		const res = await fetch(`${BASE}/api/admin/manage-passwords`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				action: "delete",
				token: ADMIN_TOKEN,
				encryptionId: "test-enc-id",
			}),
		});
		assert.equal((await res.json()).success, true);
		const check = await fetch(`${BASE}/api/admin/get-password`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: ADMIN_TOKEN, encryptionId: "test-enc-id" }),
		});
		assert.equal(check.status, 404);
	});

	await test("share/create（admin）→ 分享 token 可经 key 换取解密密钥", async () => {
		const res = await fetch(`${BASE}/api/share/create`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				token: ADMIN_TOKEN,
				slug: "diary/shared-post",
				expiresInMinutes: 5,
			}),
		});
		assert.equal(res.status, 200);
		const data = await res.json();
		assert.ok(data.password);

		const keyRes = await fetch(`${BASE}/api/auth/key/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				token: `share:${data.password}`,
				slug: "diary/shared-post",
			}),
		});
		const keyData = await keyRes.json();
		assert.equal(keyData.valid, true);
		assert.equal(
			keyData.key,
			await hmacSha256Hex(TEST_SECRET, "diary/shared-post"),
		);
	});

	await test("share/create：普通用户 → 401", async () => {
		const res = await fetch(`${BASE}/api/share/create`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: USER_TOKEN, slug: "diary/x" }),
		});
		assert.equal(res.status, 401);
	});

	// ══ 6. 登出与 session 失效 ════════════════════════════
	console.log("\n── 登出与 session 失效 ──");

	await test("logout → success 并清除 cookie", async () => {
		const res = await fetch(`${BASE}/api/auth/logout/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: ADMIN_TOKEN }),
		});
		assert.equal(res.status, 200);
		const cookies = getSetCookies(res);
		assert.ok(
			cookies.some(
				(c) => c.startsWith("blog_session=") && c.includes("Max-Age=0"),
			),
			"应下发清除 cookie",
		);
	});

	await test("登出后 session 立即失效（verify → false）", async () => {
		const res = await fetch(`${BASE}/api/auth/verify/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: ADMIN_TOKEN }),
		});
		const data = await res.json();
		assert.equal(data.valid, false);
	});

	await test("登出后 key 请求被拒绝", async () => {
		const res = await fetch(`${BASE}/api/auth/key/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: ADMIN_TOKEN, slug: MANIFEST_SLUG }),
		});
		assert.notEqual(res.status, 200);
	});

	// ══ 7. 公开产物泄漏回归 ═══════════════════════════════
	console.log("\n── 公开产物泄漏回归 ──");

	// 受保护集合 = 加密清单里的全部 id（含 frontmatter 声明为
	// private/encrypted/非公开访问级别的文章）；公开 JSON 与其交集必须为空。
	// 注意：frontmatter 明确声明 public 的日记不在受保护集合内。
	let privateIds = new Set();
	await test("从清单提取受保护文章集合", async () => {
		const bytes = CryptoJS.AES.decrypt(manifestRaw.data, manifestKey);
		const posts = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
		privateIds = new Set(posts.map((p) => p.id));
		assert.ok(privateIds.size > 0);
	});

	await test("allPostMeta.json 与受保护集合无交集", async () => {
		const res = await fetch(`${BASE}/api/allPostMeta.json`);
		const data = await res.json();
		const leaked = data.filter((p) => privateIds.has(p.id));
		assert.deepEqual(
			leaked.map((p) => p.id),
			[],
			"公开元数据泄漏了受保护文章",
		);
	});

	await test("calendar.json 与受保护集合无交集", async () => {
		const res = await fetch(`${BASE}/api/calendar.json`);
		const data = await res.json();
		const leaked = data.filter((p) => privateIds.has(p.id));
		assert.deepEqual(
			leaked.map((p) => p.id),
			[],
			"公开日历泄漏了受保护文章",
		);
	});

	await test("CMS 配置 /admin/config.yml 已静态化可访问", async () => {
		const res = await fetch(`${BASE}/admin/config.yml`);
		assert.equal(res.status, 200);
		const yml = await res.text();
		assert.ok(yml.includes("auth_endpoint: /auth/login/"));
		assert.ok(yml.includes("base_url: https://blog.johntime.top"));
	});
} finally {
	cleanup();
}

console.log(`\n══ 结果：${passed} 通过，${failed} 失败 ══`);
if (failed > 0) {
	console.error("\nwrangler 日志尾部：\n" + wranglerLog.slice(-2000));
	process.exit(1);
}
process.exit(0);
