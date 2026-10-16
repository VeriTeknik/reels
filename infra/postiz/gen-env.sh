#!/bin/bash
# Creates /opt/postiz/.env with fresh random secrets once; never overwrites an existing file.
set -euo pipefail
f=/opt/postiz/.env
if [ -f "$f" ]; then echo ".env exists, keeping it"; exit 0; fi
umask 077
{
  echo "JWT_SECRET=$(openssl rand -hex 32)"
  echo "POSTIZ_DB_PASSWORD=$(openssl rand -hex 24)"
  echo "TEMPORAL_DB_PASSWORD=$(openssl rand -hex 24)"
  echo "DISABLE_REGISTRATION=false"
} > "$f"
echo "wrote $f"
