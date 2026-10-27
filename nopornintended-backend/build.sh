#!/usr/bin/env bash
set -o errexit

python -m pip install --upgrade pip
pip install -r requirements.txt
python manage.py collectstatic --no-input
# Free Render services do not support a separate pre-deploy command.
python manage.py migrate --no-input
