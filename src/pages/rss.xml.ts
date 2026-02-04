import { getAllEntries } from "@/data/entry";
import { siteConfig } from "@/site.config";
import rss from "@astrojs/rss";
import sanitizeHtml from "sanitize-html";
import MarkdownIt from "markdown-it";
const parser = new MarkdownIt();
import type { CollectionEntryType } from "@/types";
import { getEntryDate, getEntryTags, isCheckinEntry, isBookmarkEntry } from "@/utils/entry";
import { collectionDateSort } from "@/utils/date";


// function to return title
function getTitle(entry: CollectionEntryType): string {
	if ("title" in entry.data && entry.data.title) {
		if (isBookmarkEntry(entry)) {
			return `Bookmarked ${entry.data.title}`;
		}
		return entry.data.title;
	}
	if (isCheckinEntry(entry)) {
		return `At ${entry.data.checkin.name}`;
	}
	return `${entry.body?.slice(0, 30)}...` || "Untitled";
}

export const GET = async () => {
	const entries = await getAllEntries();
	const sortedEntries = entries.sort(collectionDateSort);

	return rss({
		title: siteConfig.title,
		description: siteConfig.description,
		site: import.meta.env.SITE,
		items: await Promise.all(
			sortedEntries.map(async (entry) => ({
				title: getTitle(entry),
				description: entry.body
					? sanitizeHtml(parser.render(entry.body), {
							allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
						})
					: undefined,
				pubDate: getEntryDate(entry),
				link: `${entry.id}`,
				content: entry.body
					? sanitizeHtml(parser.render(entry.body), {
							allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
						})
					: undefined,
				categories: getEntryTags(entry),
				author: `${siteConfig.authorEmail} (${siteConfig.author})`,
			})),
		),
		xmlns: {
			atom: "http://www.w3.org/2005/Atom",
		},
		customData: `<atom:link href="${import.meta.env.SITE}rss.xml" rel="self" type="application/rss+xml" />`,
	});
};
