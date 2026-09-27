# FocusLit engineering instructions

## Read first

Read `README.md`, `ROADMAP.md`, and `docs/NEXT_STEPS.md` before substantial work.
Read `docs/PRODUCT_DESIGN.md` for UI work, `docs/ARCHITECTURE.md` for behavior/integration work,
`docs/AI_AND_COST.md` for model work, and `docs/QUALITY_AND_RELEASE.md` for checks/releases.
These documents describe planned behavior until linked implementation evidence exists.

## Product and taste

- Product name: FocusLit; repository/package namespace: focuslit. First character: a round-faced cat.
- macOS, Safari AND Chrome, bilingual UI, background music, and external displays are first-class.
- Quiet companionship is the default. Never steal typing focus, shame the user, or animate constantly.
- UI copy describes the user's task/action. Keep provider plumbing, tokens, and debug state in settings.
- A missing permission/bridge/model is an honest unavailable state, not simulated protection.
- No cloud account service, Python daemon, database server, second pet, or extra framework without
  a concrete requirement, smaller alternative, failure model, and recorded decision.

## Correctness and privacy

- Only the deterministic local policy engine authorizes interventions. Model output is untrusted data.
- A tab-close command must match session, policy revision, browser instance, profile, tab and navigation
  identity; expire it and revalidate immediately in the browser adapter before execution.
- End/pause/disconnect invalidates pending intervention authority. Retries must not close a new page.
- Do not promise an atomic browser compare-and-close if the browser API cannot provide it; measure and
  document the residual race. Cancel uncertain actions. See the architecture release gate.
- Protect designated music. Keyboard inactivity is not proof of distraction.
- Unknown is a valid decision. Timeout, invalid response and exhausted budget never mean unrelated.
- Keys stay in macOS Keychain/main or native processes; never in renderer, extension, logs or fixtures.
- Do not persist page bodies or screenshots by default. Do not send browsing data to models before
  explicit cloud-analysis consent. Private browsing is excluded in V1.
- Spending checks reserve bounded request cost before dispatch, count retries, and survive restart.

## Implementation

- TypeScript strict mode; runtime schemas at IPC, browser, storage and provider boundaries.
- Functional core with explicit state transitions; inject clock, storage, transport and model clients.
- Keep public interfaces small. Separate policy from UI and I/O; avoid generic plugin/event frameworks.
- Comments explain rationale and failure semantics. Do not narrate syntax or hide unsupported behavior.
- npm workspaces and one root lockfile. Pin toolchain and supported Electron; no competing lockfiles.
- Renderer sandbox + context isolation; no Node integration or arbitrary external content in app views.
- Limit Swift to platform integration until evidence justifies a larger native surface.

## Validation and completion

- Add behavior tests for consequential policy, timing, money, browser and persistence changes. Use fake
  clocks, adversarial event ordering and real adapter tests; avoid tests that merely mirror code.
- Follow component checks in `docs/QUALITY_AND_RELEASE.md`; pure visual changes need visual review,
  not artificial unit tests. Safety-critical gates cannot be waived by aggregate coverage.
- Do not add a green placeholder workflow or pretend a mocked browser proves Safari integration.
- Keep hosted CI credential-free on PRs; paid live-model runs and signing are separate trusted jobs.
- A milestone is complete only with commit, commands/results, artifacts/manual evidence, limitations
  and cost impact recorded in ROADMAP. Update NEXT_STEPS and the deep-dive claim ledger.
- Respect existing user edits. Do not publish, release, or send messages merely because a plan exists.
