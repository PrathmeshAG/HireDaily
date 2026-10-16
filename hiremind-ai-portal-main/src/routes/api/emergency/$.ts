import { createFileRoute } from "@tanstack/react-router";

const allowedPaths = new Set(["status", "login", "mappings", "instagram-media"]);
const allowedMethods = new Set(["GET", "POST"]);

async function proxyEmergencyRequest(request: Request, splat: string | undefined) {
  const path = (splat || "").replace(/^\/+|\/+$/g, "");
  const method = request.method.toUpperCase();
  const origin = request.headers.get("origin");
  if (method === "POST" && origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  if (!allowedPaths.has(path) || !allowedMethods.has(method)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const backendBase = process.env.EMERGENCY_BACKEND_URL?.replace(/\/+$/, "");
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

  if (!backendBase || !bypassSecret) {
    console.error("Emergency proxy is missing server-side backend configuration.");
    return Response.json({ error: "Emergency API server configuration is incomplete." }, { status: 503 });
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`${backendBase}/api/emergency/${path}`);
  incomingUrl.searchParams.forEach((value, key) => targetUrl.searchParams.append(key, value));

  const headers = new Headers({
    "x-vercel-protection-bypass": bypassSecret,
    "accept": "application/json",
  });
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");
  if (contentType && method === "POST") headers.set("content-type", contentType);
  if (authorization) headers.set("authorization", authorization);

  let body: string | undefined;
  if (method === "POST") {
    body = await request.text();
    if (body.length > 16_384) {
      return Response.json({ error: "Request body too large." }, { status: 413 });
    }
  }

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });

    // Do not pass through Vercel's SSO HTML or protection redirects as if they were API responses.
    if (upstream.status >= 300 && upstream.status < 400) {
      console.error("Emergency backend returned a redirect; check its deployment protection bypass.");
      return Response.json({ error: "Emergency backend access is blocked. Check server-side deployment protection configuration." }, { status: 502 });
    }

    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get("content-type");
    if (upstreamContentType) responseHeaders.set("content-type", upstreamContentType);
    responseHeaders.set("cache-control", "no-store");
    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Emergency backend proxy request failed.", error);
    return Response.json({ error: "Emergency backend is unreachable." }, { status: 502 });
  }
}

export const Route = createFileRoute("/api/emergency/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => proxyEmergencyRequest(request, params._splat),
      POST: ({ request, params }) => proxyEmergencyRequest(request, params._splat),
    },
  },
});
