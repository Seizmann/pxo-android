# CLAUDE.md — PXO

@AGENT.md
@REQUIREMENT.md

## Claude-specific guidance

- Follow the phases in `REQUIREMENT.md` section 5 **in strict order**.
  Phase 1 = Figma design via Figma MCP. Phase 2 = workspace + code.
  Never write UI or app code before the Figma design is approved.
- Design every screen and sheet in Figma (section 9) before converting to code.
  Link Figma frames in `docs/SCREENS.md` once they exist.
- Keep each file short; split a growing file into smaller ones rather than appending.
- Before marking a task done:
  1. Run `pnpm --filter core test` and confirm all tests pass.
  2. Run TypeScript checks (`tsc --noEmit`) on both `packages/core` and `apps/mobile`.
  3. Update the relevant `docs/` file if observable behaviour changed.
- If a business rule is unclear, **ask the owner**. Never assume domain rules or invent
  numbers (rates, packet sizes, lockout durations, bonus formulae).
- Never hard-code or log secrets. PIN storage: `expo-secure-store` only. Recovery PIN:
  salted hash derived from a GitHub secret, never in source or backup JSON.
- Money arithmetic: always work in integer poisha; convert to taka only at display time.
- Allocation logic (Auto / Manual / hybrid per payment entry) lives in `packages/core`.
- Backup JSON must exclude PIN and recovery hash. Validate `schemaVersion` before
  touching the DB on restore; wrap restore in a transaction; roll back on any error.
