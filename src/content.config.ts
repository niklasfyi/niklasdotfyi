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
	// IndieWeb spec fields (all optional for backward compatibility)
	id: z.string().optional(), // stable UUID or derived from slug
	slug: z.string().optional(), // no leading slash; final URL computed
	in_main_feed: z.boolean().default(true),
	visibility: z.enum(["public", "unlisted", "private"]).default("public"),
	syndication_targets: z.array(z.string()).default([]),
	draft: z.boolean().default(false),
	// Raw micropub data passthrough
	mf2_raw: z.record(z.any()).optional(),
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
	schema: ({ image }) =>
		baseSchema.extend({
			syndication: z.string().url().optional(),
			photo: z
				.array(
					z.object({
						value: z.string().url(),
					}),
				)
				.optional(),
			location_picture: z
				.object({
					dark: image(),
					light: image(),
				})
				.optional(),
			checkin: z.array(
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

// Additional IndieWeb content types
const photo = defineCollection({
	loader: glob({ base: "./src/content/photos", pattern: "**/*.{md,mdx}" }),
	schema: baseSchema.extend({
		title: z.string().optional(),
		photo: z
			.array(
				z.object({
					value: z.string(), // Allow relative paths for backward compatibility
					alt: z.string(),
				}),
			)
			.optional(),
		photos: z
			.array(
				z.object({
					url: z.string(),
					alt: z.string(),
					width: z.number().optional(),
					height: z.number().optional(),
				}),
			)
			.default([]),
	}),
});

const reply = defineCollection({
	loader: glob({ base: "./src/content/replies", pattern: "**/*.{md,mdx}" }),
	schema: baseSchema.extend({
		"in-reply-to": z.string().url(),
		title: z.string().optional(),
	}),
});

const like = defineCollection({
	loader: glob({ base: "./src/content/likes", pattern: "**/*.{md,mdx}" }),
	schema: baseSchema.extend({
		"like-of": z.string().url(),
		title: z.string().optional(),
	}),
});

const rsvp = defineCollection({
	loader: glob({ base: "./src/content/rsvps", pattern: "**/*.{md,mdx}" }),
	schema: baseSchema.extend({
		rsvp: z.enum(["yes", "no", "maybe", "interested"]),
		"in-reply-to": z.string().url(),
		title: z.string().optional(),
	}),
});

export const collections = { article, note, checkin, bookmark, photo, reply, like, rsvp };
