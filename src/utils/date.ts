import type { CollectionEntry } from "astro:content";
import { siteConfig } from "@/site.config";

type CollectionEntryType = CollectionEntry<"article" | "note" | "checkin" | "post">;

export function getFormattedDate(
	date: Date | undefined,
	options?: Intl.DateTimeFormatOptions,
): string {
	if (date === undefined) {
		return "Invalid Date";
	}

	return new Intl.DateTimeFormat(siteConfig.date.locale, {
		...(siteConfig.date.options as Intl.DateTimeFormatOptions),
		...options,
	}).format(date);
}

export function getFormattedDateFromCollectionEntry(entry: CollectionEntryType): string {
	return getFormattedDate(getDate(entry));
}

function getDate(entry: CollectionEntryType) {
	return entry.collection === "checkin" ? entry.data.published : entry.data.date;
}

export function collectionDateSort(
	a: CollectionEntryType,
	b: CollectionEntryType,
) {

	const dateA = getDate(a);
	const dateB = getDate(b);

	return dateB.getTime() - dateA.getTime();
}
