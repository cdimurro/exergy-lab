# Testing AI Integration - Quick Guide

**Status**: ✅ API Keys Configured!
- Google AI (Gemini): ✅ Active
- NewsAPI: ✅ Active
- Modal: ✅ Credentials added (Tier 3 pending deployment)

---

## 🧪 Test Each Feature

### **1. Search Engine with AI** (2 min)

**Test the AI Query Expansion:**

1. Go to: http://localhost:3000/search

2. Enter a search query:
   ```
   solar panel efficiency improvements
   ```

3. Click Search

4. **What to check**:
   - Search should return real papers from Semantic Scholar, arXiv, PubMed
   - Results should be relevant

5. **View the AI chain**:
   - Go to: http://localhost:3000/admin/logs
   - Find your search log (should be at the top)
   - Click "View" (eye icon)
   - **You should now see**:
     - ✅ Your query in "User Inputs"
     - ✅ AI prompt asking Gemini to expand the query
     - ✅ Gemini's expanded query response
     - ✅ Search results with count

**Expected AI Prompt:**
```
You are a research librarian. Expand this search query to include
relevant synonyms, related terms, and alternative phrasings...

Original query: "solar panel efficiency improvements"
Expanded query:
```

**Expected AI Response:**
```
Solar panel efficiency improvements, photovoltaic cell performance
optimization, PV module enhancement, solar energy conversion efficiency,
maximum power point tracking (MPPT), anti-reflective coating techniques
```

---

### **2. Discovery Engine** (5 min)

**Test Multi-Domain AI Analysis:**

1. Go to: http://localhost:3000/discovery

2. Fill in the form:
   - **Description**: "Develop a novel energy storage system combining solid-state batteries with supercapacitors"
   - **Select Domains**:
     - ✅ Energy Storage
     - ✅ Materials Science
     - ✅ Battery Technology
   - **Goals**:
     - "Achieve 10x faster charging"
     - "Increase energy density by 50%"
     - "Reduce cost by 30%"

3. Click "Run Discovery"

4. **What to check**:
   - Progress indicator should show real search happening
   - Should take 10-30 seconds (actual AI processing)
   - Ideas should be **specific** to your prompt (not generic)

5. **View the AI chain**:
   - Go to: http://localhost:3000/admin/logs
   - Filter by Page: "Discovery"
   - Click the latest discovery log
   - **You should see**:
     - ✅ Your full prompt with domains and goals
     - ✅ Large AI prompt (200+ lines) asking for novel ideas
     - ✅ AI response with JSON containing 3-5 custom ideas
     - ✅ Ideas specific to your input (solid-state + supercapacitors)

**Signs it's working**:
- Ideas mention YOUR specific technologies (solid-state, supercapacitors)
- Feasibility scores are varied (not all 85)
- Cost estimates are specific (not all "$500K - $2M")
- Novel insights reference your goals

**Signs it's still using fallback**:
- Generic idea titles like "Advanced solar-energy Integration"
- All ideas have same scores
- No mention of YOUR specific tech

---

### **3. TEA Calculator AI Insights** (3 min)

**Test AI-Generated Strategic Recommendations:**

1. Go to: http://localhost:3000/tea-generator

2. Fill in basic parameters:
   - **Technology Name**: "Perovskite Solar Panels"
   - **CAPEX**: 5000000
   - **Annual OPEX**: 500000
   - **Annual Revenue**: 1500000
   - **Project Lifetime**: 20 years
   - **Discount Rate**: 8%

3. Click "Calculate TEA"

4. **What to check**:
   - All calculations should complete instantly
   - NPV, IRR, Payback period displayed
   - Charts render
   - **AI Insights section** should show loading → custom insights

5. **View the AI chain**:
   - Go to: http://localhost:3000/admin/logs
   - Filter by Page: "tea-generator"
   - Click the TEA calculation log
   - **You should see**:
     - ✅ Your input parameters
     - ✅ AI prompt with your specific numbers and "Perovskite Solar Panels"
     - ✅ AI response with custom insights about perovskite technology
     - ✅ Recommendations specific to your IRR/NPV/payback

**Expected AI insights should mention**:
- Your technology name (Perovskite)
- Your actual NPV value
- Your actual IRR percentage
- Specific risks for perovskite (stability, scaling)
- Market opportunities

---

### **4. Simulations** (2 min)

**Test Tiers 1 & 2** (No Modal deployment needed yet):

1. Go to: http://localhost:3000/simulations

2. Enter parameters:
   - **Technology**: Solar Panel
   - **Location**: California
   - **System Size**: 10 kW
   - **Hours**: 6 peak sun hours

3. **Test Tier 1 (Local)**:
   - Select Tier 1
   - Click "Run Simulation"
   - **Expected**: Results in <1 second with analytical calculation

4. **Test Tier 2 (Browser AI)**:
   - Select Tier 2
   - Click "Run Simulation"
   - **Expected**: Results in 1-3 seconds with ML prediction

**Note**: Tier 3 (Cloud GPU) requires Modal deployment - we can set that up later

---

### **5. Experiments** (3 min)

**Test AI Experiment Design:**

