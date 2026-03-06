{
  description = "Bombadil playground development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    bombadil.url = "github:antithesishq/bombadil/bundle-browser-js";
  };

  outputs = { self, nixpkgs, flake-utils, bombadil }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            typescript
            typescript-language-server
            bombadil.packages.${system}.default
          ];

          shellHook = ''
            echo "Bombadil playground development environment"
            echo "node: $(node --version)"
            echo "tsc: $(tsc --version)"
            echo "bombadil: $(bombadil --version)"
          '';
        };
      });
}
