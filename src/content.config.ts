import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

function removeDupsAndLowerCase(array: string[]) {
	return [...new Set(array.map((str) => str.toLowerCase()))];
}

const baseSchema = z.object({
	title: z.string().max(60),
});

const post = defineCollection({
	loader: glob({ base: "./src/content/post", pattern: "**/*.{md,mdx}" }),
	schema: ({ image }) =>
		baseSchema.extend({
			description: z.string(),
			coverImage: z
				.object({
					alt: z.string(),
					src: image(),
				})
				.optional(),
			draft: z.boolean().default(false),
			ogImage: z.string().optional(),
			tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
			published: z
				.string()
				.or(z.date())
				.transform((val) => new Date(val)),
			updated: z
				.string()
				.optional()
				.transform((str) => (str ? new Date(str) : undefined)),
		}),
});

const article = defineCollection({
	loader: glob({ base: "./src/content/articles", pattern: "**/*.{md,mdx}" }),
	schema: ({ image }) =>
		baseSchema.extend({
			description: z.string(),
			coverImage: z
				.object({
					alt: z.string(),
					src: image(),
				})
				.optional(),
			draft: z.boolean().default(false),
			ogImage: z.string().optional(),
			tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
			published: z
				.string()
				.or(z.date())
				.transform((val) => new Date(val)),
			updated: z
				.string()
				.optional()
				.transform((str) => (str ? new Date(str) : undefined)),
		}),
});

const note = defineCollection({
	loader: glob({ base: "./src/content/notes", pattern: "**/*.{md,mdx}" }),
	schema: baseSchema.extend({
		description: z.string().optional(),
		published: z
			.string()
			.datetime({ offset: true }) // Ensures ISO 8601 format with offsets allowed (e.g. "2024-01-01T00:00:00Z" and "2024-01-01T00:00:00+02:00")
			.transform((val) => new Date(val)),
	}),
});

const checkin = defineCollection({
	type: "data", // Set type to "data" for JSON files
	schema: z.object({
		type: z.literal("entry"),
		published: z
			.string()
			.datetime({ offset: true })
			.transform((val) => new Date(val)),
		syndication: z.array(z.string().url()),
		checkin: z.object({
			type: z.literal("card"),
			name: z.string(),
			url: z.union([z.array(z.string().url()), z.string().url()]).optional(),
			tel: z.string().optional(),
			latitude: z.number(),
			longitude: z.number(),
			"street-address": z.string().optional(),
			locality: z.string().optional(),
			region: z.string().optional(),
			"country-name": z.string(),
			"postal-code": z.string().optional(),
		}),
		location: z.object({
			type: z.literal("adr"),
			latitude: z.number(),
			longitude: z.number(),
			"street-address": z.string().optional(),
			locality: z.string().optional(),
			region: z.string().optional(),
			"country-name": z.string(),
			"postal-code": z.string().optional(),
		}),
		slug: z.string(),
		url: z.string().url(),
		"post-status": z.literal("published"),
		content: z
			.object({
				html: z.string(),
				text: z.string(),
			})
			.optional(),
	}),
});

export const collections = { article, post, note, checkin };
