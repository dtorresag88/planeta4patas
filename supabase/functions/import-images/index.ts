// Planeta 4 Patas · Edge Function "import-images"
// Copia las fotos de producto alojadas en sitios externos al Storage propio (bucket "productos")
// y actualiza image_url. Solo administradores. Se ejecuta desde el panel: Productos > "Copiar fotos a la tienda".
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const URL_ = Deno.env.get("SUPABASE_URL")!;
const db = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Verifica que quien llama sea administrador
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const { data: u } = await db.auth.getUser(token);
  if (!u?.user) return json({ error: "No autorizado" }, 401);
  const { data: admin } = await db.from("admins").select("user_id").eq("user_id", u.user.id).is("disabled_at", null).maybeSingle();
  if (!admin) return json({ error: "No autorizado" }, 403);

  const own = `${URL_}/storage/v1/object/public/productos/`;
  const { data: products } = await db.from("products").select("id, slug, image_url").not("image_url", "is", null);
  let copied = 0;
  const failed: string[] = [];
  for (const p of products ?? []) {
    if (p.image_url.startsWith(own)) continue;
    try {
      const r = await fetch(p.image_url);
      if (!r.ok) throw new Error(String(r.status));
      const type = r.headers.get("content-type") ?? "image/jpeg";
      const ext = type.includes("webp") ? "webp" : type.includes("png") ? "png" : "jpg";
      const path = `catalogo/${p.slug}.${ext}`;
      const { error } = await db.storage.from("productos").upload(path, await r.arrayBuffer(), { contentType: type, upsert: true, cacheControl: "31536000" });
      if (error) throw error;
      await db.from("products").update({ image_url: own + path }).eq("id", p.id);
      copied++;
    } catch {
      failed.push(p.slug);
    }
  }
  return json({ copied, failed });
});
