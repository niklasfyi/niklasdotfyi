import { getCollection } from "astro:content";
import { siteConfig } from "@/site.config";
import rss from "@astrojs/rss";

export const GET = async () => {
	const notes = await getCollection("note");

	return rss({
		title: siteConfig.title,
		description: siteConfig.description,
		site: import.meta.env.SITE,
		items: notes.map((note) => ({
			title: note.body ? (note.body.length > 20 ? `${note.body.slice(0, 20)}...` : note.body) : "",
			pubDate: note.data.date,
			link: `notes/${note.id}/`,
		})),
	});
};
