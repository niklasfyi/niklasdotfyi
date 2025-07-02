import { type CollectionEntry, getCollection } from "astro:content";

const collectionNames = ["article", "note"] as const; // Add your collection names here

export async function getAllCollections(): Promise<{
	[key: string]: CollectionEntry<(typeof collectionNames)[number]>[];
}> {
	const collections: { [key: string]: CollectionEntry<(typeof collectionNames)[number]>[] } = {};

	for (const collectionName of collectionNames) {
		try {
			collections[collectionName] = await getCollection(collectionName);
		} catch (error) {
			console.warn(`Collection '${collectionName}' not found or could not be loaded`);
			collections[collectionName] = [];
		}
	}

	return collections;
}

/** returns all tags created from entries (inc duplicate tags)
 *  Note: This function doesn't filter draft entries, pass it the result of getAllCollections above to do so.
 *  */
export function* getAllTags(collections: {
	[key: string]: CollectionEntry<(typeof collectionNames)[number]>[];
}) {
	for (const c in collections) {
		const collection = collections[c];
		if (collection) {
			for (const entry of collection) {
				if (entry.data.tags) {
					yield* entry.data.tags;
				}
			}
		}
	}
}

/** returns all unique tags created from entries
 *  Note: This function doesn't filter draft entries, pass it the result of getAllCollections above to do so.
 *  */
export function getAllUniqueTags(collections: {
	[key: string]: CollectionEntry<(typeof collectionNames)[number]>[];
}) {
	return [...new Set(getAllTags(collections))];
}

/** returns a count of each unique tag - [[tagName, count], ...]
 *  Note: This function doesn't filter draft entries, pass it the result of getAllCollections above to do so.
 *  */
/** returns all entries that don't have any tags */
export function getUntaggedEntries(collections: {
	[key: string]: CollectionEntry<(typeof collectionNames)[number]>[];
}) {
	const untaggedEntries: CollectionEntry<(typeof collectionNames)[number]>[] = [];

	for (const c in collections) {
		const collection = collections[c];
		if (collection) {
			for (const entry of collection) {
				if (!entry.data.tags || entry.data.tags.length === 0) {
					untaggedEntries.push(entry);
				}
			}
		}
	}

	return untaggedEntries;
}

export async function getAllUniqueTagsWithCount(): Promise<[string, number][]> {
	const allcollections = await getAllCollections();
	const tagCounts = new Map<string, number>();

	for (const tag of getAllTags(allcollections)) {
		tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
	}

	// Add untagged posts count
	const untaggedEntries = getUntaggedEntries(allcollections);
	if (untaggedEntries.length > 0) {
		tagCounts.set("untagged", untaggedEntries.length);
	}

	return [...tagCounts].sort((a, b) => b[1] - a[1]);
}

export async function getAllEntries(): Promise<
	CollectionEntry<(typeof collectionNames)[number]>[]
> {
	const collections = await getAllCollections();
	const allEntries: CollectionEntry<(typeof collectionNames)[number]>[] = [];

	for (const collectionName in collections) {
		const collection = collections[collectionName];
		if (collection) {
			for (const entry of collection) {
				const shouldInclude = import.meta.env.PROD
					? !(collectionName === "article" && (entry.data as any)["post-status"] === "draft")
					: true;
				if (shouldInclude) {
					allEntries.push(entry);
				}
			}
		}
	}

	return allEntries;
}
