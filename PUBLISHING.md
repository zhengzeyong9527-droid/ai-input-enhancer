# Publishing

## Prerequisites

- A GitHub repository you control.
- An npm account authorized to publish the selected package name, if publishing to npm.
- Access to the target DSH Marketplace submission flow, if marketplace publication is desired.
- No API keys, local profile paths, or private documents in the working tree.

## Preflight

```sh
npm run check
npm pack --dry-run
```

Before publishing, replace the `repository.url` placeholder in `package.json` with the actual GitHub repository URL. Confirm the package name is available or use a scoped package name such as `@your-org/dsh-prompt-optimizer`.

## GitHub

```sh
git init
git add .
git commit -m "feat: initial prompt optimizer release"
git branch -M main
git remote add origin https://github.com/OWNER/zzy-dsh-prompt-optimizer.git
git push -u origin main
git tag v0.1.0
git push origin v0.1.0
```

Create a GitHub release from `v0.1.0` and copy the matching changelog section into the release notes.

## npm

```sh
npm login
npm publish --access public
```

For a scoped package, use the exact package name configured in `package.json`. `prepack` runs the build and tests before packaging.

## DSH Marketplace

Use the marketplace's current package submission form or CLI. Submit the published npm package or the public GitHub release URL, then provide the package name, version, MIT license, repository URL, README, and privacy behavior. Verify the marketplace install command against a clean Web profile before announcing the release.

## Release checklist

- [ ] Repository URL is correct.
- [ ] Package name is available and final.
- [ ] `npm run check` passes.
- [ ] `npm pack --dry-run` contains only expected release files.
- [ ] README and changelog match the release.
- [ ] No credentials, profile lockfiles, or local paths are included.
- [ ] GitHub tag and release use the same version as `package.json`.
- [ ] Marketplace listing describes opt-in context and privacy limits accurately.
