import { siteConfig } from "@/site.config";
import type { CollectionEntryType } from "@/types";

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
	return entry.data.date;
}

export function collectionDateSort(
	a: CollectionEntryType,
	b: CollectionEntryType,
) {

	const dateA = getDate(a);
	const dateB = getDate(b);

	return dateB.getTime() - dateA.getTime();
}
