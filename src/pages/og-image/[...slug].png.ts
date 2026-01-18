import CaviarDreams from "@/assets/CaviarDreams.ttf";
import CaviarDreamsBold from "@/assets/CaviarDreams_Bold.ttf";
import { getAllEntries } from "@/data/entry";
import { siteConfig } from "@/site.config";
import { getFormattedDate } from "@/utils/date";
import { getEntryDate, getEntryOgImage, getEntryUpdated } from "@/utils/entry";
import { Resvg } from "@resvg/resvg-js";
import type { APIContext, InferGetStaticPropsType } from "astro";
import satori, { type SatoriOptions } from "satori";
import { html } from "satori-html";

const ogOptions: SatoriOptions = {
	// debug: true,
	fonts: [
		{
			data: Buffer.from(CaviarDreams),
			name: "Caviar Dreams",
			style: "normal",
			weight: 400,
		},
		{
			data: Buffer.from(CaviarDreamsBold),
			name: "Caviar Dreams Bold",
			style: "normal",
			weight: 700,
		},
	],
	height: 630,
	width: 1200,
};

const markup = (title: string, pubDate: string) =>
	html`<div tw="bg-[#1d1f21] text-[#c9cacc] w-full h-full flex flex-col justify-center items-center px-6">
		<img
			src=${siteConfig.url}/logo.png
			width="500"
			height="500"
			tw="w-36 h-36 rounded-full"
		/>
		<div tw="text-8xl font-normal">
			${siteConfig.author}
		</div>
		<div tw="text-4xl font-bold mt-2">
			${title}
		</div>
		<div tw="text-xl pt-4">
			${pubDate} - ${siteConfig.url.replace("https://", "").replace("/", "")}
		</div>
	</div>`;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export async function GET(context: APIContext) {
	const { pubDate, title } = context.props as Props;

	const postDate = getFormattedDate(pubDate);
	const svg = await satori(markup(title, postDate), ogOptions);
	const png = new Resvg(svg).render().asPng();
	return new Response(new Uint8Array(png), {
		headers: {
			"Cache-Control": "public, max-age=31536000, immutable",
			"Content-Type": "image/png",
		},
	});
}

export async function getStaticPaths() {
	const entries = await getAllEntries();
	return entries
		.filter((entry) => !getEntryOgImage(entry))
		.map((entry) => ({
			params: { slug: entry.id },
			props: {
				pubDate: getEntryUpdated(entry) ?? getEntryDate(entry),
				title:
					"title" in entry.data
						? entry.data.title
						: "Dad - Husband - Photographer - Smart Home Tinkerer",
			},
		}));
}
