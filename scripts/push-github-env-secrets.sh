#!/usr/bin/env bash
# Push GitHub Environment secrets with `gh secret set` (GitHub CLI handles Libsodium encryption).
# Default: skip secrets that already exist (resume). Use --force to overwrite all.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FORCE=0
ARGS=()

for a in "$@"; do
  case "$a" in
    --force) FORCE=1 ;;
    *) ARGS+=("$a") ;;
  esac
done

ENV_FILE="${ARGS[0]:-"$ROOT/.github-deploy-secrets.env"}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Copy .github-deploy-secrets.env.example to .github-deploy-secrets.env and fill it."
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [[ -z "${GITHUB_REPO:-}" ]]; then
  echo "GITHUB_REPO must be set in $ENV_FILE"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: https://cli.github.com/  then: gh auth login"
  exit 1
fi

staging_url="https://contract-test.fundconnecthk.com"
prod_url="https://contract.fundconnecthk.com"

staging_socket="fundconnecthk-489906:europe-west1:fundconnecthk-contracts-db-staging"
prod_socket="fundconnecthk-489906:europe-west1:fundconnecthk-contracts-db-prod"

staging_db_url="postgres://documenso:${STAGING_DB_PASSWORD}@/documenso?host=/cloudsql/${staging_socket}"
prod_db_url="postgres://documenso:${PROD_DB_PASSWORD}@/documenso?host=/cloudsql/${prod_socket}"

EXISTING_NAMES=""

list_existing_secret_names() {
  local env_name="$1"
  gh secret list --env "$env_name" -R "$GITHUB_REPO" --json name -q '.[].name' 2>/dev/null | sort -u || true
}

begin_environment() {
  local env_name="$1"
  echo ""
  echo "==> $env_name: existing secrets loaded (resume mode skips duplicates)"
  EXISTING_NAMES="$(list_existing_secret_names "$env_name")"
}

put_env_secret() {
  local env_name="$1"
  local name="$2"
  local value="$3"

  if [[ "$FORCE" -eq 0 ]] && printf '%s\n' "$EXISTING_NAMES" | grep -qxF "$name"; then
    echo "skip  $env_name  $name"
    return 0
  fi

  printf '%s' "$value" | gh secret set "$name" --env "$env_name" -R "$GITHUB_REPO"
  echo "set   $env_name  $name"
}

echo "Repository: $GITHUB_REPO"
if [[ "$FORCE" -eq 1 ]]; then
  echo "Mode: --force (overwrite existing secrets)"
else
  echo "Mode: resume (skip names that already exist in each environment)"
fi

for env in staging production; do
  gh api --method PUT "repos/${GITHUB_REPO}/environments/${env}" --input - <<< '{}' 2>/dev/null || true
done

# --- staging ---
begin_environment staging

put_env_secret staging NEXT_PUBLIC_WEBAPP_URL "$staging_url"
put_env_secret staging NEXT_PRIVATE_INTERNAL_WEBAPP_URL "$staging_url"
put_env_secret staging NEXT_PRIVATE_DATABASE_URL "$staging_db_url"
put_env_secret staging NEXT_PRIVATE_DIRECT_DATABASE_URL "$staging_db_url"
put_env_secret staging NEXTAUTH_SECRET "${STAGING_NEXTAUTH_SECRET}"
put_env_secret staging NEXT_PRIVATE_ENCRYPTION_KEY "${STAGING_NEXT_PRIVATE_ENCRYPTION_KEY}"
put_env_secret staging NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY "${STAGING_NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY}"
put_env_secret staging NEXT_PRIVATE_SMTP_TRANSPORT "smtp-auth"
put_env_secret staging NEXT_PRIVATE_SMTP_HOST "smtp.sendgrid.net"
put_env_secret staging NEXT_PRIVATE_SMTP_PORT "587"
put_env_secret staging NEXT_PRIVATE_SMTP_USERNAME "apikey"
put_env_secret staging NEXT_PRIVATE_SMTP_PASSWORD "${SENDGRID_API_KEY}"
put_env_secret staging NEXT_PRIVATE_SMTP_FROM_NAME "${NEXT_PRIVATE_SMTP_FROM_NAME}"
put_env_secret staging NEXT_PRIVATE_SMTP_FROM_ADDRESS "${NEXT_PRIVATE_SMTP_FROM_ADDRESS}"
put_env_secret staging NEXT_PUBLIC_UPLOAD_TRANSPORT "s3"
put_env_secret staging NEXT_PRIVATE_UPLOAD_ENDPOINT "https://storage.googleapis.com"
put_env_secret staging NEXT_PRIVATE_UPLOAD_FORCE_PATH_STYLE "true"
put_env_secret staging NEXT_PRIVATE_UPLOAD_REGION "auto"
put_env_secret staging NEXT_PRIVATE_UPLOAD_BUCKET "${GCS_BUCKET}"
put_env_secret staging NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID "${GCS_HMAC_ACCESS_KEY_ID}"
put_env_secret staging NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY "${GCS_HMAC_SECRET_ACCESS_KEY}"

# --- production ---
begin_environment production

put_env_secret production NEXT_PUBLIC_WEBAPP_URL "$prod_url"
put_env_secret production NEXT_PRIVATE_INTERNAL_WEBAPP_URL "$prod_url"
put_env_secret production NEXT_PRIVATE_DATABASE_URL "$prod_db_url"
put_env_secret production NEXT_PRIVATE_DIRECT_DATABASE_URL "$prod_db_url"
put_env_secret production NEXTAUTH_SECRET "${PROD_NEXTAUTH_SECRET}"
put_env_secret production NEXT_PRIVATE_ENCRYPTION_KEY "${PROD_NEXT_PRIVATE_ENCRYPTION_KEY}"
put_env_secret production NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY "${PROD_NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY}"
put_env_secret production NEXT_PRIVATE_SMTP_TRANSPORT "smtp-auth"
put_env_secret production NEXT_PRIVATE_SMTP_HOST "smtp.sendgrid.net"
put_env_secret production NEXT_PRIVATE_SMTP_PORT "587"
put_env_secret production NEXT_PRIVATE_SMTP_USERNAME "apikey"
put_env_secret production NEXT_PRIVATE_SMTP_PASSWORD "${SENDGRID_API_KEY}"
put_env_secret production NEXT_PRIVATE_SMTP_FROM_NAME "${NEXT_PRIVATE_SMTP_FROM_NAME}"
put_env_secret production NEXT_PRIVATE_SMTP_FROM_ADDRESS "${NEXT_PRIVATE_SMTP_FROM_ADDRESS}"
put_env_secret production NEXT_PUBLIC_UPLOAD_TRANSPORT "s3"
put_env_secret production NEXT_PRIVATE_UPLOAD_ENDPOINT "https://storage.googleapis.com"
put_env_secret production NEXT_PRIVATE_UPLOAD_FORCE_PATH_STYLE "true"
put_env_secret production NEXT_PRIVATE_UPLOAD_REGION "auto"
put_env_secret production NEXT_PRIVATE_UPLOAD_BUCKET "${GCS_BUCKET}"
put_env_secret production NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID "${GCS_HMAC_ACCESS_KEY_ID}"
put_env_secret production NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY "${GCS_HMAC_SECRET_ACCESS_KEY}"

echo ""
echo "Done. Verify:"
echo "  gh secret list --env staging -R $GITHUB_REPO"
echo "  gh secret list --env production -R $GITHUB_REPO"
