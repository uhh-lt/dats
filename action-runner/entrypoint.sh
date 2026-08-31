#!/bin/bash
set -e

# 0. Runtime docker socket GID detection — allows non-root docker access on any host
if [ -S /var/run/docker.sock ]; then
	DOCKER_GID=$(stat -c '%g' /var/run/docker.sock)
	groupadd -g "${DOCKER_GID}" dockerhost 2>/dev/null || true
	usermod -aG dockerhost runner
fi

# 1. Fetch a short-lived registration token via the GitHub API
REG_TOKEN=$(curl -sX POST -H "Authorization: token ${GITHUB_PAT}" \
	-H "Accept: application/vnd.github.v3+json" \
	"https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runners/registration-token" | jq -r .token)

if [ -z "$REG_TOKEN" ] || [ "$REG_TOKEN" = "null" ]; then
	echo "ERROR: Failed to fetch registration token. Check your GITHUB_PAT, GITHUB_OWNER, and GITHUB_REPO."
	exit 1
fi

# 2. Configure the runner with the container hostname (set by Docker Compose to prefix-runner-N)
RUNNER_NAME="$(hostname)"
gosu runner ./config.sh --url "https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}" \
	--token "${REG_TOKEN}" \
	--name "${RUNNER_NAME}" \
	--work "_work" \
	--unattended \
	--replace

# 2b. Symlink the shared Ray cache into the path CI expects inside _work
RAY_CACHE_TARGET="/actions-runner/_work/dats/dats/docker/ray_cache"
if [ -d /ray_cache ] && [ ! -e "${RAY_CACHE_TARGET}" ]; then
	gosu runner mkdir -p "$(dirname "${RAY_CACHE_TARGET}")"
	gosu runner ln -s /ray_cache "${RAY_CACHE_TARGET}"
fi

# 3. Setup a cleanup hook to unregister the runner when the container stops
cleanup() {
	echo "Removing runner..."
	REMOVE_TOKEN=$(curl -sX POST -H "Authorization: token ${GITHUB_PAT}" \
		-H "Accept: application/vnd.github.v3+json" \
		"https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runners/remove-token" | jq -r .token)
	gosu runner ./config.sh remove --token "${REMOVE_TOKEN}"
}
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM

# 4. Start the runner in the foreground as non-root user
gosu runner ./run.sh &
wait $!
