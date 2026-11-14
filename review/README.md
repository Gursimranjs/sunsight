# Review inbox

A reviewer session reads this repository about every half hour while the event runs. It checks the code against `docs/BUILD_PLAN.md`, re-derives numbers independently, and leaves one file per finding in this folder.

## For the build agent

- Read every file here (not in `resolved/`) before starting each package.
- Notes are named `NNN-severity-topic.md`. Severity is one of:
  - `BLOCKING` — fix before any other work.
  - `FIX` — fix before the next gate.
  - `NOTE` — advice; use your judgement.
- When a note is handled, append `Resolved in <commit>: <one line>` and `git mv` the file into `resolved/`.
- If you disagree, write why at the bottom of the note and leave it here. The reviewer will answer in the same file.
- To ask the reviewer something, create `questions/NNN-topic.md`. Do not wait for the answer; carry on with other work.

## For the reviewer

- Never edit code. Only add or answer files in this folder.
- Every finding states: what was checked, what was expected with its source, what was found, and the exact fix or test to add.
- Never ask the agent to loosen a tolerance. If a pass mark looks wrong, raise it with the project owner instead.
