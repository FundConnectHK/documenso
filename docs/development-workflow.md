# 日常开发分支与发布规范

本文档用于规范 FundConnectHK fork 仓库的日常开发流程，目标是：

- 减少 `main` 分叉导致的大量冲突。
- 保持与 upstream 同步时可控、可回溯。
- 明确 `staging` 与 `release` 的发布职责。

## 分支职责

- `main`：唯一集成分支，承接日常功能合并与 upstream 同步。
- `feature/*`：功能开发分支，短生命周期，用完即删。
- `staging`：测试环境部署分支（contract-test）。
- `release`：生产环境部署分支。

## 日常开发标准流程

### 1) 开发前先同步 `main`

```bash
git checkout main
git fetch origin --prune
git pull --ff-only origin main
```

可选同步 upstream（建议定期做，而不是每次功能开发都做，做的时候询问）：

```bash
git fetch upstream
git merge upstream/main
git push origin main
```

### 2) 从 `main` 切功能分支

```bash
git checkout -b feature/<short-topic>
```

### 3) 在功能分支提交

```bash
git add -A
git commit -m "feat: <message>"
git push -u origin feature/<short-topic>
```

### 4) 合并回 `main`

优先使用 PR 合并（推荐），或本地合并后推送：

```bash
git checkout main
git pull --ff-only origin main
git merge --no-ff feature/<short-topic>
git push origin main
```

### 5) 触发测试环境部署（contract-test）

`main` 验证通过后，把 `main` 推到 `staging`：

```bash
git checkout main
git push origin main:staging
```

### 6) 生产发布

沿用仓库既有流程（`release` 分支 + GitHub workflow）。

## 必须遵守的规则

- 不在本地 `main` 直接堆临时提交。
- 发现 `main` 出现 `ahead/behind`，先整理干净再合并功能。
- `Sync fork` 本质是 merge/fast-forward；有分叉时先在本地评估再同步。
- 功能开发与 upstream 同步不要混在同一个提交里。

## 常见异常与处理

### A) `main` 显示 `ahead 1, behind N`

说明本地 `main` 已分叉。处理方式：

1. 把本地独有提交转移到功能分支（若需要保留）。
2. 让本地 `main` 对齐 `origin/main`。
3. 再从干净 `main` 继续开发。

### B) 合并时出现大量冲突

通常不是单次改动太大，而是基线分叉太久。优先检查：

- 当前合并基线是否为最新 `origin/main`。
- 是否把 upstream 同步和业务改动混在了一次 merge 中。

### C) 想删除历史遗留分支

先确认变更已包含在 `main`，再删除本地和远端分支，避免长期维护双主线。

