import type { APIRoute } from 'astro';
import fetch from 'node-fetch';
import cheerio from 'cheerio';

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

export const GET: APIRoute = async ({ request }) => {

  checkAccessToken(request);

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

export const POST: APIRoute = async ({ request }) => {
  const cat_result = checkAccessToken(request);
  const cat_status = (await cat_result).status;
  if (cat_status === 400 || cat_status === 401) {
    return cat_result;
  } 
  if (request.headers.get("Content-Type") === "application/json") {
    const body = await request.json();
    const name = body.name;
    return new Response(JSON.stringify({
      message: "Your name was: " + name
    }), {
      status: 200
    })
  }
  return new Response(null, { status: 200 });
}

async function checkAccessToken(request: Request): Promise<Response>{

  const access_token = (await request.formData()).get('access_token');
  const auth_header = request.headers.get('Authorization');
  // Check if both access token and authorization header are present
  if (access_token && auth_header) {
    return new Response('Only one method of authentication is allowed', { status: 400 });
  } 
  // Check if neither access token nor authorization header are present
  if (!access_token && !auth_header) {
    return new Response('No authentication method provided', { status: 401 });
  }
  // Check if only one of access token or authorization header is present and set the access token accordingly
  let accessToken = access_token ? access_token : auth_header?.substring(7);

  const token_endpoint = await discoverEndpoints('https://www.niklas.fyi/');

  if (!token_endpoint) {
    return new Response('No token endpoint found', { status: 400 });
  }

  // Call the token endpoint with the access token
  const scope_response = await fetch(token_endpoint, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken,
    }});

  if (scope_response.status !== 200) {
    return new Response('Invalid access token', { status: 401 });
  }
  return new Response(null, { status: 200 });
}

async function discoverEndpoints(url: string, rel: string = 'token_endpoint') {
  const response = await fetch(url, { method: 'GET' });
  const body = await response.text();
  
  // Load the HTML content into cheerio
  const $ = cheerio.load(body);

  // Select all link tags with the specified rel attribute and map them to an array of their href attributes
  const linkTags = $(`link[rel="${rel}"]`).map((_, link) => $(link).attr('href')).get();

  console.log(linkTags);
  return linkTags[0];
}


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
