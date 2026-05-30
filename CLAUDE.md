# NyaaChat-MCP

## 项目概况

为 [NyaaChat](https://github.com/NyaaCaster/NyaaChat) 等基于 LLM 的角色扮演聊天平台提供 MCP（Model Context Protocol）支持的轻量服务。当前对外提供两个工具：`get_current_time`（实时时间）、`get_weather`（实时天气）。运行形态：Node 20 + TypeScript，单端点 `/mcp`，Streamable HTTP 传输，Docker 部署。

## 交流语言

默认始终以**简体中文**与用户交流，除非用户在某次对话中明确要求改用其他语言。

- 适用范围：所有面向用户的文字输出（解释、总结、提问、错误说明等）。
- 代码、标识符、命令行参数、文件路径、提交信息等仍按惯例使用英文。
- 即使用户的某条消息使用了英文，默认回复仍使用简体中文。

## 重新编译 Docker 镜像并重启容器

每当本项目需要重建镜像并重启容器（包括但不限于：用户明确要求 rebuild；改动了 `Dockerfile` / `docker-compose.yml`；改动了 `src/**/*.ts`、`package.json` / `package-lock.json`、`tsconfig.json` 等会进入镜像的源码或构建配置），必须通过 `rebuild` skill 来执行，不要手动拼 `docker compose` 命令。

- Windows 环境：执行 `powershell -ExecutionPolicy Bypass -File .\rebuild.ps1`。
- Linux / macOS 环境：执行 `bash ./rebuild.sh`。
- `-ExecutionPolicy Bypass` 参数在 Windows 下**必须**带上，避免本机执行策略拦截。
- 仅改 `.env` 不需要 rebuild——`docker-compose.yml` 用 `env_file` 在容器启动时挂载读取，`docker compose up -d --force-recreate` 即可。但 rebuild skill 也会顺手处理，不必特意区分。
- 详细规则见 `.claude/skills/rebuild/SKILL.md`。

## 更新 qinyapi 模型清单

每当用户要求"更新 qinyapi 模型清单"、"刷新分组模型"、"拉取最新模型列表"等（通常发生在 qinyapi 运营方调整了某分组的模型之后），使用 `update-qinyapi-models` skill 完成，不要手动逐个改 `src/qinyapi/groups.ts` 的 `models` 数组。

- 脚本 `scripts/update-qiny-models.mjs`：用 `.env` 中各分组的 apikey 实时请求 `GET /v1/models`，把真实模型清单**就地**写回 `groups.ts` 对应的 `models: [...]`。
- 单一事实源是 `groups.ts` 本身：分组顺序、分组名、`keyEnv`、端点都从文件读取；脚本只刷新已存在分组的模型清单，**不发明分组**，分组名/keyEnv/注释/结构原样保留。
- 安全兜底：缺 key 或拉取失败的分组**保持原样不动**，绝不清空；不打印 key 值。
- 推荐先 `node scripts/update-qiny-models.mjs --dry-run` 预览，再正式写回；写回后**必须** `npm run typecheck` 复核，并留意"全新模型"提示以便按需维护 `banlist.ts` / `KNOWN_META`。
- `groups.ts` 进镜像，改完需 rebuild 才在容器生效。
- 详细规则见 `.claude/skills/update-qinyapi-models/SKILL.md`。

## Git 提交与推送

每当用户明确要求"提交"、"commit"、"推送"、"push"、"上传到 GitHub"等，使用 `commit-push` skill 完成。要点：

- **未经用户明确请求，绝不自动 commit / push**。
- 提交信息使用 **Conventional Commits**（英文，小写起首）；**不**附加 `Co-Authored-By` 行。
- 始终用 `git add <file>` 明确指定文件，**禁止** `git add -A` / `git add .`。
- `.env`（含 `MCP_API_KEY` 与 QWeather 凭证）、`.claude/settings.local.json`、`.doc/` **绝不入库**——已在 `.gitignore` 中排除，但提交前仍要肉眼复核 `git status` 输出。
- 严禁：force push、`--amend` 已推送的 commit、`--no-verify`、修改 `git config`、`reset --hard` 等高破坏性操作（除非用户显式同意）。
- 远端仓库地址：`https://github.com/NyaaCaster/NyaaChat-MCP.git`，主分支 `master`。
- 详细规则见 `.claude/skills/commit-push/SKILL.md`。
