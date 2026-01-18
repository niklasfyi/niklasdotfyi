import type { CollectionEntryType } from "@/types";
import type { CollectionEntry } from "astro:content";

/**
 * Type guards and helper functions for working with different collection entry types
 */

export function isArticleEntry(
	entry: CollectionEntryType,
): entry is CollectionEntry<"article"> {
	return entry.collection === "article";
}

export function isCheckinEntry(
	entry: CollectionEntryType,
): entry is CollectionEntry<"checkin"> {
	return entry.collection === "checkin";
}

export function isNoteEntry(
	entry: CollectionEntryType,
): entry is CollectionEntry<"note"> {
	return entry.collection === "note";
}

export function isBookmarkEntry(
	entry: CollectionEntryType,
): entry is CollectionEntry<"bookmark"> {
	return entry.collection === "bookmark";
}

export function isWatchedEntry(
	entry: CollectionEntryType,
): entry is CollectionEntry<"watched"> {
	return entry.collection === "watched";
}

/**
 * Get the date from any collection entry.
 * Articles, notes, and bookmarks use `date`, while checkins use `published`.
 */
export function getEntryDate(entry: CollectionEntryType): Date {
	if (isCheckinEntry(entry)) {
		return entry.data.published;
	}
	return entry.data.date;
}

/**
 * Get tags from an entry if it has them.
 * Checkins don't have tags, so this returns an empty array for them.
 */
export function getEntryTags(entry: CollectionEntryType): string[] {
	if (isCheckinEntry(entry)) {
		return [];
	}
	return entry.data.tags ?? [];
}

/**
 * Check if an entry has tags
 */
export function entryHasTags(entry: CollectionEntryType): boolean {
	return getEntryTags(entry).length > 0;
}

/**
 * Get description from an entry if it has one.
 */
export function getEntryDescription(entry: CollectionEntryType): string | undefined {
	if (isCheckinEntry(entry)) {
		return undefined;
	}
	return entry.data.description;
}

/**
 * Get ogImage from an entry if it has one.
 */
export function getEntryOgImage(entry: CollectionEntryType): string | undefined {
	if (isCheckinEntry(entry)) {
		return undefined;
	}
	return entry.data.ogImage;
}

/**
 * Get updated date from an entry if it has one.
 */
export function getEntryUpdated(entry: CollectionEntryType): Date | undefined {
	if (isCheckinEntry(entry)) {
		return entry.data.updated;
	}
	return entry.data.updated;
}

/**
 * Check if an entry has a title property.
 * Articles and bookmarks have titles, while notes and checkins do not.
 */
export function entryHasTitle(entry: CollectionEntryType): boolean {
	return "title" in entry.data;
}
