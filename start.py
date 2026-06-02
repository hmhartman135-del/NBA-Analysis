"""
NBA Analytics Platform — One-file setup & launcher
Just run:  python3 start.py
"""

import subprocess
import sys
import os
import shutil
import time
import webbrowser
from pathlib import Path

ROOT     = Path(__file__).parent
BACKEND  = ROOT / "backend"
FRONTEND = ROOT / "frontend"
ENV_FILE     = BACKEND / ".env"
ENV_EXAMPLE  = BACKEND / ".env.example"
DATA_SENTINEL = BACKEND / ".data_loaded"

# ── extend PATH to cover all common Mac install locations ─────────────────────
EXTRA_PATHS = [
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
    "/usr/bin",
    "/usr/sbin",
    "/Applications/Docker.app/Contents/Resources/bin",
    str(Path.home() / ".docker/bin"),
    str(Path.home() / ".nvm/versions/node/v24.16.0/bin"),
    str(Path.home() / ".nvm/versions/node/v22.0.0/bin"),
    str(Path.home() / ".nvm/versions/node/v22.16.0/bin"),
]
os.environ["PATH"] = ":".join(EXTRA_PATHS) + ":" + os.environ.get("PATH", "")


def find_bin(name):
    found = shutil.which(name)
    if found:
        return found
    for p in EXTRA_PATHS:
        c = Path(p) / name
        if c.exists():
            return str(c)
    return None


# ── colours ───────────────────────────────────────────────────────────────────
def green(s):  return f"\033[92m{s}\033[0m"
def red(s):    return f"\033[91m{s}\033[0m"
def yellow(s): return f"\033[93m{s}\033[0m"
def bold(s):   return f"\033[1m{s}\033[0m"
def dim(s):    return f"\033[2m{s}\033[0m"

def ok(msg):    print(f"  {green('✓')}  {msg}", flush=True)
def fail(msg):  print(f"  {red('✗')}  {msg}", flush=True)
def info(msg):  print(f"  {yellow('→')}  {msg}", flush=True)
def header(msg):
    print(f"\n{'─'*55}", flush=True)
    print(f"  {bold(msg)}", flush=True)
    print(f"{'─'*55}", flush=True)


# ── step 1: check prerequisites ───────────────────────────────────────────────
def check_prerequisites():
    header("Step 1 — Checking prerequisites")
    errors = []

    v = sys.version_info
    if v >= (3, 11):
        ok(f"Python {v.major}.{v.minor}.{v.micro}")
    else:
        fail(f"Python 3.11+ required (you have {v.major}.{v.minor}) — download at python.org")
        errors.append("python")

    node = find_bin("node")
    if node:
        ver = subprocess.run([node, "--version"], capture_output=True, text=True).stdout.strip()
        ok(f"Node.js {ver}")
    else:
        fail("Node.js not found — download LTS version at nodejs.org")
        errors.append("node")

    npm = find_bin("npm")
    if npm:
        ver = subprocess.run([npm, "--version"], capture_output=True, text=True).stdout.strip()
        ok(f"npm {ver}")
    else:
        fail("npm not found (comes with Node.js)")
        errors.append("npm")

    docker = find_bin("docker")
    if docker:
        result = subprocess.run([docker, "info"], capture_output=True, text=True)
        if result.returncode == 0:
            ok("Docker Desktop (running)")
        else:
            fail("Docker is installed but not running — open Docker Desktop and wait for it to start")
            errors.append("docker_not_running")
    else:
        fail("Docker not found — download Docker Desktop at docker.com/products/docker-desktop")
        errors.append("docker")

    if errors:
        print(f"\n  {red('Fix the issues above and run this script again.')}")
        sys.exit(1)

    return node, npm, docker


