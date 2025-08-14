import type { CollectionEntry } from "astro:content";

/** returns all tags created from articles (inc duplicate tags)
 *  Note: This function doesn't filter draft articles, pass it the result of getAllArticles above to do so.
 *  */
export function getAllTags(articles: CollectionEntry<"article">[]) {
	return articles.flatMap((article) => [...article.data.tags]);
}

/** returns all unique tags created from articles
 *  Note: This function doesn't filter draft articles, pass it the result of getAllArticles above to do so.
 *  */
export function getUniqueTags(articles: CollectionEntry<"article">[]) {
	return [...new Set(getAllTags(articles))];
}

/** returns a count of each unique tag - [[tagName, count], ...]
 *  Note: This function doesn't filter draft articles, pass it the result of getAllArticles above to do so.
 *  */
export function getUniqueTagsWithCount(articles: CollectionEntry<"article">[]): [string, number][] {
	return [
		...getAllTags(articles).reduce(
			(acc, t) => acc.set(t, (acc.get(t) ?? 0) + 1),
			new Map<string, number>(),
		),
	].sort((a, b) => b[1] - a[1]);
}
