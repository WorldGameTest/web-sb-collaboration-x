import { EMAIL_PREVIEWS } from "@/lib/email/templates";

/** Dev-only: returns one template's raw HTML, for screenshotting. */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }
  const key = new URL(request.url).searchParams.get("key");
  const found = EMAIL_PREVIEWS.find((p) => p.key === key);
  if (!found) return new Response("Unknown template", { status: 404 });
  return new Response(found.build().html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
