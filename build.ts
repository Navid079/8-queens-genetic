import tailwind from "bun-plugin-tailwind";
import { mkdir, rm } from "node:fs/promises";

const worker = await Bun.build({
  entrypoints: ["./web/solver.worker.ts"],
  target: "browser",
  format: "iife",
  minify: true,
  define: { "import.meta.main": "false" },
});
if (!worker.success) throw new AggregateError(worker.logs, "Worker build failed");
const source = await worker.outputs[0]!.text();

await rm("./dist", { recursive: true, force: true });
await mkdir("./dist", { recursive: true });
const result = await Bun.build({
  entrypoints: ["./index.html"],
  outdir: "./dist",
  target: "browser",
  compile: true,
  minify: true,
  plugins: [tailwind],
  define: { __SOLVER_SOURCE__: JSON.stringify(source) },
});
if (!result.success) throw new AggregateError(result.logs, "Interface build failed");
console.log("Built standalone dist/index.html — open it directly in your browser.");
