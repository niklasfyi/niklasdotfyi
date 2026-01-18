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

const article = defineCollection({
	loader: glob({ base: "./src/content/article", pattern: "**/*.{md,mdx}" }),
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
	loader: glob({ base: "./src/content/note", pattern: "**/*.{md,mdx}" }),
	schema: baseSchema.extend({
		description: z.string().optional(),
	}),
});

const checkin = defineCollection({
	loader: glob({ base: "./src/content/checkin", pattern: "**/*.md" }),
	schema: ({ image }) =>
		z.object({
			type: z.string(),
			published: z
				.string()
				.datetime({ offset: true })
				.transform((val) => new Date(val)),
			syndication: z.string().url().optional(),
			photo: image().optional(),
			checkin: z
				.object({
					type: z.string(),
					name: z.string(),
					url: z.union([z.string().url(), z.array(z.string().url())]).optional(),
					tel: z.string().optional(),
					latitude: z.number(),
					longitude: z.number(),
					"street-address": z.string().optional(),
					locality: z.string().optional(),
					region: z.string().optional(),
					"country-name": z.string().optional(),
					"postal-code": z.union([z.string(), z.number()]).optional(),
				}),
			location: z
				.object({
					type: z.string(),
					latitude: z.number(),
					longitude: z.number(),
					"street-address": z.string().optional(),
					locality: z.string().optional(),
					region: z.string().optional(),
					"country-name": z.string().optional(),
					"postal-code": z.union([z.string(), z.number()]).optional(),
				})
				.optional(),
			updated: z
				.string()
				.optional()
				.transform((str) => (str ? new Date(str) : undefined)),
			client_id: z.string().optional(),
		}),
});

const bookmark = defineCollection({
	loader: glob({ base: "./src/content/bookmark", pattern: "**/*.md" }),
	schema: baseSchema.extend({
		"bookmark-of": z.string().url(),
		title: z.string(),
	}),
});

export const collections = { article, note, checkin, bookmark };
