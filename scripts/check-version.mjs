import { readFileSync } from "node:fs";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const manifest = readJson("manifest.json");
const versions = readJson("versions.json");
const changelog = readFileSync("CHANGELOG.md", "utf8");

const version = packageJson.version;
const failures = [];

if (manifest.version !== version) {
  failures.push(`manifest.json version is ${manifest.version}, expected ${version}.`);
}

if (packageLock.version !== version) {
  failures.push(`package-lock.json root version is ${packageLock.version}, expected ${version}.`);
}

if (packageLock.packages?.[""]?.version !== version) {
  failures.push(`package-lock.json package version is ${packageLock.packages?.[""]?.version}, expected ${version}.`);
}

if (versions[version] !== manifest.minAppVersion) {
  failures.push(`versions.json must include "${version}": "${manifest.minAppVersion}".`);
}

if (!changelog.includes(`## ${version}`)) {
  failures.push(`CHANGELOG.md must include a "## ${version}" section.`);
}

if (version.startsWith("v")) {
  failures.push("Version must not start with v. Obsidian release tags must match the manifest version exactly.");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Version metadata is aligned for ${version}.`);
