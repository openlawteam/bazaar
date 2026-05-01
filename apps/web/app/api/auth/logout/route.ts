import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete("bazaar_session");
  return response;
}
