<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Notable in this repo: request middleware lives in `src/proxy.ts` (the Next 16 rename of `middleware.ts`), exporting `proxy(request)` and `config`.
<!-- END:nextjs-agent-rules -->
