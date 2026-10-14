# Connect WakaTime

The profile currently shows a neutral "Not connected yet" card. No coding-time data is invented or attributed to an unverified account.

1. Create an account at https://wakatime.com/signup and choose a public username.
2. Follow the official VS Code setup guide at https://wakatime.com/vs-code. Enter the API key in the editor's WakaTime setup prompt.
3. Enable public coding activity and public language statistics in the WakaTime profile settings so the statistics card can read them. Project names do not need to be public for this language card.
4. In this repository, open **Settings → Secrets and variables → Actions → Variables**. Add a repository variable named `WAKATIME_USERNAME` containing the WakaTime username.
5. Run **Actions → Update profile widgets → Run workflow**. The WakaTime card will replace the unconnected card once data is available.

The workflow uses public WakaTime statistics. It does not require a WakaTime API key in this repository. Keep the API key in the editor configuration; do not commit it or paste it into a README.

All profile widgets refresh daily at 20:00 UTC. GitHub statistics and the contribution animation work independently of WakaTime setup.
