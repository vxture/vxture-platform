# How to run bash-based deployment scripts on Windows (Git Bash)

This short guide explains how to reliably run the repository's bash deployment scripts on Windows and avoid WSL stub issues.

## Problem

On Windows, `bash` in PATH can point to different executables:

- `C:\Windows\System32\bash.exe` — WSL stub that delegates to WSL `/bin/bash`. If WSL lacks `/bin/bash` or is misconfigured, running `bash` fails with `execvpe(/bin/bash) failed: No such file or directory`.
- `C:\Users\<user>\AppData\Local\Microsoft\WindowsApps\bash.exe` — WindowsApps stub, can also be a launcher.

The safe choice for local script syntax checks is Git Bash provided by Git for Windows.

## Recommended commands

1. Detect which `bash` is on PATH:

```powershell
where.exe bash
```

2. Prefer Git Bash executable, typically at one of:

- `%ProgramFiles%\Git\bin\bash.exe`
- `%ProgramFiles%\Git\usr\bin\bash.exe`
- `D:\Program Files\Git\bin\bash.exe` (or where your Git is installed)

3. Run `bash -n` syntax check explicitly using the full path (PowerShell example):

```powershell
& 'D:\Program Files\Git\bin\bash.exe' -n 'deploy/scripts/40-verify-platform-runtime.sh'
& 'D:\Program Files\Git\bin\bash.exe' -n 'deploy/scripts/51-check-platform-alerts.sh'
```

4. To execute the script under Git Bash when the script expects a POSIX environment:

```powershell
& 'D:\Program Files\Git\bin\bash.exe' 'deploy/scripts/40-verify-platform-runtime.sh'
```

5. If you prefer WSL, ensure WSL has a valid shell:

```powershell
wsl which bash
wsl ls -l /bin/bash
```

If `/bin/bash` is missing, install a supported distro or reinstall WSL.

## CI recommendation

Run deploy script checks on a Linux runner in CI (GitHub Actions, GitLab CI) or on a dedicated Linux server to avoid Windows-specific PATH issues.

## Troubleshooting

- If `where.exe bash` shows `C:\Windows\System32\bash.exe` and your WSL is misconfigured, either fix WSL or call Git Bash directly as above.
- If Git is installed under a different drive (e.g., `D:`), use that absolute path.
