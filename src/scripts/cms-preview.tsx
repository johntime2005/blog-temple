import katex from "katex"; // Import katex instance
import React, { Component } from "react";
import { createRoot, type Root } from "react-dom/client";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm"; // Added for tables
import remarkMath from "remark-math";
import "katex/dist/contrib/mhchem.mjs"; // Auto-registers with katex

// We can't rely on global import of CSS for the iframe, so we don't import css here directly
// or if we do, it affects the parent. We need to inject it into the iframe.

// --- Types ---

interface PreviewProps {
	entry: any; // Immutable.js object
	widgetFor: (name: string) => any;
	getAsset: (asset: string) => any;
}

// --- The Actual Content Component (Safe Zone) ---

const PostPreviewContent: React.FC<PreviewProps> = ({ entry, getAsset }) => {
	const data = entry.getIn(["data"])?.toJS() || {};
	const { title, published, description, body, tags, image } = data;

	const dateStr = published
		? new Date(published).toLocaleDateString("zh-CN", {
				year: "numeric",
				month: "long",
				day: "numeric",
			})
		: "";

	return (
		<div className="bg-white dark:bg-gray-900 min-h-screen p-8 shadow-inner font-sans antialiased text-left transition-colors duration-200">
			<div className="max-w-3xl mx-auto">
				{image && (
					<img
						src={getAsset(image)?.toString() || ""}
						className="w-full h-64 md:h-96 object-cover rounded-xl shadow-lg mb-8"
						alt={title || "Cover"}
					/>
				)}
				<h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight">
					{title || "Untitled"}
				</h1>
				<div className="flex flex-wrap items-center gap-4 text-gray-500 dark:text-gray-400 text-sm mb-8">
					<time dateTime={published}>{dateStr}</time>
					{tags && tags.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{tags.map((tag: string) => (
								<span
									key={tag}
									className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium"
								>
									{tag}
								</span>
							))}
						</div>
					)}
				</div>

				{description && (
					<div className="text-xl text-gray-600 dark:text-gray-300 italic mb-10 pl-4 border-l-4 border-blue-500/50">
						{description}
					</div>
				)}

				{/* Markdown Content Area */}
				<div
					className="prose prose-lg dark:prose-invert max-w-none 
                        prose-headings:font-bold prose-a:text-blue-600 dark:prose-a:text-blue-400
                        prose-img:rounded-xl prose-img:shadow-md
                        prose-pre:bg-gray-800 prose-pre:text-gray-100
                        prose-table:border-collapse prose-table:w-full prose-th:p-2 prose-td:p-2 prose-th:border prose-td:border"
				>
					<ReactMarkdown
						remarkPlugins={[remarkMath, remarkGfm]}
						rehypePlugins={[[rehypeKatex, { katex }]]} // Pass the katex instance with mhchem loaded
						components={
							{
								// Add custom component mappings if needed
							}
						}
					>
						{body || ""}
					</ReactMarkdown>
				</div>
			</div>
		</div>
	);
};

// --- Style Injection ---

const injectStyles = (doc: Document) => {
	const head = doc.head;

	// 1. Tailwind CSS
	if (!doc.getElementById("tailwind-preview-script")) {
		const script = doc.createElement("script");
		script.id = "tailwind-preview-script";
		script.src = "https://cdn.tailwindcss.com?plugins=typography";
		head.appendChild(script);
	}

	// 2. KaTeX CSS (Critical for hiding MathML duplicate and styling)
	if (!doc.getElementById("katex-css")) {
		const link = doc.createElement("link");
		link.id = "katex-css";
		link.rel = "stylesheet";
		link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
		link.integrity =
			"sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV";
		link.crossOrigin = "anonymous";
		head.appendChild(link);
	}

	// 3. Custom Styles
	if (!doc.getElementById("preview-custom-styles")) {
		const style = doc.createElement("style");
		style.id = "preview-custom-styles";
		style.textContent = `
       .katex-display { overflow-x: auto; overflow-y: hidden; padding: 1em 0; }
       .katex { font-size: 1.1em; }
       body { background: transparent !important; margin: 0; }
       #preview-root-container { min-height: 100vh; }
       /* Table styling adjustment since Tailwind typography might miss some resets in iframe */
       table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
       th, td { border: 1px solid #ddd; padding: 8px; }
       tr:nth-child(even) { background-color: rgba(0,0,0,0.05); }
     `;
		head.appendChild(style);
	}
};

// --- The Wrapper Component (The Bridge) ---

class PreviewWrapper extends Component<PreviewProps> {
	containerRef: React.RefObject<HTMLDivElement>;
	root: Root | null = null;

	constructor(props: PreviewProps) {
		super(props);
		this.containerRef = React.createRef();
	}

	componentDidMount() {
		this.renderContent();
	}

	componentDidUpdate() {
		this.renderContent();
	}

	componentWillUnmount() {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
	}

	renderContent() {
		const container = this.containerRef.current;
		if (!container) return;

		// Inject styles into the iframe context
		const ownerDoc = container.ownerDocument;
		if (ownerDoc) injectStyles(ownerDoc);

		// Initialize root if needed
		if (!this.root) {
			this.root = createRoot(container);
		}

		// Render our isolated React tree
		this.root.render(
			<React.StrictMode>
				<PostPreviewContent {...this.props} />
			</React.StrictMode>,
		);
	}

	render() {
		return React.createElement("div", {
			ref: this.containerRef,
			id: "preview-root-container",
		});
	}
}

// --- Registration ---

const initCMS = () => {
	const CMS = (window as any).CMS;
	if (!CMS) return;

	console.log("[CMS Preview] Registering custom preview templates...");

	// Register for all relevant collections
	const collections = ["posts", "tutorials", "wordpress-posts"];
	collections.forEach((name) => {
		CMS.registerPreviewTemplate(name, PreviewWrapper);
	});

	console.log("[CMS Preview] Registration complete.");
};

if (typeof window !== "undefined") {
	const checkCMS = setInterval(() => {
		if ((window as any).CMS) {
			clearInterval(checkCMS);
			initCMS();
		}
	}, 100);

	setTimeout(() => clearInterval(checkCMS), 30000);
}
