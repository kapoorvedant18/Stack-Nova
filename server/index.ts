import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { createClient } from "@supabase/supabase-js";
import router from "./routes";
import { storageMode } from "./storage";

const app = express();
const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY."
  );
}

async function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = authHeader.slice(7);
  try {
    const supabase = createClient(supabaseUrl!, supabaseKey!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }
    (req as any).userId = user.id;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Auth error" });
  }
}

app.use("/api", authMiddleware, router);

app.get("/health", (_req, res) => res.json({ ok: true, storageMode }));

const server = createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

export default server;
