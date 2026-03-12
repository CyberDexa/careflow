#!/bin/zsh
cd /Users/olaoluwabayomi/C/careflow
git add -A
git commit -m "fix(ux): DEF-004 incident redirect banner, DEF-005 new care plan button"
git push origin feature/emar-upgrade
git push origin main
vercel --prod --yes
