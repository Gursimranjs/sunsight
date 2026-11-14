# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
# Every package's acceptance test runs through one of these targets. CI runs `make check`.
UV ?= $(shell command -v uv 2>/dev/null || echo $(CURDIR)/.tools/bin/uv)
PY = cd pipeline && $(UV) run
REGION ?=
TARGET ?=

.PHONY: setup fixtures kernels ephemeris golden masks miss validate web web-release check check-py check-web e2e deploy

setup:
	cd pipeline && $(UV) sync
	cd web && npm ci

fixtures:
	$(PY) python -m sunsight.fixtures

kernels:
	$(PY) python -m sunsight.kernels

ephemeris:
	$(PY) python -m sunsight.ephemeris

golden:
	$(PY) python -m sunsight.golden

masks:
	$(PY) python -m sunsight.regions --region $(REGION)

miss:
	$(PY) python -m sunsight.missgrid --target $(TARGET)

validate:
	$(PY) python -m sunsight.validate

web:
	cd web && npm run build

web-release:
	cd web && npm run build:release

check: check-py check-web

check-py:
	$(PY) ruff check .
	$(PY) ruff format --check .
	$(PY) mypy sunsight
	$(PY) pytest -q

check-web:
	cd web && npx tsc --noEmit
	cd web && npx vitest run

e2e:
	cd web && npm run build && npx playwright test

deploy: web
	@echo "CI publishes web/dist to GitHub Pages on every push to main (.github/workflows/deploy.yml)."
