const REWRITE_PATH = "/vocal-remover-ppc-api/task/upload_able";
const RELAY_PATH = "/api/easeus/relay";

function buildCorsHeaders(requestHeaders) {
  const origin = requestHeaders.get("origin") || "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD",
    "access-control-allow-headers":
      requestHeaders.get("access-control-request-headers") || "*",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function rewriteExternalUrls(value) {
  if (typeof value === "string") {
    if (value.startsWith("https://") || value.startsWith("http://")) {
      return `${RELAY_PATH}?target=${encodeURIComponent(value)}`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(rewriteExternalUrls);
  }

  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = rewriteExternalUrls(v);
    }
    return out;
  }

  return value;
}

function resolveTarget(requestUrl) {
  if (requestUrl.pathname === RELAY_PATH) {
    const raw = requestUrl.searchParams.get("target");
    if (!raw) {
      throw new Error("Missing relay target");
    }
    const target = new URL(raw);
    if (!/^https?:$/.test(target.protocol)) {
      throw new Error("Invalid relay target protocol");
    }
    return target;
  }

  const proxiedPath = requestUrl.pathname.replace(/^\/api\/easeus/, "");
  return new URL(`https://multimedia.easeus.com${proxiedPath}${requestUrl.search}`);
}

export async function onRequest(context) {
  const reqUrl = new URL(context.request.url);

  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(context.request.headers),
    });
  }

  let target;
  try {
    target = resolveTarget(reqUrl);
  } catch (err) {
    return new Response(
      JSON.stringify({
        code: 400,
        message: err instanceof Error ? err.message : "Invalid proxy request",
      }),
      {
        status: 400,
        headers: {
          "content-type": "application/json; charset=utf-8",
          ...buildCorsHeaders(context.request.headers),
        },
      },
    );
  }

  const headers = new Headers(context.request.headers);
  const hopByHop = [
    "host",
    "content-length",
    "origin",
    "referer",
    "cf-connecting-ip",
    "cf-ray",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-real-ip",
    "sec-fetch-mode",
    "sec-fetch-site",
    "sec-fetch-dest",
  ];
  for (const h of hopByHop) {
    headers.delete(h);
  }

  const init = {
    method: context.request.method,
    headers,
    redirect: "follow",
    body:
      context.request.method === "GET" || context.request.method === "HEAD"
        ? undefined
        : context.request.body,
  };

  const upstreamResponse = await fetch(target, init);
  const responseHeaders = new Headers(upstreamResponse.headers);
  Object.entries(buildCorsHeaders(context.request.headers)).forEach(([k, v]) =>
    responseHeaders.set(k, v),
  );
  responseHeaders.delete("content-length");

  const shouldRewriteUploadableResponse =
    reqUrl.pathname.includes(REWRITE_PATH) &&
    (responseHeaders.get("content-type") || "").includes("application/json");

  if (!shouldRewriteUploadableResponse) {
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  }

  try {
    const payload = await upstreamResponse.json();
    const rewritten = rewriteExternalUrls(payload);
    return new Response(JSON.stringify(rewritten), {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch {
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  }
}
