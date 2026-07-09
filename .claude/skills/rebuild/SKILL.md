---
name: rebuild
description: Rebuild the NyaaChat-MCP Docker image and restart containers. Use this whenever the project needs a Docker rebuild + restart (e.g., after Dockerfile, docker-compose.yml, or TypeScript source changes that need to be baked into the image). Runs rebuild.py — a cross-platform Python script that works on Windows, Linux, and macOS.
---

# rebuild

本项目需要重新编译 Docker 镜像并重启容器时调用此 skill。

## 触发场景

- 用户明确要求"重新编译"、"重建镜像"、"重启容器"、"rebuild"。
- 改动了 `Dockerfile`、`docker-compose.yml`。
- 改动了进入镜像的源码或构建配置：`src/**/*.ts`、`package.json` / `package-lock.json`、`tsconfig.json`。
- 通过 `/rebuild` 显式调用。

不需要 rebuild 的情况：仅改了 `.env`——它由 `docker-compose.yml` 的 `env_file` 在容器启动时读取，没烘进镜像。理论上 `docker compose up -d --force-recreate` 就够了；但用 rebuild 脚本也不会出错，只是慢一点。

## 执行方式

所有平台统一使用 Python 脚本（无平台差异，无需绕过执行策略）：

```
python rebuild.py
```

- `--no-cache`：强制无缓存完全重建。
- `--skip-push`：仅本地构建 + 重启，不推送私有仓库（离线调试用）。

脚本流程：停止容器 → 构建镜像（tag = git short SHA + latest）→ 推送到 NyaaDockerHUB 私有仓库 → 仓库端清理旧 tag → `docker compose up -d` 重启 → 本地清理本项目旧 tag 与悬空镜像。

## 执行规则

- 执行前请确认工作目录是项目根目录（含 `docker-compose.yml`）。
- 执行后向用户简要汇报：脚本是否成功结束、当前运行中的容器状态。

## 不要做的事

- 不要绕过脚本直接调用 `docker compose build`/`up`/`down`——使用脚本能保证流程一致。
- 不要使用已删除的 `rebuild.ps1` / `rebuild.sh`（已迁移到 `rebuild.py`）。
