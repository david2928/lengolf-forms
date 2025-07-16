@echo off
echo Running Playwright codegen for Instagram debugging...
echo.
echo This will open a browser where you can interact with Instagram
echo and generate the code for the actions you perform.
echo.
echo Usage:
echo 1. The browser will open automatically
echo 2. Navigate to any Instagram profile
echo 3. Click on elements you want to scrape
echo 4. Copy the generated code from the terminal
echo.
pause
npx playwright codegen https://www.instagram.com/fairwaygolfandcityclub/