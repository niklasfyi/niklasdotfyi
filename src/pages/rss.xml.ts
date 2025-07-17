import { getAllEntries } from "@/data/entry";
import { siteConfig } from "@/site.config";
import rss from "@astrojs/rss";
import sanitizeHtml from "sanitize-html";
import MarkdownIt from "markdown-it";
const parser = new MarkdownIt();
import type { CollectionEntryType } from "@/types";

// function to return title
function getTitle(entry: CollectionEntryType): string {
	console.log(entry);
	if ("title" in entry.data && entry.data.title) {
		if ("bookmark-of" in entry.data && entry.data["bookmark-of"].length > 0) {
			return `Bookmarked ${entry.data.title}`;
		}
		return entry.data.title;
	} else if ("checkin" in entry.data && entry.data.checkin.length > 0) {
		return `At ${entry.data.checkin?.[0]?.properties?.name?.[0]}`;
	} else {
		return entry.body?.slice(0, 30) + "..." || "Untitled";
	}
}

export const GET = async () => {
	const entries = await getAllEntries();

	return rss({
		title: siteConfig.title,
		description: siteConfig.description,
		site: import.meta.env.SITE,
		items: await Promise.all(
			entries.map(async (entry) => ({
				title: getTitle(entry),
				description: entry.data.description,
				pubDate: entry.data.date,
				link: `${entry.id}`,
				content: entry.body
					? sanitizeHtml(parser.render(entry.body), {
							allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
						})
					: undefined,
			})),
		),
	});
};
