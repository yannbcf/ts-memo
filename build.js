import { build } from "esbuild";

build({
    bundle: true,
    target: "esnext",
    platform: "node",
    logLevel: "info",
    format: "esm",
    entryPoints: ["./src/index.ts"],
    outdir: "./dist",
    splitting: false,
    plugins: [],
});