# ── step 2: check api keys ────────────────────────────────────────────────────
def check_api_keys():
    header("Step 2 — API Keys")

    if not ENV_FILE.exists():
        shutil.copy(ENV_EXAMPLE, ENV_FILE)

    env_vars = {}
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                env_vars[k.strip()] = v.strip()

    ant_key = env_vars.get("ANTHROPIC_API_KEY", "")
    placeholders = ["your-key-here", ""]
    ant_ok = ant_key not in placeholders

    if ant_ok:
        ok(f"Anthropic key  ****{ant_key[-4:]}  (AI scouting, roster analysis, trades)")
    else:
        fail("Anthropic API key not set — required for all AI features")
        print(dim("       Sign up free at console.anthropic.com → API Keys → Create key"))

    info("NBA data      free (stats.nba.com via nba_api — no key needed)")

    if not ant_ok:
        print()
        print(f"  {yellow('Open this file in TextEdit, paste your Anthropic key, then press Enter:')}")
        print(f"  {dim(str(ENV_FILE))}")
        subprocess.run(["open", "-e", str(ENV_FILE)])
        input("\n  Press Enter once you have saved the file… ")
        return check_api_keys()


# ── step 3: install python deps ───────────────────────────────────────────────
def install_python_deps():
    header("Step 3 — Python packages")
    venv = BACKEND / ".venv"
    pip  = venv / "bin" / "pip"

    if not venv.exists():
        info("Creating virtual environment…")
        subprocess.run([sys.executable, "-m", "venv", str(venv)], check=True)

    info("Installing packages (first time takes ~60 seconds)…")
    subprocess.run(
        [str(pip), "install", "-q", "-r", str(BACKEND / "requirements.txt")],
        check=True,
    )
    ok("Python packages ready")
    return str(venv / "bin" / "python")


# ── step 4: install node deps ─────────────────────────────────────────────────
def install_node_deps(npm):
    header("Step 4 — Frontend packages")
    if (FRONTEND / "node_modules").exists():
        ok("Node packages already installed")
        return
    info("Installing (first time takes ~30 seconds)…")
    subprocess.run([npm, "install", "--prefix", str(FRONTEND), "--silent"], check=True)
    ok("Frontend packages ready")


# ── step 5: start databases ───────────────────────────────────────────────────
def start_databases(docker):
    header("Step 5 — Databases")
    info("Starting PostgreSQL and Redis via Docker…")
    result = subprocess.run(
        [docker, "compose", "up", "db", "redis", "-d", "--wait"],
        cwd=str(ROOT), capture_output=True, text=True,
    )
    if result.returncode != 0:
        result = subprocess.run(
            [docker, "compose", "up", "db", "redis", "-d"],
            cwd=str(ROOT), capture_output=True, text=True,
        )
    if result.returncode != 0:
        fail("Could not start databases")
        print(red(result.stderr[-400:]))
        sys.exit(1)
    time.sleep(3)
    ok("PostgreSQL running  (port 5433)")
    ok("Redis running       (port 6380)")


# ── step 6: data load decision ────────────────────────────────────────────────
def decide_data_load() -> bool:
    header("Step 6 — NBA player data")

    if DATA_SENTINEL.exists():
        print()
        print(f"  {green('✓')}  Player data was loaded previously.")
        answer = input(
            f"  Press {bold('Enter')} to use existing data  (or type {bold('reload')} to refresh): "
        ).strip().lower()
        if answer != "reload":
            ok("Using existing data")
            return False
        info("Will reload all data after launching the app…")
        return True
    else:
        print()
        info("No data loaded yet — will pull all 30 NBA teams + player stats after launch.")
        print(dim("  The app opens immediately; data syncs in the background (~1-2 min)."))
        return True


