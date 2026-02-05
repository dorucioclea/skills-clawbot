#!/usr/bin/env python3
"""
TubeScribe Setup Wizard
=======================

Checks dependencies, sets optimal defaults, and offers to install
missing components for the best experience.

Usage:
    python setup.py [--check-only] [--quiet]
"""

import subprocess
import shutil
import sys
import os

# Add script directory to path for imports
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from config import (
    CONFIG_DIR, CONFIG_FILE, DEFAULT_CONFIG,
    load_config, save_config, get_config_dir
)


def print_header():
    print("""
🎬 TubeScribe Setup
═══════════════════
""")


def check_command(cmd: str) -> bool:
    """Check if a command exists in PATH."""
    return shutil.which(cmd) is not None


def check_python_package(package: str) -> bool:
    """Check if a Python package is installed."""
    try:
        __import__(package)
        return True
    except ImportError:
        return False


def get_kokoro_venv_path() -> str:
    """Get the path to Kokoro venv."""
    return os.path.join(CONFIG_DIR, "kokoro-env")


def check_kokoro() -> bool:
    """Check if Kokoro TTS is installed and working."""
    # First check in dedicated venv
    venv_path = get_kokoro_venv_path()
    venv_python = os.path.join(venv_path, "bin", "python")
    
    if os.path.exists(venv_python):
        try:
            result = subprocess.run(
                [venv_python, "-c", "from kokoro import KPipeline"],
                capture_output=True,
                timeout=10
            )
            if result.returncode == 0:
                return True
        except:
            pass
    
    # Fall back to system Python
    try:
        result = subprocess.run(
            [sys.executable, "-c", "from kokoro import KPipeline"],
            capture_output=True,
            timeout=10
        )
        return result.returncode == 0
    except:
        return False


def run_checks() -> dict:
    """Run all dependency checks and return results."""
    return {
        "required": {
            "summarize": check_command("summarize"),
            "python3": sys.version_info >= (3, 8),
        },
        "document": {
            "pandoc": check_command("pandoc"),
            "python_docx": check_python_package("docx"),
        },
        "audio": {
            "kokoro": check_kokoro(),
            "ffmpeg": check_command("ffmpeg"),
        }
    }


def print_status(name: str, installed: bool, required: bool = False):
    """Print a status line."""
    icon = "✅" if installed else ("❌" if required else "⚠️")
    status = "installed" if installed else "not found"
    print(f"  {icon} {name:20} {status}")


def determine_config(checks: dict) -> dict:
    """Determine best config based on available dependencies."""
    from config import deep_copy, DEFAULT_CONFIG
    
    config = deep_copy(DEFAULT_CONFIG)
    
    # Document format: DOCX if possible, else HTML
    if checks["document"]["pandoc"]:
        config["document"]["format"] = "docx"
        config["document"]["engine"] = "pandoc"
    elif checks["document"]["python_docx"]:
        config["document"]["format"] = "docx"
        config["document"]["engine"] = "python_docx"
    else:
        config["document"]["format"] = "html"
        config["document"]["engine"] = None
    
    # Audio format: MP3 if ffmpeg available, else WAV
    if checks["audio"]["ffmpeg"]:
        config["audio"]["format"] = "mp3"
    else:
        config["audio"]["format"] = "wav"
    
    # TTS engine: Kokoro if available, else builtin
    if checks["audio"]["kokoro"]:
        config["audio"]["tts_engine"] = "kokoro"
    else:
        config["audio"]["tts_engine"] = "builtin"
    
    return config


def prompt_yn(question: str) -> bool:
    """Ask a yes/no question."""
    response = input(f"{question} [y/N] ").strip().lower()
    return response == 'y'


def install_with_brew(formula: str, name: str) -> bool:
    """Install something with Homebrew."""
    print(f"  → Installing {name}...")
    try:
        subprocess.run(["brew", "install", formula], check=True)
        print(f"  ✅ {name} installed!")
        return True
    except subprocess.CalledProcessError:
        print(f"  ❌ Installation failed")
        return False
    except FileNotFoundError:
        print(f"  ❌ Homebrew not found. Install manually: brew install {formula}")
        return False


def install_kokoro() -> bool:
    """Install Kokoro TTS in a dedicated virtual environment."""
    venv_path = get_kokoro_venv_path()
    venv_python = os.path.join(venv_path, "bin", "python")
    venv_pip = os.path.join(venv_path, "bin", "pip")
    
    try:
        # Create venv
        print("  → Creating Python environment...")
        subprocess.run([sys.executable, "-m", "venv", venv_path], check=True)
        
        # Upgrade pip
        print("  → Upgrading pip...")
        subprocess.run([venv_pip, "install", "--upgrade", "pip"], 
                      check=True, capture_output=True)
        
        # Install packages
        print("  → Installing Kokoro + dependencies (this may take a minute)...")
        subprocess.run([venv_pip, "install", "kokoro", "soundfile", "torch"],
                      check=True)
        
        print("  ✅ Kokoro installed!")
        print("  ℹ️  Voice model (~500MB) will download on first use")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"  ❌ Installation failed: {e}")
        # Clean up failed install
        if os.path.exists(venv_path):
            import shutil
            shutil.rmtree(venv_path, ignore_errors=True)
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


