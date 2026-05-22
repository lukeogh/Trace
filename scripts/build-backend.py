#!/usr/bin/env python3
"""
Build the Trace. backend as a PyInstaller onedir bundle and stage it where
Tauri's sidecar mechanism expects it.

Tauri v2 sidecar naming convention:
    src-tauri/binaries/{name}-{rust-target-triple}/
e.g. on Windows x64:
    src-tauri/binaries/trace-backend-x86_64-pc-windows-msvc/

Run from the repo root:
    python scripts/build-backend.py
"""
import os
import shutil
import subprocess
import sys


def get_rust_triple() -> str:
    """Return the current Rust target triple via `rustc -vV`."""
    try:
        result = subprocess.run(
            ["rustc", "-vV"],
            capture_output=True, text=True, check=True,
        )
    except FileNotFoundError:
        raise RuntimeError(
            "rustc not found on PATH. Install Rust from https://rustup.rs/ "
            "and re-open your shell."
        )
    for line in result.stdout.splitlines():
        if line.startswith("host:"):
            return line.split(":", 1)[1].strip()
    raise RuntimeError("Could not determine Rust target triple from `rustc -vV`")


def main() -> None:
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(repo_root)

    # 1. Build the React frontend
    print("── Building React frontend...")
    subprocess.run(
        ["npm", "run", "build"],
        cwd=os.path.join(repo_root, "frontend"),
        check=True,
        shell=(sys.platform == "win32"),
    )

    # 2. Run PyInstaller against the spec
    print("── Running PyInstaller...")
    subprocess.run(
        [sys.executable, "-m", "PyInstaller",
         "backend/trace-backend.spec",
         "--noconfirm",
         "--clean"],
        cwd=repo_root,
        check=True,
    )

    # 3. Resolve where Tauri will look for the sidecar
    triple = get_rust_triple()
    dest_dir = os.path.join(repo_root, "src-tauri", "binaries", f"trace-backend-{triple}")
    print(f"── Rust target triple: {triple}")
    print(f"── Copying binary to:  {dest_dir}")

    # 4. Copy the onedir output into src-tauri/binaries/
    src_dir = os.path.join(repo_root, "dist", "trace-backend")
    if not os.path.exists(src_dir):
        raise RuntimeError(
            f"PyInstaller output not found at {src_dir}. "
            "The PyInstaller step may have failed — re-run with --clean."
        )

    if os.path.exists(dest_dir):
        shutil.rmtree(dest_dir)
    shutil.copytree(src_dir, dest_dir)

    print(f"── Done. Backend binary at {dest_dir}")
    print()
    print("Next: run `cargo tauri build` from the repo root to produce the installer.")


if __name__ == "__main__":
    main()
