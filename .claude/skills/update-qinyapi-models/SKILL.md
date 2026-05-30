---
name: update-qinyapi-models
description: Refresh the qinyapi per-group model lists in src/qinyapi/groups.ts by calling each group's live GET /v1/models with the apikey from .env. Trigger when the user wants to sync / update the qinyapi model catalog after the upstream operator changed a group's models — e.g. "更新qinyapi模型清单", "刷新qinyapi分组模型", "拉取最新的qinyapi模型列表", "update qinyapi models". Runs scripts/update-qiny-models.mjs, which only rewrites the `models: [...]` arrays in-place (group names / keyEnv / comments preserved), never wipes a group on fetch failure, and prints a per-group diff.
---

# update-qinyapi-models

刷新 `src/qinyapi/groups.ts` 里各分组的模型清单：用 `.env` 中每个分组的 apikey 实时请求
`GET /v1/models`，把拉到的真实模型列表就地写回对应的 `models: [...]` 数组。

## 触发场景

- 用户要求"更新 qinyapi 模型清单"、"刷新分组模型"、"拉取最新模型列表"等。
- qinyapi 运营方调整了某分组的模型后，需要把 `groups.ts` 同步成最新。
- 通过 `/update-qinyapi-models` 显式调用。

## 它做什么（与不做什么）

- **单一事实源是 `groups.ts` 本身**：分组顺序、分组名、`keyEnv`、端点（`QINY_DEFAULT_BASE_URL`，
  可被 `.env` 的 `QINYAPI_BASE_URL` 覆盖）都从文件读取。脚本**不发明任何分组**，只刷新
  已存在分组的 `models` 数组。
- **只就地替换 `models: [...]`**：分组名、`keyEnv`、注释、整体结构原样保留 → diff 最小。
- **安全兜底**：某分组缺 key 或拉取失败（超时 / 非 200 / 非 JSON），该分组**保持原样不动**，
  绝不把已有清单清空。
- **不打印 key**：汇总只输出分组名、模型 id、数量。
- 共用同一 `keyEnv` 的分组只请求一次。

新增分组的正确姿势：先在 `groups.ts` 手动加一个分组对象（`name` + `keyEnv` + `models: []`
占位），并在 `.env` 配好对应的 `QINYAPI_KEY_*`，再跑本 skill 把 `models` 填上。

## 用法

脚本是纯 Node、不联 Docker，直接在项目根目录跑：

```powershell
# Windows
node scripts/update-qiny-models.mjs --dry-run   # 先预览改动，不写文件
node scripts/update-qiny-models.mjs             # 确认无误后写回
```

```bash
# Linux / macOS
node scripts/update-qiny-models.mjs --dry-run
node scripts/update-qiny-models.mjs
```

**推荐流程**：先 `--dry-run` 看 per-group diff（新增/移除了哪些模型、有没有分组因缺 key 被跳过），
确认符合预期再正式跑一次写回。

## 写回之后

1. **必须** `npm run typecheck` 复核语法（脚本只做文本替换，不保证 TS 合法性）。
2. 留意脚本结尾的 **"⚠️ 出现 N 个全新模型"** 提示：这些是以前从未出现过的模型 id，
   按需考虑是否要：
   - 加入黑名单 `src/qinyapi/banlist.ts`（老旧/冗余模型，不值得测试）；
   - 或补进尺寸表 `KNOWN_META`（`src/qinyapi/modelsMeta.ts`，仅当你有权威的上下文/输出长度数字）。
3. `groups.ts` 进镜像，改完需要 rebuild 才在容器生效（走 `rebuild` skill）。
4. 提交走 `commit-push` skill（用户明确要求时）。

## 不要做的事

- 不要手改脚本去"顺便"测试连通性或能力——那是 `qinyapi_health_check` 工具的职责，本脚本只同步清单。
- 不要在拉取失败时强行把分组写成空数组——保留旧清单是有意的安全行为。
- 不要把 apikey 值打印到终端 / 日志 / commit / PR。
- 不要绕过脚本手动编辑大量 `models` 数组——用脚本保证与上游一致且格式统一。
