{
  description = "Bombadil playground development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    bombadil.url = "github:antithesishq/bombadil/bundle-browser-js";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      bombadil,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        todomvc = pkgs.fetchFromGitHub {
          owner = "tastejs";
          repo = "todomvc";
          rev = "master";
          sha256 = "sha256-YlI6qx8Bm6atTJzYlQxp0qGpXJkoUxN+FnHyX0ALLgw=";
        };

        # Create a writable copy of todomvc in /tmp for building
        todomvc-build = pkgs.writeShellScriptBin "todomvc-build" ''
          IMPL="$1"
          FORCE_REBUILD="$2"
          TODOMVC_WORK="/tmp/todomvc-work"

          if [ -z "$IMPL" ]; then
            echo "Usage: todomvc-build <implementation> [--force]" >&2
            exit 1
          fi

          # Create writable copy if it doesn't exist
          if [ ! -d "$TODOMVC_WORK" ]; then
            echo "Creating writable copy of TodoMVC..." >&2
            cp -r "${todomvc}" "$TODOMVC_WORK"
            chmod -R u+w "$TODOMVC_WORK"
          fi

          EXAMPLE_DIR="$TODOMVC_WORK/examples/$IMPL"

          if [ ! -d "$EXAMPLE_DIR" ]; then
            echo "Error: Implementation '$IMPL' not found" >&2
            exit 1
          fi

          # Skip npm install for implementations that use pre-built assets
          case "$IMPL" in
            dojo)
              echo "$IMPL uses pre-built assets, skipping npm install" >&2
              echo "$TODOMVC_WORK"
              exit 0
              ;;
          esac

          if [ ! -f "$EXAMPLE_DIR/package.json" ]; then
            echo "No package.json found, assuming pre-built" >&2
            echo "$TODOMVC_WORK"
            exit 0
          fi

          # Check if already built (marker file exists) unless --force
          BUILD_MARKER="$EXAMPLE_DIR/.todomvc-built"
          if [ -f "$BUILD_MARKER" ] && [ "$FORCE_REBUILD" != "--force" ]; then
            echo "$IMPL already built, skipping (use --force to rebuild)" >&2
            echo "$TODOMVC_WORK"
            exit 0
          fi

          echo "Building $IMPL..." >&2
          cd "$EXAMPLE_DIR"

          # Install dependencies
          if [ -f package-lock.json ]; then
            ${pkgs.nodejs}/bin/npm ci --no-audit --no-fund >&2 || ${pkgs.nodejs}/bin/npm install --no-audit --no-fund >&2
          else
            ${pkgs.nodejs}/bin/npm install --no-audit --no-fund >&2
          fi

          if ${pkgs.nodejs}/bin/npm run 2>&1 | grep -q "build"; then
            ${pkgs.nodejs}/bin/npm run build >&2
          fi

          # Mark as built
          touch "$BUILD_MARKER"
          echo "✓ Built $IMPL" >&2
          echo "$TODOMVC_WORK"
        '';

        todomvc-serve = pkgs.writeShellScriptBin "todomvc-serve" ''
          PORT=''${1:-8000}
          echo "Serving TodoMVC from $TODOMVC on http://localhost:$PORT"
          cd "$TODOMVC" && ${pkgs.python3}/bin/python -m http.server "$PORT"
        '';

        todomvc-test = pkgs.writeShellScriptBin "todomvc-test" ''
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
          PORT="''${PORT:-8000}"
          SPEC="todomvc.ts"
          IMPL="$1"

          # Use writable copy if it exists, otherwise read-only TODOMVC
          TODOMVC_DIR="''${TODOMVC_WORK:-$TODOMVC}"

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
            local path="''${IMPL_PATHS[$impl]:-}"

            if [ -z "$path" ]; then
              echo "Error: Unknown implementation '$impl'"
              echo "Available implementations:"
              printf '%s\n' "''${!IMPL_PATHS[@]}" | sort
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
            for impl in $(printf '%s\n' "''${!IMPL_PATHS[@]}" | sort); do
              if [ -f "$TODOMVC/examples/$impl/package.json" ]; then
                todomvc-build "$impl" > /dev/null 2>&1 || echo "Warning: Failed to build $impl"
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
              TODOMVC_DIR=$(todomvc-build "$IMPL")
              if [ $? -ne 0 ]; then
                echo "Warning: Build failed, using source version"
                TODOMVC_DIR="$TODOMVC"
              fi
            fi
          fi

          # Start Python HTTP server in background
          echo "Starting local server on port $PORT from $TODOMVC_DIR..."
          cd "$TODOMVC_DIR" && ${pkgs.python3}/bin/python -m http.server "$PORT" > /dev/null 2>&1 &
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
            if ${pkgs.curl}/bin/curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
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

            # Create temp directory for logs
            LOG_DIR=$(mktemp -d -t todomvc-test-XXXXXX)
            echo "Logs will be stored in: $LOG_DIR"
            echo ""

            FAILED=()
            PASSED=()

            for impl in $(printf '%s\n' "''${!IMPL_PATHS[@]}" | sort); do
              LOG_FILE="$LOG_DIR/$impl.log"
              echo -n "Testing $impl... "

              if test_impl "$impl" > "$LOG_FILE" 2>&1; then
                PASSED+=("$impl")
                echo "✓ PASSED"
              else
                FAILED+=("$impl")
                echo "✗ FAILED (log: $LOG_FILE)"
              fi
            done

            echo ""
            echo "========================================"
            echo "Summary"
            echo "========================================"
            echo "Passed: ''${#PASSED[@]}"
            echo "Failed: ''${#FAILED[@]}"
            echo "Logs: $LOG_DIR"

            if [ ''${#PASSED[@]} -gt 0 ]; then
              echo ""
              echo "Passed implementations:"
              printf '  ✓ %s\n' "''${PASSED[@]}"
            fi

            if [ ''${#FAILED[@]} -gt 0 ]; then
              echo ""
              echo "Failed implementations:"
              for impl in "''${FAILED[@]}"; do
                printf '  ✗ %s (log: %s/%s.log)\n' "$impl" "$LOG_DIR" "$impl"
              done
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
        '';
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            typescript
            typescript-language-server
            bombadil.packages.${system}.default
            python3
            curl
            chromium
            todomvc-serve
            todomvc-build
            todomvc-test
          ];

          TODOMVC = "${todomvc}";
          TODOMVC_WORK = "/tmp/todomvc-work";

          shellHook = ''
            echo "Bombadil playground development environment"
            echo "node: $(node --version)"
            echo "tsc: $(tsc --version)"
            echo "bombadil: $(bombadil --version)"
            echo ""
            echo "TodoMVC examples:"
            echo "  Source: $TODOMVC (read-only)"
            echo "  Work:   $TODOMVC_WORK (writable, built on-demand)"
            echo ""
            echo "Quick start:"
            echo "  todomvc-test react         # Test React (builds & caches)"
            echo "  todomvc-test dojo          # Test Dojo"
            echo "  todomvc-test all           # Test ALL (saves logs)"
            echo "  todomvc-build react        # Manually build (cached)"
            echo "  todomvc-build react --force # Force rebuild"
            echo "  todomvc-serve              # Start server (port 8000)"
          '';
        };
      }
    );
}
