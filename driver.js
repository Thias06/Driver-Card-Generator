name: Keep Supabase awake

on:
  schedule:
    - cron: '17 6 * * *'   # tous les jours vers 06:17 UTC
  workflow_dispatch:        # permet aussi de le lancer à la main

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping the site
        run: curl -s -m 30 https://the-ring-league.vercel.app/api/ping || true
