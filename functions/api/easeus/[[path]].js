export async function onRequest(context) {
  const upstream = new URL(context.request.url);
  const proxiedPath = upstream.pathname.replace(/^\/api\/easeus/, "");
  const target = new URL(`https://multimedia.easeus.com${proxiedPath}${upstream.search}`);

  const headers = new Headers(context.request.headers);
  headers.delete("host");
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ray");
  headers.delete("x-forwarded-proto");
  headers.delete("x-real-ip");

  const init = {
    method: context.request.method,
    headers,
    redirect: "follow",
  };

  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    init.body = context.request.body;
  }

  return fetch(target, init);
}
