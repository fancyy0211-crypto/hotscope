# HotScope Weibo Edition - Agent Instructions

This project is a focused derivative of the original HotScope project.

## Product scope
This version only supports:
- Weibo hot topics
- Real-topic fetching architecture placeholder or implementation
- Existing HotScope decision and generation workflow

This version does NOT support:
- Xiaohongshu
- Zhihu
- Google Trends
- Multi-source aggregation
- Team collaboration workflows
- Complex task systems

## Primary goal
Transform the current HotScope demo into a Weibo-only edition that can evolve toward real-time topic ingestion.

## Core constraints
- Keep the current product shape and user journey
- Do not redesign the whole UI
- Prefer minimal necessary changes
- Preserve existing interaction patterns where possible
- Avoid introducing unnecessary libraries
- Do not expand scope into a general content platform

## Product rules
- All topic lists in this version should be Weibo-only
- Any source filter should be removed or simplified to Weibo-only logic
- Recommendation, opportunity, and strategy logic should continue to work on top of Weibo topics
- If real fetching is not fully implemented yet, architecture should still be ready for real Weibo ingestion

## Technical guidance
- Favor small, reviewable changes
- Reuse existing types and state where possible
- Prefer adding a backend adapter/service layer rather than rewriting the frontend
- Keep mock fallback if needed, but clearly separate mock from real source logic

## Working style
For large tasks:
1. Analyze first
2. Propose a minimal implementation plan
3. Implement in small steps
4. Summarize file changes and validation steps