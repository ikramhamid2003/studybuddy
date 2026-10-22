#!/usr/bin/env bash
set -o errexit

# Runtime dependencies only — pytest, ruff and the type stubs live in
# requirements-dev.txt and are never installed into the image.
pip install -r requirements.txt

# Fails the build before anything reaches the database when a model change has no
# matching migration file. Without this gate `migrate` reports success while the
# schema silently trails the code that is about to serve traffic from it.
python manage.py makemigrations --check --dry-run

python manage.py collectstatic --no-input
python manage.py createcachetable
# Rollback order for a bad migration: roll the Render deploy back to the previous
# build first, then step the schema down explicitly with
#   python manage.py migrate study_api <previous_migration_name>
# Render does not reverse migrations for you.
python manage.py migrate
