// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  edgeExternals: [
    "node:fs",
    "node:os",
    "node:child_process",
    "node:net",
    "node:tls",
    "node:dns",
    "node:readline",
    "node:repl",
    "node:domain",
    "node:cluster",
    "node:v8",
    "node:inspector",
    "node:perf_hooks",
    "node:tty",
  ],
});
