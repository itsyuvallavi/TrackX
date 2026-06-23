// Owner: root. Safe environment readiness checks without printing secret values.
import { existsSync, readFileSync } from "node:fs";

const DEFAULT_FILE = ".env";
const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "postgres",
  "redis",
  "api",
  "parser",
]);

const TARGETS = {
  local: {
    required: [
      "DATABASE_URL",
      "REDIS_URL",
      "OPENAI_MODEL",
      "PARSER_BASE_URL",
      "API_BASE_URL",
      "DEFAULT_TIMEZONE",
      "DEFAULT_CURRENCY",
    ],
    hostedRequired: [],
  },
  vercel: {
    required: [
      "DATABASE_URL",
      "DIRECT_URL",
      "OPENAI_API_KEY",
      "OPENAI_MODEL",
      "DEFAULT_TIMEZONE",
      "DEFAULT_CURRENCY",
    ],
    hostedRequired: ["DATABASE_URL", "DIRECT_URL"],
  },
  cloudflare: {
    required: ["TELEGRAM_BOT_TOKEN", "API_BASE_URL", "TRACKX_API_SECRET"],
    hostedRequired: ["API_BASE_URL"],
  },
};

const args = parseArgs(process.argv.slice(2));
const file = args.file ?? DEFAULT_FILE;
const target = args.target ?? "local";

if (!Object.hasOwn(TARGETS, target)) {
  fail(`Unknown target "${target}". Use local, vercel, or cloudflare.`);
}

if (!existsSync(file)) {
  fail(`${file} does not exist.`);
}

const parsed = parseEnvFile(file);
const errors = [];
const warnings = [];
const targetRules = TARGETS[target];

for (const issue of parsed.issues) {
  errors.push(issue);
}

for (const key of targetRules.required) {
  if (!parsed.values.get(key)) {
    errors.push(`${key} is missing or empty for ${target}.`);
  }
}

for (const key of targetRules.hostedRequired) {
  const value = parsed.values.get(key);
  const urlKind = classifyUrl(value);

  if (urlKind === "invalid") {
    errors.push(`${key} must be a valid URL for ${target}.`);
  } else if (urlKind.startsWith("local:")) {
    errors.push(`${key} points at ${urlKind}; ${target} needs a hosted URL.`);
  }
}

for (const key of parsed.values.keys()) {
  if (isUnsafePublicSecretName(key)) {
    errors.push(`${key} looks like a secret but is public.`);
  }

  if (key.startsWith("SUPABASE_") || key.startsWith("NEXT_PUBLIC_SUPABASE_")) {
    warnings.push(
      `${key} is present but TrackX currently uses Prisma URLs, not Supabase client keys.`,
    );
  }
}

printReport({ file, target, parsed, errors, warnings });

if (errors.length > 0) {
  process.exitCode = 1;
}

function parseArgs(rawArgs) {
  const result = {};

  for (const arg of rawArgs) {
    if (arg === "--") {
      continue;
    }

    if (arg.startsWith("--file=")) {
      result.file = arg.slice("--file=".length);
    } else if (arg.startsWith("--target=")) {
      result.target = arg.slice("--target=".length);
    } else {
      fail(`Unknown argument "${arg}".`);
    }
  }

  return result;
}

function parseEnvFile(path) {
  const values = new Map();
  const issues = [];
  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      issues.push(`Line ${index + 1} is not KEY=value syntax.`);
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = unquote(trimmed.slice(separator + 1).trim());

    if (!/^[A-Z0-9_]+$/.test(key)) {
      issues.push(`Line ${index + 1} has an invalid env key.`);
      continue;
    }

    values.set(key, value);
  }

  return { values, issues };
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function classifyUrl(value) {
  if (!value) {
    return "empty";
  }

  try {
    const { hostname } = new URL(value);
    return LOCAL_HOSTS.has(hostname) ? `local:${hostname}` : "hosted";
  } catch {
    return "invalid";
  }
}

function isUnsafePublicSecretName(key) {
  return (
    key.startsWith("NEXT_PUBLIC_") &&
    /SECRET|TOKEN|PASSWORD|PRIVATE|SERVICE_ROLE/.test(key)
  );
}

function printReport({ file, target, parsed, errors, warnings }) {
  console.log(`Env check file=${file} target=${target}`);
  console.log(`Keys parsed: ${parsed.values.size}`);

  for (const warning of warnings) {
    console.log(`WARN ${warning}`);
  }

  if (errors.length === 0) {
    console.log("Result: ok");
    return;
  }

  for (const error of errors) {
    console.log(`ERROR ${error}`);
  }

  console.log("Result: failed");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
