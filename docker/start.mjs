import { spawn } from "node:child_process";
import { once } from "node:events";

function sqliteLoads(nodeArgs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [...nodeArgs, "--input-type=module", "-e", "import 'node:sqlite'"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}

const extra = (await sqliteLoads([])) ? [] : ["--experimental-sqlite"];
if (!(await sqliteLoads(extra))) {
  console.error("node:sqlite did not load");
  process.exit(1);
}

const server = spawn(process.execPath, [...extra, "server.js"], { stdio: "inherit" });
server.on("error", () => process.exit(1));
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.kill(signal));
}
const [code] = await once(server, "exit");
process.exit(code ?? 1);
