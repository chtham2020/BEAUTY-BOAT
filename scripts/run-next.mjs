import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const [, , modeArg, ...rawArgs] = process.argv;
const mode = modeArg === "start" ? "start" : "dev";

function readDotEnv() {
  if (!existsSync(".env")) {
    return {};
  }

  return readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return values;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        return values;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      values[key] = rawValue.replace(/^["']|["']$/g, "");
      return values;
    }, {});
}

function takeOption(args, names) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const match = names.find((name) => arg === name || arg.startsWith(`${name}=`));
    if (!match) {
      continue;
    }

    if (arg.includes("=")) {
      return {
        value: arg.slice(arg.indexOf("=") + 1),
        args: args.filter((_, argIndex) => argIndex !== index),
      };
    }

    return {
      value: args[index + 1],
      args: args.filter((_, argIndex) => argIndex !== index && argIndex !== index + 1),
    };
  }

  return { value: undefined, args };
}

const dotEnv = readDotEnv();
const portOption = takeOption(rawArgs, ["--port", "-p"]);
const hostOption = takeOption(portOption.args, ["--host", "--hostname", "-H"]);
const port = portOption.value || process.env.BEAUTY_BOAT_PORT || dotEnv.BEAUTY_BOAT_PORT || "3000";
const host = hostOption.value || process.env.BEAUTY_BOAT_HOST || dotEnv.BEAUTY_BOAT_HOST || "0.0.0.0";
const args = [mode, "--hostname", host, "--port", port, ...hostOption.args];

console.log(`Beauty Boat ${mode} server: http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);

const child = spawn("next", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
