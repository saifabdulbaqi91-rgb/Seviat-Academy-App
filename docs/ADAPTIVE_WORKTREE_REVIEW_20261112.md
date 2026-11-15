# Working tree review before adaptive learning — 2026-11-12

The actual Git root is `C:/Users/Saif Ahmed/Desktop/Seviat-Academy-App`. The IDE context spells its active path `Seifiat-Academy-App`; no folder was renamed or switched.

## Backup and preservation

Before application edits, a complete timestamped copy, including `.git`, ignored files, untracked files, archives, and temporary directories, was created outside the working tree:

`C:/Users/Saif Ahmed/Desktop/Seviat-Academy-Backups/before-adaptive-20261112-222942`

Robocopy completed successfully. `WORKTREE_AUDIT_20261112.json` inventories every backup file with classification, tracked status, size and SHA-256, and compares non-Git files to the untouched workspace. Git metadata is copied and hashed but its live files are excluded from byte comparison because read-only Git inspections can refresh the index.

No reset, clean, deletion, checkout, commit, staging, push or publication was performed. Existing `.gitignore` rules remain unchanged. New work extends the current files; the external snapshot preserves their exact prior bytes.

## File classification

| Category | Files and handling |
| --- | --- |
| Runtime source | `index.html`; root JavaScript and CSS files without backup/before suffixes; `manifest.json`, `sw.js`; `sounds/effects.js`. `student-journey.js`, `student-journey.css`, and `journey-rules.js` are real untracked application source, not temporary output. |
| Curriculum/reference source | Active JSON in `data/`, including the reviewed Unit 1 bank, access catalog and historical audit needed by the loader. Preserve identifiers and records. |
| Application assets | Fonts, `icons/`, audio under `sounds/`. Names containing test/sample need reference review before deciding whether to exclude; some are already tracked. |
| Test and tool source | `tests/*.cjs`, `tools/*.cjs`, root Python/PowerShell maintenance scripts. Do not ignore `tests/`, `tools/`, or all untracked files. Existing broad `*.py` and `*.ps1` rules can hide useful development tools. |
| Documentation source | `docs/`, `UNIT1-REPORT.md`, audit/reference reports. Untracked documentation is still source work to preserve. Root audit text files are review artifacts, not automatically disposable. |
| Backups/archives | `backups/`, root ZIPs, files with `.backup*`, `.before-*` and `.bak` names. Preserve physically; recommend excluding generated backups from future Git additions. |
| Temporary/test output | `.access-staging/`, `.unit1-staging/`, `.quality-staging/`, embedded browser profiles and screenshots/results. These are distinct from test source. `Microsoft/Windows/PowerShell/ModuleAnalysisCache` is an environment cache. |
| Student data | Browser localStorage contains real local progress; it is not stored in this checkout and is not backed up by copying project files. Browser test profiles may contain sensitive local browser state and must not be published. `data/progress.json` is currently a tracked empty template; leave it unchanged. Future exports such as `seviat-journey.json` belong in a separate ignored location. |

## Safe .gitignore recommendations — not applied

Keep existing application source, assets, curriculum, tests and documentation visible. Consider adding these narrowly scoped rules after review:

```gitignore
/.quality-staging/
/Microsoft/Windows/PowerShell/ModuleAnalysisCache
/test-results/
/playwright-report/
/browser-profile-*/
*.backup-*
*.backup-before-*
*.bak
*.tmp
/local-student-data/
/student-exports/
/seviat-journey*.json
/secrets/
/.aws/
.env
.env.*
!.env.example
```

The existing exclusions for `.access-staging/`, `.unit1-staging/`, `backups/`, ZIP archives and `node_modules/` already cover part of this. Do not replace the current `.gitignore` wholesale. Review blanket `*.py`, `*.ps1`, and `*.zip` rules because they can hide useful tools or intended deliverables. Ignore rules never remove already tracked files: no untracking of `data/progress.json` or tracked audio is proposed here.

## Confirmed interface and implementation risks

- `index.html` loads the journey stylesheet, rules and controller. The controller builds `#journey`, `#teacherHub` and the return-to-student action; the CSS separates the two modes.
- Eight tracked files were already modified: `.gitignore`, `auditory-game.js`, `extra-preparation-games.js`, `independent-writing.js`, `index.html`, `unit2-preparation.js`, `visual-levels.js`, and `writing-board.js`. Their existing changes are part of the baseline, not work to revert.
- Many untracked files are essential runtime/test/documentation source; excluding or publishing the whole tree indiscriminately would be unsafe. External backup includes potentially sensitive browser state and must remain local.
- Historical pass accumulation does not resolve recent weakness. Existing question-ID variants and random preparation content also need distinct content identities when evaluating adaptive evidence; a new identifier alone does not prove a new task.
- Journey profiles are separate, but legacy activity records are shared locally. Do not infer ownership or move Unit 1 records between children.
- Sound/writing tasks that need teacher verification cannot establish independent mastery. Teacher selection and explicit overrides must remain available. A local mode toggle is not authentication.
- Implementation follows the detailed specification supplied by the user during this task: short diagnostics, evidence per skill, assistance and recurring-error analysis, spaced review, prerequisite-safe letters and taught vocabulary, existing cognitive games, teacher control, local persistence, and no backend or publication.
