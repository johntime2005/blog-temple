import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const postsCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),
		pinned: z.boolean().optional().default(false),
		author: z.string().optional().default(""),
		sourceLink: z.string().optional().default(""),
		licenseName: z.string().optional().default(""),
		licenseUrl: z.string().optional().default(""),

		/* Advanced visibility control */
		visibility: z
			.enum(["public", "unlisted", "private"])
			.optional()
			.default("public"),
		hideFromHome: z.boolean().optional().default(false),
		hideFromArchive: z.boolean().optional().default(false),
		hideFromSearch: z.boolean().optional().default(false),
		showInWidget: z.boolean().optional().default(true),

		/* Advanced features */
		customOrder: z.number().optional(),
		featuredLevel: z.number().min(0).max(5).optional().default(0),
		postLayout: z
			.enum(["default", "wide", "fullscreen", "no-sidebar"])
			.optional()
			.default("default"),
		seoNoIndex: z.boolean().optional().default(false),
		seoNoFollow: z.boolean().optional().default(false),
		accessLevel: z
			.enum(["public", "members-only", "restricted"])
			.optional()
			.default("public"),

		/* Encryption */
		encrypted: z.boolean().optional().default(false),
		encryptionId: z.string().optional(),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),

		/* Columns */
		columns: z.array(z.string()).optional().default([]),
		columnConfig: z
			.record(
				z.string(),
				z.object({
					order: z.number().optional(),
					featured: z.boolean().optional(),
					customTitle: z.string().optional(),
				}),
			)
			.optional(),
	}),
});

const specCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/spec" }),
	schema: z.object({}),
});

const categoriesCollection = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/categories" }),
	schema: z.object({
		title: z.string(), // Category name
		slug: z.string().optional(), // Optional custom slug
		description: z.string(),
		showInHome: z.boolean().default(true),
		showInNavbar: z.boolean().default(false),
		syncToPublic: z.boolean().default(false),
		order: z.number().default(99),
		color: z.string().optional().default("#3b82f6"),
		icon: z.string().optional().default("material-symbols:folder"),
		customLink: z.string().optional(), // Optional custom link override
	}),
});

export const collections = {
	posts: postsCollection,
	spec: specCollection,
	categories: categoriesCollection,
};
