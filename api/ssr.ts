// Vercel Serverless Function for React Router 7 SSR
import { createRequestHandler } from "@react-router/express";
import express from "express";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Polyfill for Vercel request/response to Express
const app = express();

app.use(express.json());

// Handle all routes with React Router SSR
app.all("*", async (req: any, res: any) => {
  try {
    // Dynamic import to load the server build
    const build = await import("./build/server/index.js");
    
    const handler = createRequestHandler({
      build,
      mode: process.env.NODE_ENV || "production",
    });

    return handler(req, res);
  } catch (error: any) {
    console.error("SSR Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Vercel export
export default function handler(req: VercelRequest, res: VercelResponse) {
  app(req as any, res as any);
}
