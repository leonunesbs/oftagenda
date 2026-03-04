#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const lockPath = join(process.cwd(), ".next", "dev", "lock");
const isWindows = process.platform === "win32";
const nextPort = process.env.NEXT_PORT || "3001";

const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
};

function printBanner() {
  console.log(`${colors.cyan}=== Dev Panel ===${colors.reset}`);
  console.log(`${colors.dim}Convex:${colors.reset} npx convex dev`);
  console.log(`${colors.dim}Next:${colors.reset}   pnpm exec next dev -p ${nextPort}`);
  console.log(`${colors.dim}Tip:${colors.reset}     Ctrl+C stops both servers`);
  console.log("");
}

function ensureNextLockIsSafe() {
  if (!existsSync(lockPath)) {
    return;
  }

  try {
    execFileSync("lsof", [lockPath], { stdio: "ignore" });
    console.error(
      "Another Next.js dev instance is already running (lock file is active). Stop it before running `pnpm dev` again.",
    );
    process.exit(1);
  } catch (error) {
    // lsof exits with status 1 when no process holds this file, which means stale lock.
    if (typeof error === "object" && error && "status" in error && error.status === 1) {
      rmSync(lockPath, { force: true });
      console.log(`${colors.yellow}Removed stale Next.js lock at .next/dev/lock${colors.reset}`);
      return;
    }

    console.warn(
      "Could not verify Next.js lock ownership. Continuing without lock cleanup.",
    );
  }
}

function pipeWithPrefix(stream, prefix, color) {
  if (!stream) {
    return;
  }

  let buffer = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.length === 0) {
        process.stdout.write("\n");
      } else {
        process.stdout.write(`${color}[${prefix}]${colors.reset} ${line}\n`);
      }
    }
  });
  stream.on("end", () => {
    if (buffer.length > 0) {
      process.stdout.write(`${color}[${prefix}]${colors.reset} ${buffer}\n`);
    }
  });
}

function runCommand(label, color, command, args) {
  const child = spawn(command, args, {
    stdio: ["inherit", "pipe", "pipe"],
    shell: isWindows,
  });
  pipeWithPrefix(child.stdout, label, color);
  pipeWithPrefix(child.stderr, label, color);
  return child;
}

function stopProcess(child) {
  if (!child || child.killed) {
    return;
  }
  child.kill("SIGINT");
}

function runDev() {
  const convex = runCommand("CONVEX", colors.cyan, "npx", ["convex", "dev"]);
  const next = runCommand("NEXT", colors.magenta, "pnpm", ["exec", "next", "dev", "-p", nextPort]);

  let isShuttingDown = false;
  let exitCode = 0;

  const shutdown = (signal) => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    console.log(`\n${colors.dim}Shutting down (${signal})...${colors.reset}`);
    stopProcess(convex);
    stopProcess(next);
  };

  const handleExit = (name, other, code, signal) => {
    if (!isShuttingDown) {
      if (signal) {
        console.error(`${colors.red}${name} exited by signal ${signal}.${colors.reset}`);
      } else if ((code ?? 0) !== 0) {
        console.error(`${colors.red}${name} exited with code ${code}.${colors.reset}`);
      } else {
        console.log(`${colors.green}${name} exited cleanly.${colors.reset}`);
      }
      exitCode = code ?? 1;
      shutdown(name);
      stopProcess(other);
    }
  };

  convex.on("error", (error) => {
    console.error(`${colors.red}Failed to start Convex:${colors.reset}`, error);
    exitCode = 1;
    shutdown("convex-error");
  });
  next.on("error", (error) => {
    console.error(`${colors.red}Failed to start Next:${colors.reset}`, error);
    exitCode = 1;
    shutdown("next-error");
  });

  convex.on("exit", (code, signal) => handleExit("CONVEX", next, code, signal));
  next.on("exit", (code, signal) => handleExit("NEXT", convex, code, signal));

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  const finalize = () => {
    process.exit(exitCode);
  };

  convex.on("close", () => {
    if (next.exitCode !== null && next.exitCode !== undefined) {
      finalize();
    }
  });
  next.on("close", () => {
    if (convex.exitCode !== null && convex.exitCode !== undefined) {
      finalize();
    }
  });
}

printBanner();
ensureNextLockIsSafe();
runDev();