# save_config is imported from config.py


def main(check_only: bool = False, quiet: bool = False):
    if not quiet:
        print_header()
        print("Checking dependencies...\n")
    
    checks = run_checks()
    
    # === REQUIRED DEPENDENCIES ===
    if not quiet:
        print("Required:")
    
    all_required = True
    for name, installed in checks["required"].items():
        if not quiet:
            print_status(name, installed, required=True)
        if not installed:
            all_required = False
    
    if not all_required:
        print("\n❌ Missing required dependencies!")
        if not checks["required"]["summarize"]:
            print("\n   Install summarize CLI:")
            print("   brew install steipete/tap/summarize")
        sys.exit(1)
    
    # === OPTIONAL DEPENDENCIES ===
    if not quiet:
        print("\nDocument output:")
        print_status("pandoc", checks["document"]["pandoc"])
        print_status("python-docx", checks["document"]["python_docx"])
        
        print("\nAudio output:")
        print_status("kokoro", checks["audio"]["kokoro"])
        print_status("ffmpeg", checks["audio"]["ffmpeg"])
    
    if check_only:
        if quiet:
            print(json.dumps(checks))
        return checks
    
    # === DETERMINE BEST CONFIG ===
    config = determine_config(checks)
    
    if not quiet:
        print("\n" + "─" * 40)
        print("\n📋 Your configuration (based on available tools):\n")
        
        doc_format = config["document"]["format"]
        doc_engine = config["document"].get("engine")
        doc_note = f" (via {doc_engine})" if doc_engine else ""
        if doc_format == "html":
            doc_note = " (no dependencies needed)"
        print(f"  📄 Document: {doc_format.upper()}{doc_note}")
        
        audio_format = config["audio"]["format"]
        tts_engine = config["audio"]["tts_engine"]
        audio_note = " (high-quality voices)" if tts_engine == "kokoro" else " (built-in macOS voice)"
        print(f"  🔊 Audio:    {audio_format.upper()}{audio_note}")
        print(f"  📁 Output:   {config['output']['folder']}")
    
    # === OFFER TO INSTALL MISSING FOR BEST EXPERIENCE ===
    missing_upgrades = []
    
    if not checks["document"]["pandoc"] and not checks["document"]["python_docx"]:
        missing_upgrades.append({
            "name": "pandoc",
            "desc": "DOCX support",
            "why": "Better document formatting, opens in Word/Pages",
            "brew": "pandoc",
            "config_update": lambda c: c["document"].update({"format": "docx", "engine": "pandoc"}),
        })
    
    if not checks["audio"]["ffmpeg"]:
        missing_upgrades.append({
            "name": "ffmpeg",
            "desc": "MP3 audio output",
            "why": "Smaller file sizes (MP3 vs WAV)",
            "brew": "ffmpeg",
            "config_update": lambda c: c["audio"].update({"format": "mp3"}),
        })
    
    if not checks["audio"]["kokoro"]:
        missing_upgrades.append({
            "name": "Kokoro TTS",
            "desc": "High-quality voices",
            "why": "Natural-sounding speech instead of robotic macOS voice",
            "brew": None,
            "installer": install_kokoro,
            "install_note": "Requires ~500MB download (one-time)",
            "config_update": lambda c: c["audio"].update({"tts_engine": "kokoro"}),
        })
    
    if missing_upgrades and not quiet:
        print("\n" + "─" * 40)
        print("\n🚀 For the best experience, consider installing:\n")
        
        for upgrade in missing_upgrades:
            print(f"  • {upgrade['desc']} ({upgrade['name']})")
            print(f"    → {upgrade['why']}")
            
            if upgrade.get("install_note"):
                print(f"    {upgrade['install_note']}")
            
            if upgrade.get("brew"):
                if prompt_yn(f"\n    Install {upgrade['name']}?"):
                    if install_with_brew(upgrade["brew"], upgrade["name"]):
                        if upgrade.get("config_update"):
                            upgrade["config_update"](config)
            elif upgrade.get("installer"):
                if prompt_yn(f"\n    Install {upgrade['name']}?"):
                    if upgrade["installer"]():
                        if upgrade.get("config_update"):
                            upgrade["config_update"](config)
            print()
    
    # === SAVE CONFIG ===
    save_config(config)
    
    if not quiet:
        print("─" * 40)
        print(f"\n💾 Config saved to: {CONFIG_FILE}")
        print("\n✅ Setup complete!\n")
        
        print("Final configuration:")
        print(f"  📄 Document: {config['document']['format'].upper()}")
        print(f"  🔊 Audio:    {config['audio']['format'].upper()} via {config['audio']['tts_engine']}")
        print(f"  📁 Output:   {config['output']['folder']}")
        
        print("\n" + "─" * 40)
        print("\nUsage: Just send a YouTube URL to your OpenClaw agent!")
        print("       Or run: python tubescribe.py <youtube_url>\n")
    
    return config


if __name__ == "__main__":
    check_only = "--check-only" in sys.argv
    quiet = "--quiet" in sys.argv
    main(check_only=check_only, quiet=quiet)
