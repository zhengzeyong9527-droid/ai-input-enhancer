# 发布指南 / Publishing Guide

## 发布前条件

- 拥有可管理的 GitHub 仓库。
- 如需发布 npm，拥有可发布该包名的 npm 账户。
- 如需上架 DSH Marketplace，拥有目标 Marketplace 的提交权限。
- 工作区中不得含 API Key、本地 profile 路径或私有文档。

> English: You need a GitHub repository, npm authorization when publishing to npm, Marketplace access when submitting there, and a clean working tree without credentials or private material.

## 发布前检查

```sh
npm run check
npm pack --dry-run
```

发布前确认 `package.json` 中的 `repository.url` 指向真实 GitHub 仓库。确认包名可用；如有冲突，可使用类似 `@your-org/dsh-prompt-optimizer` 的 scoped package。

> English: Verify the repository URL and package-name availability before publishing.

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

从 `v0.1.0` 创建 GitHub Release，并将对应版本的变更记录复制到 Release Notes。

> English: Create the GitHub Release from the version tag and use the matching changelog section as its notes.

## npm

```sh
npm login
npm publish --access public
```

Scoped package 必须使用 `package.json` 中配置的准确名称。`prepack` 会在打包前执行构建和测试。

> English: Use the exact configured package name. `prepack` builds and tests before packing.

## DSH Marketplace

通过 Marketplace 当前支持的提交表单或 CLI，提交已发布 npm 包或公开 GitHub Release URL，并提供包名、版本、MIT 许可证、仓库 URL、README 与隐私行为说明。对干净的 Web profile 验证安装命令后，再对外发布。

> English: Submit the published npm package or public GitHub release URL with package metadata, README, and accurate privacy behavior; verify installation from a clean Web profile before announcing it.

## 发布检查清单 / Release Checklist

- [ ] 仓库 URL 正确。
- [ ] 包名可用且已最终确认。
- [ ] `npm run check` 通过。
- [ ] `npm pack --dry-run` 只包含预期文件。
- [ ] README 和变更记录与发布版本一致。
- [ ] 不包含凭据、profile lockfile 或本地路径。
- [ ] GitHub tag、Release 与 `package.json` 使用相同版本。
- [ ] Marketplace 描述准确说明 opt-in 上下文与隐私限制。
