import { handleRequest } from "../../../src/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function route(request: Request): Promise<Response> {
  return handleRequest(request);
}

export const GET = route;
export const POST = route;
export const DELETE = route;
