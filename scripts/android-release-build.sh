#!/bin/zsh

set -euo pipefail

SCRIPT_DIR=${0:A:h}
PROJECT_ROOT=${SCRIPT_DIR:h}
ANDROID_DIR="${PROJECT_ROOT}/android"
ENV_FILE="${PROJECT_ROOT}/.android-build.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  source "${ENV_FILE}"
  set +a
fi

if [[ -z "${JAVA_HOME:-}" ]]; then
  echo "JAVA_HOME is not set. Copy .android-build.env.example to .android-build.env and set JAVA_HOME." >&2
  exit 1
fi

SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
if [[ -z "${SDK_ROOT}" ]]; then
  echo "ANDROID_SDK_ROOT or ANDROID_HOME is not set. Copy .android-build.env.example to .android-build.env and set your SDK path." >&2
  exit 1
fi

if [[ ! -d "${JAVA_HOME}" ]]; then
  echo "JAVA_HOME does not exist: ${JAVA_HOME}" >&2
  exit 1
fi

if [[ ! -d "${SDK_ROOT}" ]]; then
  echo "Android SDK directory does not exist: ${SDK_ROOT}" >&2
  exit 1
fi

cat > "${ANDROID_DIR}/local.properties" <<EOF
sdk.dir=${SDK_ROOT//:/\\:}
EOF

export JAVA_HOME
export ANDROID_SDK_ROOT="${SDK_ROOT}"
export ANDROID_HOME="${SDK_ROOT}"

cd "${ANDROID_DIR}"
./gradlew "$@"
