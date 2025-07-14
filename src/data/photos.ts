import { type CollectionEntry, getCollection } from "astro:content";

export async function getAllPhotos(): Promise<CollectionEntry<"photo">[]> {
	return await getCollection("photo");
}

export async function getPhotosByTag(tag: string): Promise<CollectionEntry<"photo">[]> {
	const allPhotos = await getAllPhotos();
	return allPhotos.filter((photo) => photo.data.tags?.includes(tag));
}

export async function getAllPhotoTags(): Promise<string[]> {
	const allPhotos = await getAllPhotos();
	const tags = new Set<string>();

	allPhotos.forEach((photo) => {
		photo.data.tags?.forEach((tag) => tags.add(tag));
	});

	return Array.from(tags).sort();
}

export async function getPhotosByYear(year: number): Promise<CollectionEntry<"photo">[]> {
	const allPhotos = await getAllPhotos();
	return allPhotos.filter((photo) => {
		if (!photo.data.date) return false;
		return new Date(photo.data.date).getFullYear() === year;
	});
}