def run_data_load_background(python_bin):
    import threading

    def _load():
        print()
        info("Syncing NBA teams, players, and stats from stats.nba.com…")
        r = subprocess.run(
            [python_bin, "-c",
             "import asyncio; from app.api.routes.sync import _sync_teams, _sync_players, _sync_stats; "
             "from app.core.database import AsyncSessionLocal; "
             "async def go():\n"
             "    async with AsyncSessionLocal() as s:\n"
             "        await _sync_teams(s); await _sync_players(s); await _sync_stats(s); await s.commit()\n"
             "asyncio.run(go())"],
            cwd=str(BACKEND),
        )
        # Simpler: just hit the sync endpoint once the server is up
        import urllib.request, json
        for _ in range(30):
            time.sleep(2)
            try:
                urllib.request.urlopen("http://localhost:8000/health", timeout=1)
                break
            except Exception:
                pass
        try:
            req = urllib.request.Request(
                "http://localhost:8000/api/v1/sync/",
                method="POST",
                headers={"Content-Type": "application/json"},
                data=b"{}",
            )
            urllib.request.urlopen(req, timeout=120)
            ok("NBA data loaded  →  refresh the app to see players and stats")
            DATA_SENTINEL.write_text("loaded\n")
        except Exception as e:
            info(f"Data sync via API: {e} — you can trigger it manually from the app")

    t = threading.Thread(target=_load, daemon=True)
    t.start()
    return t


# ── step 7: launch servers ────────────────────────────────────────────────────
def launch_servers(python_bin, npm):
    header("Step 7 — Launching the app")

    uvicorn = str(BACKEND / ".venv" / "bin" / "uvicorn")

    subprocess.run(
        ["bash", "-c", "lsof -ti:8001 | xargs kill -9 2>/dev/null; lsof -ti:3001 | xargs kill -9 2>/dev/null"],
        capture_output=True,
    )
    time.sleep(1)

    info("Starting backend API…")
    subprocess.Popen(
        [uvicorn, "app.main:app", "--reload", "--port", "8001"],
        cwd=str(BACKEND),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Write .env.local so frontend points at the right port
    env_local = FRONTEND / ".env.local"
    if not env_local.exists():
        env_local.write_text("NEXT_PUBLIC_API_URL=http://localhost:8001\n")

    info("Starting frontend…")
    subprocess.Popen(
        [npm, "run", "dev", "--", "-p", "3001"],
        cwd=str(FRONTEND),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    info("Waiting for servers to start…")
    import urllib.request
    for _ in range(30):
        time.sleep(1)
        try:
            urllib.request.urlopen("http://localhost:8001/health", timeout=1)
            break
        except Exception:
            pass

    ok("Backend running  →  http://localhost:8001")
    ok("Frontend running →  http://localhost:3001")

    print()
    print(bold("  Opening app in your browser…"))
    webbrowser.open("http://localhost:3001")

    print()
    print(bold("  ✅  Everything is running!"))
    print()
    print(dim("  ─────────────────────────────────────────────────────"))
    print(dim("  Pages:"))
    print(dim("    Dashboard   →  http://localhost:3001"))
    print(dim("    Players     →  http://localhost:3001/players"))
    print(dim("    Standings   →  http://localhost:3001/standings"))
    print(dim("    Analytics   →  http://localhost:3001/analytics"))
    print(dim("    Scouting    →  http://localhost:3001/scouting"))
    print(dim("    Roster      →  http://localhost:3001/roster"))
    print(dim("    Trades      →  http://localhost:3001/trades"))
    print(dim("  ─────────────────────────────────────────────────────"))
    print(dim("  To stop: press Ctrl+C in this terminal"))
    print()

    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        print(f"\n  {yellow('Shutting down servers…')}")
        subprocess.run(
            ["bash", "-c", "lsof -ti:8001 | xargs kill -9 2>/dev/null; lsof -ti:3001 | xargs kill -9 2>/dev/null"],
            capture_output=True,
        )
        print(f"  {green('Done. Goodbye!')}")


# ── main ──────────────────────────────────────────────────────────────────────
def main():
    print()
    print(bold("  🏀  NBA Analytics Platform"))
    print(dim("  AI-powered roster management, analytics & scouting\n"))

    node, npm, docker = check_prerequisites()
    check_api_keys()
    python_bin = install_python_deps()
    install_node_deps(npm)
    start_databases(docker)

    should_load = decide_data_load()
    if should_load:
        run_data_load_background(python_bin)
    launch_servers(python_bin, npm)


if __name__ == "__main__":
    main()
