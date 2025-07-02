import { getAllEntries } from "@/data/entry";
import { siteConfig } from "@/site.config";
import rss from "@astrojs/rss";

export const GET = async () => {
	const entries = await getAllEntries();

	return rss({
		title: siteConfig.title,
		description: siteConfig.description,
		site: import.meta.env.SITE,
		items: entries.map((entry) => ({
			title:
				"title" in entry.data && entry.data.title
					? entry.data.title
					: entry.body?.slice(0, 30) + "..." || "Untitled",
			description: entry.data.description,
			pubDate: entry.data.date,
			link: `${entry.id}`,
		})),
	});
};
