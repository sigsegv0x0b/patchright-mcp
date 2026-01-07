# Patchright MCP Agent Instructions

These instructions are for coding agents updating upstream versions or the Patchright dependency.

## Update the upstream playwright-mcp version

1) Check the latest upstream version:
   - `npm view @playwright/mcp version`
2) Sync versions across this repo:
   - `package.json` -> `version`
   - `extension/package.json` -> `version`
   - `extension/manifest.json` -> `version`
3) Refresh lockfiles:
   - `npm install --package-lock-only`
   - `cd extension && npm install --package-lock-only`
4) Sanity-check:
   - `rg -n "\"version\"" package.json extension/package.json extension/manifest.json` to confirm versions match.

## Update the Patchright version

1) Check the latest Patchright version:
   - `npm view patchright version`
2) Update dependency:
   - `package.json` -> `dependencies.patchright`
3) Refresh lockfile:
   - `npm install --package-lock-only`
4) Sanity-check:
   - `rg -n "patchright" package.json package-lock.json` to confirm the new version is captured.

## Notes

- Keep the package name as `patchright-mcp` and the CLI bin as `mcp-server-patchright`.
- `PLAYWRIGHT_MCP_EXTENSION_TOKEN` is retained for compatibility with the upstream server.
