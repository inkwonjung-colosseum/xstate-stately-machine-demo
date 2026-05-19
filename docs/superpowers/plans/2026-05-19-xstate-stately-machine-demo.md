# XState Stately Machine Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a public GitHub repository containing a complex XState machine that can be imported into Stately Studio.

**Architecture:** Keep the repository intentionally small. The core artifact is one TypeScript file with a `createMachine({ ... })` definition so Stately's import flow can identify and render it. Supporting files only document the test path and provide TypeScript verification.

**Tech Stack:** TypeScript, XState v5, npm, GitHub CLI.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts`
- Create: `.gitignore`

- [ ] **Step 1: Add package metadata**

Create a package named `xstate-stately-machine-demo` with `xstate`, TypeScript checking, and a `check` script.

- [ ] **Step 2: Add TypeScript settings**

Use strict TypeScript with `src` as the only included source folder.

- [ ] **Step 3: Add entrypoint**

Export the fulfillment machine from `src/index.ts`.

### Task 2: Complex Fulfillment Machine

**Files:**
- Create: `src/machines/fulfillmentMachine.ts`

- [ ] **Step 1: Add a complex `createMachine({ ... })` definition**

Model order intake, inventory/payment planning, warehouse picking, quality gate, packing, shipping, completion, cancellation, and failure states.

- [ ] **Step 2: Keep import compatibility**

Use a direct `createMachine({ ... })` call and string action/guard names so Stately can parse the statechart surface without requiring runtime implementations.

### Task 3: Documentation

**Files:**
- Create: `README.md`

- [ ] **Step 1: Explain the repo purpose**

Document that this repo exists to test Stately GitHub import/sync.

- [ ] **Step 2: Document Stately import path**

Show the exact file path and the `github.stately.ai` URL pattern.

### Task 4: Verify And Publish

**Files:**
- Generated: `package-lock.json`

- [ ] **Step 1: Install dependencies**

Run `npm install`.

- [ ] **Step 2: Type-check**

Run `npm run check` and expect TypeScript to pass.

- [ ] **Step 3: Initialize git and commit**

Commit the scaffold, machine, docs, and lockfile.

- [ ] **Step 4: Create public GitHub repo and push**

Create `developjik1/xstate-stately-machine-demo` as a public repository and push `main`.