1. Go to: http://localhost:3000/experiments

2. Fill in experiment request:
   - **Objective**: "Test impact of temperature on solar cell efficiency"
   - **Variables**: "Temperature: 20-80°C, Irradiance: 800-1200 W/m²"
   - **Equipment**: "Solar simulator, temperature chamber, IV curve tracer"

3. Click "Design Experiment"

4. **What to check**:
   - Should take 5-15 seconds (AI processing)
   - Protocol should be **specific** to your objective
   - Steps should mention YOUR equipment
   - Variables should match what you entered

5. **View the AI chain**:
   - Go to: http://localhost:3000/admin/logs
   - Filter by Page: "experiments"
   - Click the experiment design log
   - **You should see**:
     - ✅ Your objective and variables
     - ✅ AI prompt asking to design protocol
     - ✅ AI response with custom experiment steps
     - ✅ Steps mentioning temperature, solar cell, IV curve

---

## 🔍 How to Know AI is Working

### ✅ **AI is Working** if you see:

1. **In Activity Logs**:
   - `aiPrompt` field has actual prompt text (200+ chars)
   - `aiResponse` field has actual response (500+ chars)
   - `aiModel` shows "Gemini Pro" or "gemini-1.5-flash"
   - `aiTokensUsed` shows real numbers (500-2000)
   - `aiResponseTime` shows 2000-10000ms

2. **In Results**:
   - Responses are specific to YOUR inputs
   - Results vary when you change inputs
   - Quality feels thoughtful and detailed
   - Technical terms match your domain

### ❌ **Still Using Fallback** if you see:

1. **In Activity Logs**:
   - `aiPrompt` is null or missing
   - `aiResponse` is null or missing
   - `error` field shows "API key not found" or similar

2. **In Results**:
   - Generic responses that don't match your input
   - Same results every time regardless of input
   - Hardcoded-looking data

---

## 🐛 Troubleshooting

### "AI generation failed" error

**Check**:
```bash
# In exergy-lab directory
cat .env.local | grep GOOGLE_AI_API_KEY
```

**Should see**:
```
GOOGLE_AI_API_KEY=AIzaSy...your_key
```

**If missing**:
1. Make sure `.env.local` is in `exergy-lab/` directory
2. No quotes around the key
3. No spaces around `=`
4. Restart server: Ctrl+C, then `npm run dev`

### Getting rate limit errors

**Google AI Free Tier Limits**:
- 60 requests per minute
- 1,500 requests per day

**If you hit limits**:
- Wait a few minutes
- Or add OpenAI key as fallback
- Or upgrade to paid tier

### Discovery returns same mock data

**Check NewsAPI**:
```bash
cat .env.local | grep NEWSAPI_KEY
```

**Test NewsAPI directly**:
```bash
curl "https://newsapi.org/v2/everything?q=solar+energy&apiKey=YOUR_KEY"
```

---

## 📊 Expected Activity Log Structure

When AI is working, your logs should look like this:

```json
{
  "type": "search_query",
  "page": "search",
  "action": "execute_search",
  "inputs": {
    "query": "solar panel efficiency",
    "filters": {}
  },
  "outputs": {
    "resultsCount": 15,
    "papers": [...]
  },
  "aiModel": "gemini-1.5-flash",
  "aiPrompt": "You are a research librarian. Expand this search query...",
  "aiResponse": "Solar panel efficiency, photovoltaic performance optimization...",
  "aiTokensUsed": 1247,
  "aiResponseTime": 3421,
  "success": true,
  "duration": 4532
}
```

Key fields to check:
- ✅ `aiPrompt` exists and is long
- ✅ `aiResponse` exists and is relevant
- ✅ `aiModel` shows Gemini
- ✅ `aiTokensUsed` > 0
- ✅ `success` is true

---

## 🎯 Quick Test Checklist

- [ ] Search: Enter query → View logs → See AI prompt/response
- [ ] Discovery: Run analysis → Wait 10-30s → View custom ideas in logs
- [ ] TEA: Enter params → Get custom insights → View AI recommendations in logs
- [ ] Simulations: Tier 1 & 2 work (Tier 3 needs Modal deployment)
- [ ] Experiments: Design protocol → See custom steps → View AI design in logs
- [ ] Activity Logs: All logs show AI prompts and responses

---

## 🚀 Next Steps

### **Now** (AI is working!)
1. Test each feature above
2. Check activity logs to verify AI chain
3. Export logs to analyze AI quality

### **Later** (Optional)
1. Deploy Modal service for Tier 3 simulations
2. Add OpenAI key for fallback
3. Add remaining page tracking (Discovery, Experiments, Simulations, TEA)
4. Deploy to Vercel with environment variables

---

## 💡 Pro Tip

**Best way to validate AI quality**:

1. Run a search for "solar energy"
2. Go to `/admin/logs`
3. Click the search log
4. Copy the AI prompt
5. Copy the AI response
6. Compare: Does the response actually answer the prompt?
7. Check: Is the expanded query better than original?

This is your quality assurance workflow! 🎉

---

**Everything should be working now! Go test it out!** 🚀
