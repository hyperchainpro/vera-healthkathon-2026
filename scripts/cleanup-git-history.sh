#!/bin/bash

#############################################################################
# VERA Git History Cleanup Script
# ================================
# Removes .env file from entire Git history to prevent credential exposure
#
# ⚠️  WARNING: THIS IS A DESTRUCTIVE OPERATION ⚠️
#
# This script will:
# 1. Rewrite Git history to remove .env file
# 2. Require force-push to remote repository
# 3. Invalidate all existing clones (team must re-clone)
#
# BEFORE RUNNING:
# 1. Backup your repository: git clone --mirror <repo-url> repo-backup.git
# 2. Notify your team - all local clones will need to be deleted and re-cloned
# 3. Rotate ALL exposed credentials (database, API keys, secrets)
# 4. Ensure .env is in .gitignore
#
# USAGE:
#   bash scripts/cleanup-git-history.sh
#
#############################################################################

set -e  # Exit on error

echo "🚨 VERA Git History Cleanup Script"
echo "=================================="
echo ""
echo "⚠️  WARNING: This will REWRITE Git history and require force-push"
echo ""
echo "This script will:"
echo "  1. Remove .env from ALL commits in history"
echo "  2. Force-push to remote (invalidates existing clones)"
echo "  3. Require team to delete and re-clone repository"
echo ""
echo "PREREQUISITES:"
echo "  [x] Repository backed up (git clone --mirror)"
echo "  [x] All exposed credentials rotated"
echo "  [x] .env added to .gitignore"
echo "  [x] Team notified about force-push"
echo ""
read -p "Have you completed all prerequisites? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Aborted. Complete prerequisites first."
  exit 1
fi

echo ""
echo "⏳ Creating backup branch..."
git branch backup-before-cleanup || true

echo ""
echo "⏳ Removing .env from Git history..."
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

echo ""
echo "⏳ Cleaning up refs..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ Git history cleaned successfully!"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Verify .env is removed from history:"
echo "   git log --all --full-history -- .env"
echo "   (should return no results)"
echo ""
echo "2. Force-push to remote (DESTRUCTIVE):"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "3. Notify team to re-clone repository:"
echo "   git clone <repo-url> vera-new"
echo ""
echo "4. Verify credentials rotated:"
echo "   - Neon Database password"
echo "   - OpenRouter API key"
echo "   - GitHub PATs"
echo "   - Vercel PATs"
echo "   - All other exposed secrets"
echo ""
echo "5. Update environment variables in:"
echo "   - Vercel dashboard (production)"
echo "   - Local .env files (development)"
echo ""

echo "⚠️  Remember: backup-before-cleanup branch preserved for safety"
