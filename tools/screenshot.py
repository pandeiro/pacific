#!/usr/bin/env python3
"""Capture screenshots of Pacifica dashboard for UI verification.

Usage:
    python tools/screenshot.py                    # Local environment (default)
    python tools/screenshot.py --env staging      # Staging environment
    python tools/screenshot.py --env prod         # Production environment
    python tools/screenshot.py --url http://...   # Custom URL
"""

from pathlib import Path
from datetime import datetime
from typing import Optional
import argparse
from playwright.sync_api import sync_playwright

# Screenshots directory
SCREENSHOTS_DIR = Path(__file__).parent.parent / "screenshots"

# Environment URLs
ENV_URLS = {
    "local": "http://localhost:4901",
    "staging": "https://staging.pch.onl",
    "prod": "https://pch.onl",
}


def take_screenshot(
    env: str = "local", url: Optional[str] = None, filename: Optional[str] = None
) -> Path:
    """Take a screenshot of the dashboard and save to screenshots directory.

    Args:
        env: Environment name (local, staging, prod) - used in filename
        url: Custom URL to screenshot (overrides env default)
        filename: Custom filename (overrides auto-generated name)

    Returns:
        Path to saved screenshot
    """
    # Ensure screenshots directory exists
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

    # Determine URL
    target_url = url or ENV_URLS.get(env, ENV_URLS["local"])

    # Generate filename with timestamp and environment if not provided
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"dashboard_{env}_{timestamp}.png"

    screenshot_path = SCREENSHOTS_DIR / filename

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto(target_url)
        page.wait_for_load_state("networkidle")

        # Take full page screenshot
        page.screenshot(path=str(screenshot_path), full_page=True)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

    return screenshot_path


def main():
    parser = argparse.ArgumentParser(
        description="Capture screenshots of Pacifica dashboard"
    )
    parser.add_argument(
        "--env",
        choices=["local", "staging", "prod"],
        default="local",
        help="Environment to screenshot (default: local)",
    )
    parser.add_argument(
        "--url", help="Custom URL to screenshot (overrides env default)"
    )
    parser.add_argument(
        "--filename", help="Custom filename (overrides auto-generated name)"
    )

    args = parser.parse_args()
    take_screenshot(env=args.env, url=args.url, filename=args.filename)


if __name__ == "__main__":
    main()
