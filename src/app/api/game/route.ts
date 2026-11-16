import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { transact } from "@/lib/game-service";
import { actionSchema } from "@/game/actions";
import { z } from "zod";
import { sameOrigin } from '@/lib/same-origin';
export const runtime = "nodejs";
export async function GET() {
  const { data: s } = await auth.getSession();
  if (!s?.user)
    return Response.json(
      { error: "Entre para visitar seu refúgio." },
      { status: 401 },
    );
  const [r] =
    await db`SELECT state FROM properties WHERE owner_id=${s.user.id}`;
  return Response.json(
    { state: r?.state ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  const { data: s } = await auth.getSession();
  if (!s?.user)
    return Response.json(
      { error: "Sua sessão terminou. Entre novamente." },
      { status: 401 },
    );
  try {
    if (Number(req.headers.get("content-length") ?? 0) > 4096)
      return Response.json({ error: "Pedido grande demais." }, { status: 413 });
    const body = z
      .object({ action: actionSchema, idempotencyKey: z.uuid() })
      .parse(await req.json());
    const result = await transact(s.user.id, body.action, body.idempotencyKey);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError)
      return Response.json(
        { error: "Confira os dados da ação." },
        { status: 400 },
      );
    if (error instanceof Error && !("severity" in error))
      return Response.json({ error: error.message }, { status: 409 });
    console.error("Falha de persistência do jogo");
    return Response.json(
      { error: "Não conseguimos guardar essa ação. Tente novamente." },
      { status: 503 },
    );
  }
}
