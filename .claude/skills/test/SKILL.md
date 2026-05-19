---
name: test
description: Run NyaaChat-MCP verification scripts in scripts/test-tools.mjs (in-memory MCP roundtrip, no Docker / no network) or scripts/test-public.mjs (smoke test against the public deployment). Use this whenever you need to verify tool behavior after editing src/, after rebuild, or before/after committing. Also covers maintenance of these scripts when tools are added or signatures change.
---

# test

NyaaChat-MCP 的工具验收脚本调用规范。

## 两个脚本的分工

| 脚本 | 用途 | 是否需要 Docker | 是否需要 API key | 何时用 |
|---|---|---|---|---|
| `scripts/test-tools.mjs` | 用 MCP SDK 的 `InMemoryTransport` 直接连 client + server，走完整 `tools/call` 协议 | 否 | 否 | 改完 `src/` 跑 typecheck + build 之后立即用，验证 register / handler / schema 是否正确 |
| `scripts/test-public.mjs` | 通过 `Authorization: Bearer` 调公网 `http://h.hony-wen.com:3094/mcp` | 是（要先 rebuild 部署） | 是（从 `.env` 读取） | rebuild + 重启容器之后做部署烟雾测试 |

**原则**：本地代码改动先用 `test-tools.mjs` 跑通，再走 rebuild + `test-public.mjs`。不要颠倒。

## 用法

### `test-tools.mjs`（in-memory）

前置：先 `npm run build`（脚本是 import `dist/server.js`）。

```powershell
# Windows
npm run build; node scripts/test-tools.mjs
```

```bash
# Linux / macOS
npm run build && node scripts/test-tools.mjs
```

输出：每个用例打印 `[PASS] / [FAIL]` + 工具实际返回，最后一行汇总 `=== N pass / M fail / T total ===`。`fail > 0` 时进程返回非零退出码。

### `test-public.mjs`（公网烟雾测试）

前置：容器在跑（`curl http://h.hony-wen.com:3094/health` 返回 `status: ok`），`.env` 里有 `MCP_API_KEY`。

**绝不在脚本里硬编码 key。** 通过环境变量传入，命令一次性使用。

```powershell
# Windows — 从 .env 读 key 设到 env 再调
$env:MCP_API_KEY = (Get-Content .env | Select-String '^MCP_API_KEY=' | ForEach-Object { $_.Line.Substring(12) })
node scripts/test-public.mjs
```

```bash
# Linux / macOS
export MCP_API_KEY=$(grep '^MCP_API_KEY=' .env | cut -d= -f2)
node scripts/test-public.mjs
```

可选覆盖：`MCP_URL=http://localhost:3094/mcp` 切到本地端口测试。

> Windows + Node 20 在退出时偶尔打印 `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`——这是 libuv 的 fetch keep-alive 关闭 race，**所有断言都已在退出前完成**，不影响测试结论。看最后一行 `=== ... ===` 即可。

## 维护：添加新工具时的同步

当 `src/server.ts` 注册了新工具时，**必须**同步扩展两个脚本的 `cases` 数组：

1. 打开 `scripts/test-tools.mjs`，在合适分组（按工具类型）添加正常用例 + 至少 1 条错误用例（`expectError: true`）。
2. 打开 `scripts/test-public.mjs`，在 `cases` 末尾追加一条代表性正常用例（公网脚本不跑错误用例，避免污染统计）。
3. 跑 `npm run build && node scripts/test-tools.mjs`，确认新用例通过。
4. 改动 `src/` 才需要 rebuild + `test-public.mjs`；只改测试脚本本身**不**需要 rebuild。

## 安全红线

- **绝不**把 `MCP_API_KEY` 的值写进任何脚本、commit message、PR 描述、聊天回复或日志输出。
- **绝不** `echo $env:MCP_API_KEY` 之类把 key 显示到终端——上面的命令模板用单条 PowerShell 表达式直接赋值，不会回显值。
- 如果在终端不慎打印了 key，立即在 `.env` 里 rotate（生成方式见 `.env.example` 注释），再重启容器。
- `scripts/test-public.mjs` 设计上要求 key 来自 env，未设置时直接报错退出——不要"为了方便"加默认值绕过这个保护。

## 不要做的事

- 不要把 `test-public.mjs` 当主要回归测试——它依赖外部网络和容器状态，不稳定且慢。日常验证靠 `test-tools.mjs`。
- 不要在 CI 跑 `test-public.mjs` 时把 key 写进 workflow 文件——用 secrets / vault。
- 不要往这两个脚本里加业务逻辑——它们只做"调一次工具、看返回是不是预期形态"。
