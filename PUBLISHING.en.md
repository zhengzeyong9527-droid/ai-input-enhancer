# Publishing Guide

[中文](PUBLISHING.md) | [English](PUBLISHING.en.md)

## Prerequisites

- A GitHub repository you control.
- An npm account authorized to publish the package name, if publishing to npm.
- Access to the target DSH Marketplace submission flow, if submitting there.
- A working tree without API keys, local profile paths, or private documents.

## Preflight

```sh
npm run check
npm pack --dry-run
```

Verify that `package.json` has the real GitHub repository URL and that the package name is available.

## GitHub

```sh
git add .
git commit -m "feat: release"
git push origin main
git tag v0.1.0
git push origin v0.1.0
```

Create the GitHub Release from the version tag and copy the matching changelog section into the release notes.

## npm

```sh
npm login
npm publish --access public
```

`prepack` builds and tests before packing.

## DSH Marketplace

Submit the published npm package or public GitHub release URL through the current Marketplace form or CLI. Provide package metadata, the MIT license, repository URL, README, and accurate privacy behavior. Verify installation from a clean Web profile before announcing the release.

## Release Checklist

- [ ] Repository URL is correct.
- [ ] Package name is final and available.
- [ ] `npm run check` passes.
- [ ] `npm pack --dry-run` contains only expected files.
- [ ] README and changelog match the release.
- [ ] No credentials, profile lockfiles, or local paths are included.
- [ ] GitHub tag, release, and `package.json` use the same version.
- [ ] Marketplace description accurately covers opt-in context and privacy limits.
