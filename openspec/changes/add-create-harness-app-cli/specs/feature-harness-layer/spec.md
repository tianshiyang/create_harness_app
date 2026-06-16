## ADDED Requirements

### Requirement: harness 档位三选一

初始化器 SHALL 提供 harness 治理层的单选项：full、minimal、none，默认值为 full。

#### Scenario: 默认 full

- **WHEN** 用户在 harness 提问处不改默认
- **THEN** 初始化器 SHALL 采用 full 档

#### Scenario: 选择 none

- **WHEN** 用户选择 none
- **THEN** 初始化器 SHALL NOT 生成任何 harness 文件，也不注入 harness 相关 scripts

### Requirement: harness full 内容集合

选择 full 时，初始化器 SHALL 生成完整 harness 快照：`.claude/**`（settings、hooks、rules、agents、skills、commands）、`.agents/skills/**` 镜像、`skills-lock.json`、`scripts/**`（含 verify-skills、sync-harness-docs、check-project-structure 及其测试）、`docs/**` harness 文档、`CLAUDE.md`/`AGENTS.md`/`GEMINI.md`，以及 husky、lint-staged、commitlint、oxlint、prettier、editorconfig 配置。

#### Scenario: 生成完整治理文件

- **WHEN** harness full 启用
- **THEN** 目标项目 SHALL 包含 `.claude/hooks/guard-tool.cjs`、`.claude/hooks/quality-gate.cjs`、`.claude/hooks/notify.cjs`、两个 review agent、全部 rules 及 `skills-lock.json`

#### Scenario: 注入 harness 脚本并提示重算指纹

- **WHEN** harness full 生成完成
- **THEN** 初始化器 SHALL 注入 `harness:sync`/`harness:check`/`check` 脚本，并在"下一步"提示中引导用户运行 `pnpm harness:sync` 以重算 skills 指纹

### Requirement: harness minimal 内容集合

选择 minimal 时，初始化器 SHALL 仅生成安全守护与质量门禁：`.claude/hooks/guard-tool.cjs`、`.claude/hooks/quality-gate.cjs`、精简的 `.claude/settings.json`（deny 名单 + Stop 质量门禁，不含 subagent review）、精简 `CLAUDE.md`。

#### Scenario: 仅含两件高价值组件

- **WHEN** harness minimal 启用
- **THEN** 目标项目 SHALL 包含 guard-tool 与 quality-gate，且 SHALL NOT 包含 review agents、skills 体系或 harness 校验脚本

#### Scenario: 精简 settings 不挂 subagent review

- **WHEN** harness minimal 启用
- **THEN** 生成的 `settings.json` 的 Stop hooks SHALL 仅包含质量门禁 command，不包含 agent 类型的 review hook
