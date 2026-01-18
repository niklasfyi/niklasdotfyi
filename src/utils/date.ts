import { siteConfig } from "@/site.config";
import type { CollectionEntryType } from "@/types";
import { getEntryDate } from "@/utils/entry";

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
	return getFormattedDate(getEntryDate(entry));
}

export function collectionDateSort(a: CollectionEntryType, b: CollectionEntryType) {
	const dateA = getEntryDate(a);
	const dateB = getEntryDate(b);

	return dateB.getTime() - dateA.getTime();
}
