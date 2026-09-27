const { spawn, spawnSync } = require("node:child_process");
const { once } = require("node:events");
const { existsSync, rmSync } = require("node:fs");
const path = require("node:path");

const mobileRoot = path.resolve(__dirname, "..");
const backendRoot = path.resolve(mobileRoot, "..", "backend");
const python =
  process.env.PYTHON ??
  path.resolve(mobileRoot, "..", ".venv", "Scripts", "python.exe");
const databaseName = `profile_flow_e2e_${process.pid}_${Date.now()}.db`;
const databaseFile = path.join(backendRoot, "instance", databaseName);
const databaseUrl = `sqlite:///${databaseName}`;
const serverUrl = "http://127.0.0.1:5001/api/auth/me";
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  EXPO_PUBLIC_API_URL: "http://127.0.0.1:5001/api",
  FLASK_ENV: "testing",
  PORT: "5001",
};

async function removeDatabase() {
  for (const suffix of ["-shm", "-wal", ""]) {
    const file = `${databaseFile}${suffix}`;
    for (let attempt = 0; existsSync(file) && attempt < 12; attempt += 1) {
      try {
        rmSync(file, { force: true });
      } catch (error) {
        if (error.code !== "EPERM" || attempt === 11) throw error;
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }
  }
}

function run(command, args, cwd, childEnv) {
  const result = spawnSync(command, args, {
    cwd,
    env: childEnv,
    stdio: "inherit",
    shell: process.platform === "win32" && command.endsWith(".cmd"),
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} exited with ${result.status}`);
}

async function waitForServer(server) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      throw new Error("Flask exited before becoming ready.");
    try {
      const response = await fetch(serverUrl);
      if (response.status === 401) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Flask did not become ready within 30 seconds.");
}

async function main() {
  await removeDatabase();
  let server;
  try {
    run(
      python,
      ["-m", "flask", "--app", "run.py", "db", "upgrade"],
      backendRoot,
      env,
    );
    server = spawn(
      python,
      [
        "-m",
        "flask",
        "--app",
        "run.py",
        "run",
        "--host",
        "127.0.0.1",
        "--port",
        "5001",
      ],
      { cwd: backendRoot, env, stdio: "inherit" },
    );
    await waitForServer(server);
    run(
      process.execPath,
      [
        path.join(mobileRoot, "node_modules", "jest", "bin", "jest.js"),
        "--runInBand",
        "--testTimeout=30000",
      ],
      mobileRoot,
      env,
    );
  } finally {
    if (server && server.exitCode === null) {
      const exited = once(server, "exit");
      server.kill();
      await exited;
    }
    await removeDatabase();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
