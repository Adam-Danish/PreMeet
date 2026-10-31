export const maxDuration = 180;

// Connection-specific headers must not cross the proxy boundary.
function forwardingHeaders(source: Headers): Headers {
  const headers = new Headers(source);
  const connectionHeaders = headers.get("connection")?.split(",") ?? [];
  for (const name of connectionHeaders) {
    if (name.trim()) headers.delete(name.trim());
  }
  for (const name of [
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length",
  ]) {
    headers.delete(name);
  }
  return headers;
}

async function proxy(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  // Vercel injects this binding into functions at runtime. Keep it server-only.
  const baseUrl =
    process.env.BACKEND_URL ||
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000/" : undefined);

  if (!baseUrl) {
    return Response.json(
      { detail: "Backend service binding is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    // Preserve the binding's base path and the backend's existing /api prefix.
    const target = new URL(baseUrl);
    target.pathname = `${target.pathname.replace(/\/$/, "")}${incoming.pathname}`;
    target.search = incoming.search;

    const headers = forwardingHeaders(request.headers);
    headers.set("accept-encoding", "identity");

    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
      signal: request.signal,
    });

    const responseHeaders = forwardingHeaders(upstream.headers);
    // fetch decodes compressed responses; don't forward their old encoding.
    responseHeaders.delete("content-encoding");
    responseHeaders.set("Cache-Control", "no-store");

    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { detail: "Backend service is unavailable. Please try again." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as HEAD,
  proxy as OPTIONS,
};
