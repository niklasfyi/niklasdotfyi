export const prerender = false;

const micropubConfig = {
  'categories': [],
  'media-endpoint': 'https://www.niklas.fyi/micropub/media',
  'post-types': [
    {
      'type': 'article',
      'name': 'Article',
      'h': 'entry',
      'properties': [
        'name',
        'summary',
        'content',
        'category',
        'geo',
        'post-status',
        'published',
        'visibility'
      ],
      'required-properties': [
        'name',
        'content',
        'published'
      ]
    },
    {
      'type': 'bookmark',
      'name': 'Bookmark',
      'h': 'entry',
      'properties': [
        'bookmark-of',
        'name',
        'content',
        'category',
        'post-status',
        'published',
        'visibility'
      ],
      'required-properties': [
        'bookmark-of',
        'published'
      ]
    },
    {
      'type': 'like',
      'name': 'Like',
      'h': 'entry',
      'properties': [
        'like-of',
        'category',
        'content',
        'post-status',
        'published',
        'visibility'
      ],
      'required-properties': [
        'like-of',
        'published'
      ]
    },
    {
      'type': 'note',
      'name': 'Note',
      'h': 'entry',
      'properties': [
        'content',
        'category',
        'geo',
        'post-status',
        'published',
        'visibility'
      ],
      'required-properties': [
        'content',
        'published'
      ]
    },
    {
      'type': 'photo',
      'name': 'Photo',
      'h': 'entry',
      'properties': [
        'photo',
        'content',
        'category',
        'geo',
        'post-status',
        'mp-photo-alt',
        'published',
        'visibility'
      ],
      'required-properties': [
        'photo',
        'mp-photo-alt',
        'published'
      ]
    },
    {
      'type': 'reply',
      'name': 'Reply',
      'h': 'entry',
      'properties': [
        'in-reply-to',
        'content',
        'category',
        'post-status',
        'published',
        'visibility'
      ],
      'required-properties': [
        'in-reply-to',
        'content',
        'published'
      ]
    },
    {
      'type': 'checkin',
      'name': 'Checkin',
      'h': 'entry',
      'properties': [
        'name',
        'url',
        'latitude',
        'longitude',
        'street-address',
        'locality',
        'region',
        'country-name',
        'postal-code',
        'tel',
      ],
      'required-properties': [
        'name',
        'url'
      ]
    }
  ],
  'syndicate-to': [
    {
      'checked': false,
      'name': '@niklasfyi@hachyderm.io',
      'uid': 'https://hachyderm.io/@niklasfyi',
      'service': {
        'name': 'Mastodon',
        'photo': 'https://kit.niklas.fyi/assets/@indiekit-syndicator-mastodon/icon.svg',
        'url': 'https://hachyderm.io/'
      },
      'user': {
        'name': '@niklasfyi',
        'url': 'https://hachyderm.io/@niklasfyi'
      }
    }
  ],
  'q': [
    'category',
    'config',
    'media-endpoint',
    'post-types',
    'source',
    'syndicate-to'
  ]
};

export async function GET({ request }: { params: any, request: Request }) {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);

  // Now you can get individual parameters like this:
  const query = searchParams.get('q');

  if (query === null) {
    // If a simple GET is performed, then we just want to verify the authorization credentials
    return new Response(null, { status: 200 });
  } else if (query !== undefined) {
    if (typeof query !== 'string') {
      return new Response('Invalid q parameter format', { status: 400 });
    }
    const result = queryHandler(query);

    if (!result) {
      console.log(query);
      console.log(micropubConfig.q.includes(query));
      return micropubConfig.q.includes(query) ? Response.json('{}', { status: 200 }) : new Response('Query type is not supported', { status: 400 });
    }

    return Response.json(result, { status: 200 });
  } else {
    return new Response('No known query parameters', { status: 400 });
  }
}


// export async function POST({ params, request }: { params: any, request: Request }) {
//   const data = await request.json();
//   console.log(data);
//   // const post = createPost(data);
//   // return new Response(
//   //   null,
//   //   {
//   //     status: 201,
//   //     headers: {
//   //       'Location': `/posts/${post.slug}`
//   //     }
//   //   }
//   // );
// }

function queryHandler(query: string) {
  if (query === 'config') {
    return micropubConfig;
  } else if (query === 'category') {
    return { 'categories': micropubConfig.categories };
  } else if (query === 'media-endpoint') {
    return { 'media-endpoint': micropubConfig['media-endpoint'] };
  } else if (query === 'post-types') {
    return { 'post-types': micropubConfig['post-types'] };
  } else if (query === 'source') {
    return { 'source': {} };
  } else if (query === 'syndicate-to') {
    return { 'syndicate-to': micropubConfig['syndicate-to'] };
  } else {
    return null;
  }
}
