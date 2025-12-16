# Exergy Lab Deployment Guide

Complete guide for deploying Exergy Lab to production on Vercel.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Environment Setup](#environment-setup)
4. [Vercel Deployment](#vercel-deployment)
5. [Modal Labs Setup (Optional)](#modal-labs-setup-optional)
6. [Post-Deployment](#post-deployment)
7. [Domain Configuration](#domain-configuration)
8. [Monitoring & Analytics](#monitoring--analytics)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Accounts
- [x] GitHub account with repository access
- [x] Vercel account ([vercel.com](https://vercel.com))
- [x] Google AI API key ([makersuite.google.com](https://makersuite.google.com))

### Optional Accounts (for full features)
- [ ] OpenAI API key ([platform.openai.com](https://platform.openai.com))
- [ ] HuggingFace token ([huggingface.co](https://huggingface.co))
- [ ] Modal Labs account ([modal.com](https://modal.com)) - for Tier 3 simulations
- [ ] NewsAPI key ([newsapi.org](https://newsapi.org)) - for discovery engine
- [ ] Clerk account ([clerk.com](https://clerk.com)) - for authentication (future)

### Local Requirements
- Node.js 20.x+
- npm 9.x+
- Vercel CLI (optional): `npm i -g vercel`

---

## Pre-Deployment Checklist

### Code Quality

**1. Run All Tests Locally**
```bash
cd exergy-lab

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Build
npm run build
```

All commands should complete without errors.

**2. Verify Environment Variables**
```bash
# Check .env.local has all required keys
cat .env.local

# Required for basic functionality:
# - GOOGLE_AI_API_KEY
# - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (optional but recommended)

# Optional but recommended:
# - OPENAI_API_KEY (AI fallback)
# - NEWSAPI_KEY (discovery engine)
```

**3. Test Critical Paths**
- [ ] Homepage loads
- [ ] Dashboard shows stats
- [ ] Search feature works
- [ ] TEA generator creates reports
- [ ] Experiments generate protocols
- [ ] Simulations run (Tier 1 & 2)
- [ ] Discovery engine generates ideas

**4. Security Audit**
```bash
# Check for vulnerabilities
npm audit

# Fix critical/high vulnerabilities
npm audit fix
```

**5. Performance Check**
```bash
# Run Lighthouse audit (local build)
npm run build
npm run start

# Visit http://localhost:3000 in Chrome
# Open DevTools > Lighthouse
# Run audit on mobile & desktop
# Target: 90+ score
```

---

## Environment Setup

### Production Environment Variables

Create production environment variables based on `.env.production.example`:

```bash
# ===========================================
# PUBLIC VARIABLES (exposed to browser)
# ===========================================

# Application URL (update after deployment)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Clerk Authentication (optional)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx


# ===========================================
# PRIVATE VARIABLES (server-side only)
# ===========================================

# Clerk Secret (optional)
CLERK_SECRET_KEY=sk_live_xxx

# Google AI (Gemini) - PRIMARY AI MODEL
GOOGLE_AI_API_KEY=your_production_gemini_key

# OpenAI - Fallback AI Model (optional but recommended)
OPENAI_API_KEY=your_production_openai_key

# HuggingFace - Specialized Tasks (optional)
HUGGINGFACE_API_KEY=your_production_hf_key

# Modal Labs - Cloud GPU for Tier 3 Simulations (optional)
MODAL_API_KEY=your_production_modal_key
MODAL_ENDPOINT=https://your-app--run-simulation.modal.run
ENABLE_CLOUD_GPU=false  # Set to true only after Modal is deployed

# NewsAPI - Discovery Engine News Search (optional)
NEWSAPI_KEY=your_production_newsapi_key
```

### Getting API Keys

**Google AI (Gemini) - REQUIRED**
1. Go to [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Create API key
4. Copy key to `GOOGLE_AI_API_KEY`

**OpenAI - RECOMMENDED**
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create account/sign in
3. Create new secret key
4. Copy to `OPENAI_API_KEY`
5. Add billing information (pay-as-you-go)

**HuggingFace - OPTIONAL**
1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create new token (read access)
3. Copy to `HUGGINGFACE_API_KEY`

**NewsAPI - RECOMMENDED**
1. Go to [newsapi.org/register](https://newsapi.org/register)
2. Sign up for free account (100 requests/day)
3. Copy API key to `NEWSAPI_KEY`
4. For production: Upgrade to paid plan

**Modal Labs - OPTIONAL (Tier 3 only)**
1. Go to [modal.com/signup](https://modal.com/signup)
2. Create account
3. Set up billing (required for GPU usage)
4. See [Modal Labs Setup](#modal-labs-setup-optional) section

**Clerk - FUTURE**
1. Go to [clerk.com](https://clerk.com)
2. Create application
3. Copy publishable and secret keys

---

## Vercel Deployment

### Method 1: Vercel Dashboard (Recommended)

**Step 1: Import Project**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Project"
3. Select GitHub repository: `your-username/clean-energy-platform`
4. Click "Import"

**Step 2: Configure Project**

```
Framework Preset: Next.js
Root Directory: exergy-lab
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Development Command: npm run dev
Node.js Version: 20.x
```

**Step 3: Add Environment Variables**

In Vercel dashboard:
1. Go to Project Settings > Environment Variables
2. Add each variable from your production list above
3. Set environment: **Production** (and optionally Preview/Development)
4. Click "Add" for each variable

**Important:**
- Do NOT add `.env.local` to git
- Add all secrets through Vercel dashboard only

**Step 4: Deploy**

1. Click "Deploy"
2. Wait for build to complete (2-4 minutes)
3. Visit deployed URL: `https://your-app.vercel.app`

### Method 2: Vercel CLI

**Step 1: Install CLI**
```bash
npm i -g vercel
```

**Step 2: Login**
```bash
vercel login
```

**Step 3: Deploy**
```bash
cd exergy-lab

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**Step 4: Add Environment Variables**
```bash
# Add via CLI
vercel env add GOOGLE_AI_API_KEY production
# Paste value when prompted

# Or via dashboard (easier for many variables)
```

### Method 3: GitHub Integration (Automatic)

**Step 1: Connect Vercel to GitHub**

1. In Vercel dashboard, go to Settings > Git
2. Connect GitHub account
3. Select repository

**Step 2: Configure Auto-Deploy**

```
Production Branch: master
Preview Branches: All branches except master
Deploy Hooks: Enabled
```

**Now:**
- Push to `master` → auto-deploy to production
- Create PR → auto-deploy to preview URL
- Every commit gets unique preview URL

---

## Modal Labs Setup (Optional)

Only needed for Tier 3 GPU simulations. Skip if not using Tier 3.

**Step 1: Install Modal**

```bash
cd modal-simulations
pip install -r requirements.txt
```

**Step 2: Login**

```bash
modal token new
```

**Step 3: Deploy Simulation Service**

```bash
modal deploy simulation_runner.py
```

**Output:**
```
✓ Created function run_simulation
✓ Web endpoint: https://your-username--run-simulation.modal.run
```

**Step 4: Add to Vercel**

1. Copy the web endpoint URL
2. In Vercel dashboard: Add environment variable
   - Name: `MODAL_ENDPOINT`
   - Value: `https://your-username--run-simulation.modal.run`
3. Add Modal API key:
   - Name: `MODAL_API_KEY`
   - Value: (from Modal dashboard > Settings > API Keys)
4. Enable GPU:
   - Name: `ENABLE_CLOUD_GPU`
   - Value: `true`

**Step 5: Set Billing Alerts**

1. Go to Modal dashboard > Billing
2. Set spending alert: $50/month recommended
3. Set hard limit if desired

**Costs:**
- T4 GPU: ~$0.50-$1.00 per simulation
- A100 GPU: ~$1.50-$2.00 per simulation
- Estimated: $20-50/month for moderate usage

---

## Post-Deployment

### Verify Deployment

**1. Check Build Logs**
```
Vercel Dashboard > Project > Deployments > Latest > View Logs
```

Look for:
- ✓ Build completed successfully
- ✓ No TypeScript errors
- ✓ No missing environment variables warnings

**2. Test Production Site**

Visit your deployment URL and test:

- [ ] Homepage loads without errors
- [ ] Dashboard displays correctly
- [ ] Search feature works
- [ ] TEA generator creates reports
- [ ] Experiments generate protocols
- [ ] Simulations run (Tier 1 & 2)
- [ ] Discovery engine generates ideas
- [ ] All images/assets load
- [ ] Mobile view works
- [ ] Dark mode works (if enabled)

**3. Check Console Errors**

- Open browser DevTools > Console
- Navigate through all pages
- Should see no errors

**4. Test API Endpoints**

```bash
# Test discovery API
curl https://your-app.vercel.app/api/discovery \
  -H "Content-Type: application/json" \
  -d '{"prompt":{"description":"test","domains":["solar","wind"]}}'

# Should return JSON with success: true
```

### Enable Analytics

**Vercel Analytics (Recommended)**

1. Go to Project > Analytics
2. Click "Enable Analytics"
3. Free tier included

Tracks:
- Page views
- Unique visitors
- Top pages
- Referrers

**Vercel Speed Insights**

1. Go to Project > Speed Insights
2. Click "Enable Speed Insights"
3. Free tier included

Monitors:
- Core Web Vitals
- FCP, LCP, CLS
- Real user data

### Enable Monitoring

**Error Tracking (Optional - Sentry)**

1. Sign up at [sentry.io](https://sentry.io)
2. Create new Next.js project
3. Install Sentry:
```bash
npm install @sentry/nextjs
npx @sentry/wizard --integration nextjs
```
4. Add Sentry DSN to Vercel environment variables
5. Deploy again

**Uptime Monitoring**

Use free services like:
- [UptimeRobot](https://uptimerobot.com) - 50 monitors free
- [StatusCake](https://www.statuscake.com) - Free tier available
- [Pingdom](https://www.pingdom.com) - 1 free check

Set up alerts for:
- HTTP 500 errors
- Response time > 2s
- Downtime > 1 minute

---

## Domain Configuration

### Adding Custom Domain

**Step 1: Purchase Domain**

Recommended registrars:
- Namecheap
- Google Domains
- Cloudflare Registrar

**Step 2: Add to Vercel**

1. Vercel Dashboard > Project > Settings > Domains
2. Enter your domain: `exergylab.com`
3. Click "Add"

**Step 3: Configure DNS**

Vercel will provide DNS records. Add to your registrar:

**Option A: Nameservers (Recommended)**
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Option B: A Record**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

**Option C: CNAME**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**Step 4: Verify**

1. Wait for DNS propagation (5-60 minutes)
2. Vercel automatically issues SSL certificate
3. Test: `https://your-domain.com`

**Step 5: Update Environment Variables**

```bash
# Update in Vercel dashboard
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Redeploy for changes to take effect.

---

## Monitoring & Analytics

### Performance Monitoring

**Lighthouse CI (Automated)**

Add to `.github/workflows/lighthouse.yml`:

```yaml
name: Lighthouse CI

on: [push]

jobs:
  lighthouseci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install && npm run build
      - run: npm install -g @lhci/cli
      - run: lhci autorun
```

**Real User Monitoring**

Vercel Speed Insights provides:
- Real user Core Web Vitals
- Geographic distribution
- Device breakdown
- Page-by-page performance

### Cost Monitoring

**Vercel Costs:**
- Hobby tier: Free (non-commercial)
- Pro tier: $20/month + usage
- Monitor in Dashboard > Usage

**Modal Labs Costs:**
- Check Dashboard > Billing
- Set alerts for unusual spending
- Review GPU usage monthly

**External API Costs:**
- OpenAI: Check [platform.openai.com/usage](https://platform.openai.com/usage)
- Google AI: Check [console.cloud.google.com](https://console.cloud.google.com)

### Error Tracking

**Check Vercel Logs:**
```
Dashboard > Project > Deployments > Latest > Functions
```

Filter by:
- Errors only
- Specific API routes
- Time range

**Set Up Alerts:**
- Email notifications for failed deployments
- Slack integration for errors
- PagerDuty for critical issues

---

## Troubleshooting

### Build Failures

**Error: "Module not found"**
```bash
# Fix: Check imports use correct paths
# Verify tsconfig.json paths are correct
# Rebuild locally to reproduce
```

**Error: "Environment variable missing"**
```bash
# Fix: Add missing variable in Vercel dashboard
# Check spelling and casing (case-sensitive)
# Redeploy after adding
```

**Error: "Build exceeded maximum duration"**
```bash
# Fix: Optimize build
# Remove unused dependencies
# Use smaller images
# Enable caching in vercel.json
```

### Runtime Errors

**API Routes Timing Out**
```bash
# Vercel serverless function timeout: 10s (Hobby), 60s (Pro)
# Fix: Optimize slow queries
# Use background jobs for long tasks
# Consider upgrading to Pro
```

**"Failed to fetch" Errors**
```bash
# Check:
# 1. API endpoint exists
# 2. Environment variables set correctly
# 3. CORS headers configured
# 4. External APIs accessible
```

**Modal GPU Errors**
```bash
# Check:
# 1. Modal service is deployed
# 2. MODAL_ENDPOINT is correct
# 3. MODAL_API_KEY is valid
# 4. ENABLE_CLOUD_GPU=true
# 5. Modal account has credits
```

### Performance Issues

**Slow Page Loads**
```bash
# Check:
# 1. Lighthouse score in production
# 2. Large images (use next/image)
# 3. Unnecessary JavaScript bundles
# 4. Unoptimized fonts
```

**Slow API Responses**
```bash
# Check:
# 1. Caching is working (check logs)
# 2. External API response times
# 3. Serverless function cold starts
# 4. Database queries (future)
```

---

## Rollback Procedures

### Instant Rollback (Vercel)

**Via Dashboard:**
1. Go to Deployments
2. Find previous working deployment
3. Click "..." menu
4. Click "Promote to Production"
5. Confirm

**Via CLI:**
```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel promote <deployment-url>
```

### Rollback Git Commits

```bash
# Revert last commit
git revert HEAD
git push origin master

# Vercel auto-deploys the revert
```

### Emergency Procedures

**Complete Outage:**
1. Check Vercel status: [vercel-status.com](https://vercel-status.com)
2. Check external API status pages
3. Review error logs
4. Rollback if recent deployment
5. Disable problematic feature via feature flag
6. Post incident report

**Data Loss (Future):**
1. Stop all writes immediately
2. Restore from latest backup
3. Verify data integrity
4. Resume operations
5. Post-mortem analysis

---

## Checklist: Production Deployment

- [ ] All code pushed to GitHub master
- [ ] Local build succeeds
- [ ] All tests pass
- [ ] Environment variables prepared
- [ ] API keys obtained (Google AI minimum)
- [ ] Vercel project created
- [ ] Environment variables added to Vercel
- [ ] Initial deployment successful
- [ ] Production site tested manually
- [ ] API endpoints work correctly
- [ ] Analytics enabled
- [ ] Error tracking configured
- [ ] Uptime monitoring set up
- [ ] Custom domain configured (optional)
- [ ] SSL certificate issued
- [ ] Team notified
- [ ] Documentation updated
- [ ] Rollback plan tested

---

## Maintenance

### Regular Tasks

**Weekly:**
- Check error logs
- Review performance metrics
- Monitor API usage/costs
- Check for npm security alerts

**Monthly:**
- Review analytics data
- Optimize slow pages
- Update dependencies: `npm update`
- Review and clean up old deployments

**Quarterly:**
- Full security audit: `npm audit`
- Performance audit (Lighthouse)
- Review and update documentation
- Backup configuration

---

## Support

**Vercel Support:**
- Docs: [vercel.com/docs](https://vercel.com/docs)
- Community: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
- Email: support@vercel.com (Pro tier)

**Project Support:**
- GitHub Issues: [github.com/your-repo/issues](https://github.com)
- Email: support@exergylab.com

---

**Last Updated:** December 2024
**Version:** 1.0.0
