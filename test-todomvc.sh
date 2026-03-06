#!/usr/bin/env bash
set -euo pipefail

# Check for required argument
if [ $# -eq 0 ]; then
  echo "Usage: $0 <implementation|all>"
  echo ""
  echo "Examples:"
  echo "  $0 react              # Test React implementation"
  echo "  $0 dojo               # Test Dojo implementation"
  echo "  $0 all                # Test all implementations"
  echo ""
  echo "Available implementations:"
  echo "  angular, angular-dart, angularjs_require, aurelia, backbone,"
  echo "  backbone_marionette, backbone_require, binding-scala, canjs, canjs_require,"
  echo "  closure, cujo, dijon, dojo, duel, elm, emberjs, emberjs_require,"
  echo "  enyo_backbone, exoskeleton, gwt, javascript-es5, javascript-es6, jquery,"
  echo "  jsblocks, js_of_ocaml, knockback, knockoutjs, knockoutjs_require,"
  echo "  lavaca_require, lit, mithril, polymer, preact, ractive, react, react-redux,"
  echo "  reagent, riotjs, svelte, typescript-angular, typescript-backbone,"
  echo "  typescript-react, vue, web-components"
  exit 1
fi

# Configuration
PORT="${PORT:-8000}"
SPEC="todomvc.ts"
IMPL="$1"

# Use writable copy if it exists, otherwise read-only TODOMVC
TODOMVC_DIR="${TODOMVC_WORK:-$TODOMVC}"

# Map implementation names to their entry point paths
declare -A IMPL_PATHS=(
  ["angular"]="dist/browser"
  ["angular-dart"]="web"
  ["angularjs_require"]="."
  ["aurelia"]="."
  ["backbone"]="dist"
  ["backbone_marionette"]="."
  ["backbone_require"]="."
  ["binding-scala"]="."
  ["canjs"]="."
  ["canjs_require"]="."
  ["closure"]="."
  ["cujo"]="."
  ["dijon"]="."
  ["dojo"]="."
  ["duel"]="www"
  ["elm"]="."
  ["emberjs"]="todomvc/dist"
  ["emberjs_require"]="."
  ["enyo_backbone"]="."
  ["exoskeleton"]="."
  ["gwt"]="."
  ["javascript-es5"]="dist"
  ["javascript-es6"]="src"
  ["jquery"]="."
  ["jsblocks"]="."
  ["js_of_ocaml"]="."
  ["knockback"]="."
  ["knockoutjs"]="."
  ["knockoutjs_require"]="."
  ["lavaca_require"]="."
  ["lit"]="."
  ["mithril"]="."
  ["polymer"]="."
  ["preact"]="dist"
  ["ractive"]="."
  ["react"]="public"
  ["react-redux"]="public"
  ["reagent"]="."
  ["riotjs"]="."
  ["svelte"]="."
  ["typescript-angular"]="."
  ["typescript-backbone"]="."
  ["typescript-react"]="."
  ["vue"]="."
  ["web-components"]="styles"
)

# Function to test a single implementation
test_impl() {
  local impl="$1"
  local path="${IMPL_PATHS[$impl]:-}"

  if [ -z "$path" ]; then
    echo "Error: Unknown implementation '$impl'"
    echo "Available implementations:"
    printf '%s\n' "${!IMPL_PATHS[@]}" | sort
    return 1
  fi

  local url="http://localhost:$PORT/examples/$impl"
  if [ "$path" != "." ]; then
    url="$url/$path"
  fi

  echo ""
  echo "========================================"
  echo "Testing: $impl"
  echo "URL: $url"
  echo "Spec: $SPEC"
  echo "========================================"

  bombadil test --exit-on-violation "$url" "$SPEC"
}

# Build implementations if testing specific impl or all
if [ "$IMPL" == "all" ]; then
  echo "Pre-building all implementations (this may take a while)..."
  for impl in $(printf '%s\n' "${!IMPL_PATHS[@]}" | sort); do
    if [ -f "$TODOMVC/examples/$impl/package.json" ]; then
      build-todomvc "$impl" > /dev/null 2>&1 || echo "Warning: Failed to build $impl"
    fi
  done
  # Use work directory if it was created
  if [ -d "/tmp/todomvc-work" ]; then
    TODOMVC_DIR="/tmp/todomvc-work"
  fi
else
  # Check if this implementation needs building
  if [ -f "$TODOMVC/examples/$IMPL/package.json" ]; then
    echo "Building $IMPL..."
    TODOMVC_DIR=$(build-todomvc "$IMPL")
    if [ $? -ne 0 ]; then
      echo "Warning: Build failed, using source version"
      TODOMVC_DIR="$TODOMVC"
    fi
  fi
fi

# Start Python HTTP server in background
echo "Starting local server on port $PORT from $TODOMVC_DIR..."
cd "$TODOMVC_DIR" && python3 -m http.server "$PORT" > /dev/null 2>&1 &
SERVER_PID=$!

# Cleanup function
cleanup() {
  echo ""
  echo "Stopping server (PID: $SERVER_PID)..."
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Wait for server to be ready
echo "Waiting for server to start..."
for i in {1..10}; do
  if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
    echo "Server is ready!"
    break
  fi
  if [ $i -eq 10 ]; then
    echo "Error: Server failed to start"
    exit 1
  fi
  sleep 1
done

# Test implementations
if [ "$IMPL" == "all" ]; then
  echo ""
  echo "Testing all implementations with spec: $SPEC"
  echo ""

  FAILED=()
  PASSED=()

  for impl in $(printf '%s\n' "${!IMPL_PATHS[@]}" | sort); do
    if test_impl "$impl"; then
      PASSED+=("$impl")
      echo "✓ $impl PASSED"
    else
      FAILED+=("$impl")
      echo "✗ $impl FAILED"
    fi
  done

  echo ""
  echo "========================================"
  echo "Summary"
  echo "========================================"
  echo "Passed: ${#PASSED[@]}"
  echo "Failed: ${#FAILED[@]}"

  if [ ${#FAILED[@]} -gt 0 ]; then
    echo ""
    echo "Failed implementations:"
    printf '  - %s\n' "${FAILED[@]}"
    exit 1
  else
    echo ""
    echo "All implementations passed!"
  fi
else
  test_impl "$IMPL"
  echo ""
  echo "Test completed successfully!"
fi
