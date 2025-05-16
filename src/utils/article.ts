import { type CollectionEntry, getCollection } from "astro:content";

/** filter out draft articles based on the environment */
export async function getAllArticles(): Promise<CollectionEntry<"article">[]> {
	return await getCollection("article", ({ data }) => {
		return import.meta.env.PROD ? !(data["post-status"] === "draft") : true;
	});
}

/** groups articles by year (based on option siteConfig.sortArticlesByUpdated), using the year as the key
 *  Note: This function doesn't filter draft articles, pass it the result of getAllArticles above to do so.
 */
export function groupArticlesByYear(articles: CollectionEntry<"article">[]) {
	return articles.reduce<Record<string, CollectionEntry<"article">[]>>((acc, article) => {
		const year = article.data.date.getFullYear();
		if (!acc[year]) {
			acc[year] = [];
		}
		acc[year]?.push(article);
		return acc;
	}, {});
}
