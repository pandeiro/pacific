from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    page.goto("http://localhost:4901")
    page.wait_for_load_state("networkidle")

    # Take full page screenshot
    page.screenshot(
        path="/Users/mu/Repos/pacifica/dashboard_screenshot.png", full_page=True
    )
    print("Screenshot saved to dashboard_screenshot.png")

    browser.close()
