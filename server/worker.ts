import { Hono } from "hono";
import { api } from "./api";
import type { ContextType } from "./types";
const app = new Hono<ContextType>();
app.route("/api", api);
app.all("*", async (c) =>
  c.env.ASSETS
    ? c.env.ASSETS.fetch(c.req.raw)
    : c.text("Recursos web no disponibles", 503),
);
export default app;
