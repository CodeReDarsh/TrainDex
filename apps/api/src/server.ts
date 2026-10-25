import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { readFileSync } from "node:fs";
import { identify } from "./identify.ts";
import { lines } from "./lines.ts";
import { lineStatus } from "./status.ts";

const app = Fastify({ logger: true });

await app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024, files: 1 } });

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

const page = readFileSync(new URL("../public/index.html", import.meta.url));

app.get("/", (_req, reply) => reply.type("text/html").send(page));

app.get("/healthz", async () => ({ ok: true }));

app.get("/v1/lines", async () => lines);

app.get<{ Params: { route: string } }>("/v1/lines/:route/status", async (req, reply) => {
  try {
    const status = await lineStatus(req.params.route.toUpperCase());
    if (!status) return reply.code(404).send({ error: { code: "no_feed", message: "No live feed for this line" } });
    return status;
  } catch (err) {
    req.log.warn(err, "mta feed failed");
    return reply.code(503).send({ error: { code: "mta_unavailable", message: "MTA live data is unavailable right now" } });
  }
});

app.post("/v1/identify", async (req, reply) => {
  const file = await req.file();
  if (!file) return reply.code(400).send({ error: { code: "no_image", message: "Send the photo as an 'image' field" } });
  if (!allowed.has(file.mimetype)) {
    return reply.code(415).send({ error: { code: "bad_type", message: `Unsupported image type ${file.mimetype}` } });
  }

  const image = await file.toBuffer();

  try {
    return await identify(image, file.mimetype);
  } catch (err) {
    req.log.error(err, "gemini call failed");
    return reply.code(502).send({ error: { code: "identify_failed", message: "Couldn't read the photo, try again" } });
  }
});

await app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" });
