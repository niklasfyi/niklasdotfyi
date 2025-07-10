import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

function removeDupsAndLowerCase(array: string[]) {
	return [...new Set(array.map((str) => str.toLowerCase()))];
}

const baseSchema = z.object({
	date: z
		.string()
		.datetime({ offset: true }) // Ensures ISO 8601 format with offsets allowed (e.g. "2024-01-01T00:00:00Z" and "2024-01-01T00:00:00+02:00")
		.transform((val) => new Date(val)),
	client_id: z.string().optional(),
	tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
	description: z.string().optional(),
	ogImage: z.string().optional(),
	updated: z
	.string()
	.optional()
	.transform((str) => (str ? new Date(str) : undefined)),
});

const post = defineCollection({
	loader: glob({ base: "./src/content/post", pattern: "**/*.{md,mdx}" }),
	schema: ({ image }) =>
		baseSchema.extend({
			title: z.string().max(60),
			coverImage: z
				.object({
					alt: z.string(),
					src: image(),
				})
				.optional(),
			"post-status": z.string().default("published"),
		}),
});

const article = defineCollection({
	loader: glob({ base: "./src/content/articles", pattern: "**/*.{md,mdx}" }),
	schema: ({ image }) =>
		baseSchema.extend({
			title: z.string().max(60),
			coverImage: z
				.object({
					alt: z.string(),
					src: image(),
				})
				.optional(),
			"post-status": z.string().default("published"),
		}),
});

const note = defineCollection({
	loader: glob({ base: "./src/content/notes", pattern: "**/*.{md,mdx}" }),
	schema: baseSchema.extend({
		description: z.string().optional(),
	}),
});

const checkin = defineCollection({
	loader: glob({ base: "./src/content/checkins", pattern: "**/*.md" }),
	schema: baseSchema.extend({
		syndication: z.string().url().optional(),
		checkin: z
			.array(
				z.object({
					type: z.array(z.string()),
					properties: z.object({
						name: z.array(z.string()),
						url: z.array(z.string().url()).optional(),
						latitude: z.array(z.number()),
						longitude: z.array(z.number()),
						"street-address": z.array(z.string()).optional(),
						locality: z.array(z.string()).optional(),
						region: z.array(z.string()).optional(),
						"country-name": z.array(z.string()).optional(),
						"postal-code": z.array(z.string()).optional(),
					}),
					value: z.string().url(),
				}),
			),
		location: z
			.array(
				z.object({
					type: z.array(z.string()),
					properties: z.object({
						latitude: z.array(z.number()),
						longitude: z.array(z.number()),
						"street-address": z.array(z.string()).optional(),
						locality: z.array(z.string()).optional(),
						region: z.array(z.string()).optional(),
						"country-name": z.array(z.string()).optional(),
						"postal-code": z.array(z.string()).optional(),
					}),
				}),
			)
			.optional(),
	}),
});

const bookmark = defineCollection({
	loader: glob({ base: "./src/content/bookmarks", pattern: "**/*.md" }),
	schema: baseSchema.extend({
		"bookmark-of": z.string().url(),
		title: z.string(),
	}),
});

export const collections = { article, post, note, checkin, bookmark };
