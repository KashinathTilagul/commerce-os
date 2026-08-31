import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import { defineConfig, type PreviewServer } from "vite";
import {
  resolveNovncTarget,
  safeProxyHeaders,
  safeProxyResponseHeaders,
  stripSensitiveHandshakeHeaders,
} from "./screen-proxy.ts";

function attachNovncProxy(server: PreviewServer, secret: string) {
  server.middlewares.use((req, res, next) => {
    if (!req.url?.startsWith("/novnc/")) return next();
    const target = resolveNovncTarget(req.url, secret);
    if (!target) {
      res.statusCode = 403;
      return res.end("Invalid or expired screen capability");
    }
    const transport = target.protocol === "https:" ? https : http;
    const upstream = transport.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.path,
        method: req.method,
        headers: {
          ...safeProxyHeaders(req.headers),
          host: `${target.hostname}:${target.port}`,
        },
        ...(target.protocol === "https:" ? { servername: target.hostname } : {}),
      },
      (incoming) => {
        res.writeHead(incoming.statusCode ?? 502, {
          ...safeProxyResponseHeaders(incoming.headers),
          "access-control-allow-origin": "*",
        });
        incoming.pipe(res);
      },
    );
    upstream.on("error", (error) => {
      res.statusCode = 502;
      res.end(error.message);
    });
    req.pipe(upstream);
  });

  server.httpServer?.on("upgrade", (req, socket, head) => {
    if (!req.url?.startsWith("/novnc/")) return;
    const target = resolveNovncTarget(req.url, secret);
    if (!target) return socket.destroy();
    const upstream =
      target.protocol === "https:"
        ? tls.connect({ port: target.port, host: target.hostname, servername: target.hostname })
        : net.connect(target.port, target.hostname);
    upstream.once(target.protocol === "https:" ? "secureConnect" : "connect", () => {
      const lines = [
        `${req.method ?? "GET"} ${target.path} HTTP/1.1`,
        `Host: ${target.hostname}:${target.port}`,
      ];
      for (const [key, value] of Object.entries(safeProxyHeaders(req.headers))) {
        lines.push(`${key}: ${Array.isArray(value) ? value.join(",") : value}`);
      }
      upstream.write(`${lines.join("\r\n")}\r\n\r\n`);
      if (head.length) upstream.write(head);
      socket.pipe(upstream);
      const chunks: Buffer[] = [];
      let size = 0;
      const forwardHandshake = (chunk: Buffer) => {
        chunks.push(chunk);
        size += chunk.length;
        if (size > 64 * 1024) {
          socket.destroy();
          return upstream.destroy();
        }
        const response = Buffer.concat(chunks, size);
        if (response.indexOf("\r\n\r\n") < 0) return;
        const safe = stripSensitiveHandshakeHeaders(response);
        if (!safe) {
          socket.destroy();
          return upstream.destroy();
        }
        upstream.off("data", forwardHandshake);
        socket.write(safe);
        upstream.pipe(socket);
      };
      upstream.on("data", forwardHandshake);
    });
    upstream.on("error", () => socket.destroy());
    socket.on("error", () => upstream.destroy());
  });
}

export default defineConfig(() => {
  const api = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3100";
  const secret = process.env.SCREEN_PROXY_SECRET;
  if (!secret || secret.length < 32) throw new Error("SCREEN_PROXY_SECRET must be at least 32 characters");
  return {
    plugins: [
      {
        name: "ekvaar-novnc-proxy",
        configurePreviewServer: (server) => attachNovncProxy(server, secret),
      },
    ],
    preview: {
      host: "0.0.0.0",
      port: Number(process.env.WEB_PORT ?? 5173),
      allowedHosts: [process.env.RAKAZO_HOST ?? "localhost"],
      proxy: {
        "/api": { target: api, changeOrigin: true },
        "/rpc": { target: api, changeOrigin: true },
      },
    },
  };
});
