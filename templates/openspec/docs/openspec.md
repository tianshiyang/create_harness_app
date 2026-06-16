# OpenSpec 业务规格

本项目用 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 管理业务规格：产品 PRD、钉钉文档、口头需求都是原始输入，可执行的事实源是 `openspec/`。

## 目录

- `openspec/specs/`：当前已生效的业务规格（事实源）。
- `openspec/changes/`：进行中的变更提案；每个变更一个目录（proposal、tasks、受影响的 specs）。
- `openspec/changes/archive/`：已完成并归档的变更。

## 工作流（通过 Claude Code 斜杠命令驱动）

1. `/opsx:propose "需求描述"` — 基于需求生成变更提案（proposal + 受影响 specs + tasks）。
2. `/opsx:apply` — 按提案的 tasks 实现代码。
3. `/opsx:archive` — 变更完成后，把它合并进 `openspec/specs/` 并归档。

辅助命令：`/opsx:explore`（探索现有规格）、`/opsx:sync`（同步 specs）。

## 命令行

```sh
pnpm openspec:list       # 列出当前变更
pnpm openspec:validate   # 校验所有 specs 和 changes（pnpm check 也会跑）
```

## 与 Harness 的分工

- OpenSpec 只管**业务规格和需求变更**（页面布局、字段口径、状态机、角色权限矩阵、接口契约）。
- Harness 继续管 **AI 执行规则、hooks、skills、review 和质量门禁**。
- 不要把业务规则复制进 harness 文档；也不要用 OpenSpec 替代 `pnpm check`、code review 或人工复核。

## 何时用

新增页面/接口、改业务流程、调整权限模型前，先在 OpenSpec 建变更，明确来源、影响范围、验收标准和待确认问题，再进入代码实现。纯样式微调、bug 修复等无规格影响的改动可不走 OpenSpec。
