# Visual Guide: Multi-Pattern Detection System

## 🎬 How It Works (Step by Step)

```
┌─────────────────────────────────────────────────────┐
│  Step 1: Dev Server Process Starts                 │
│  $ npm run dev                                      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Step 2: Backend Captures Logs                     │
│  📝 Every stdout/stderr line is stored             │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Step 3: Check All 5 Indicators (Every 1 Second)   │
│                                                      │
│  [1] Compilation Success       ⚪ Not Matched (0%)  │
│  [2] Server Ready Message      ⚪ Not Matched (0%)  │
│  [3] URL/Port Declaration      ⚪ Not Matched (0%)  │
│  [4] Network Interface Binding ⚪ Not Matched (0%)  │
│  [5] Framework-Specific Ready  ⚪ Not Matched (0%)  │
│                                                      │
│  Total Confidence: 0% ❌ (Need 40%)                 │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Step 4: New Log Arrives                           │
│  📨 "vite v5.0.0 ready in 234 ms"                  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Step 5: Re-Check Indicators                       │
│                                                      │
│  [1] Compilation Success       ⚪ Not Matched (0%)  │
│  [2] Server Ready Message      🟢 MATCHED! (+25%)   │
│  [3] URL/Port Declaration      ⚪ Not Matched (0%)  │
│  [4] Network Interface Binding ⚪ Not Matched (0%)  │
│  [5] Framework-Specific Ready  ⚪ Not Matched (0%)  │
│                                                      │
│  Total Confidence: 25% ⚠️ (Need 40%)                │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Step 6: Another Log Arrives                       │
│  📨 "➜  Local:   http://localhost:5173/"           │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Step 7: Re-Check Again                            │
│                                                      │
│  [1] Compilation Success       ⚪ Not Matched (0%)  │
│  [2] Server Ready Message      🟢 MATCHED! (+25%)   │
│  [3] URL/Port Declaration      🟢 MATCHED! (+25%)   │
│  [4] Network Interface Binding ⚪ Not Matched (0%)  │
│  [5] Framework-Specific Ready  🟢 MATCHED! (+5%)    │
│                                                      │
│  Total Confidence: 55% ✅ READY!                    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Step 8: Verify HTTP Response                      │
│  🌐 Polling http://localhost:5173/ ...             │
│  ✅ Status 200 OK                                   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Step 9: Preview Ready!                            │
│  🎉 Dev server ready and responding!               │
│  📺 Preview available at http://localhost:4000/... │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Confidence Score Progression

```
Time: 0s     [⚫⚪⚪⚪⚪⚪⚪⚪⚪⚪]  0%  ❌ Not Ready
       ↓
Time: 1s     [⚫⚪⚪⚪⚪⚪⚪⚪⚪⚪]  0%  ❌ Not Ready
       ↓
Time: 2s     [🟢🟢⚪⚪⚪⚪⚪⚪⚪⚪] 25%  ⚠️ Not Ready (logs detected)
       ↓
Time: 3s     [🟢🟢🟢🟢🟢⚪⚪⚪⚪⚪] 55%  ✅ READY! (threshold met)
```

---

## 🎯 Indicator Weight Distribution

```
┌────────────────────────────────────────────────┐
│  Compilation Success          [████████████] 30%│
│  Server Ready Message         [██████████]   25%│
│  URL/Port Declaration         [██████████]   25%│
│  Network Interface Binding    [██████]       15%│
│  Framework-Specific Ready     [██]            5%│
└────────────────────────────────────────────────┘

Total Possible: 100%
Threshold:       40% ←─────────────────┐
                                       │
                        Minimum needed to proceed
```

---

## 🔄 Real-Time Detection Flow

```
Backend Console Output:
═══════════════════════════════════════════════════

   Waiting for dev server startup (multi-pattern detection)...
   
   📊 Confidence: 25% | Matched: [Server Ready Message]
   
   📊 Confidence: 30% | Matched: [Server Ready Message, Framework-Specific Ready]
   
   📊 Confidence: 55% | Matched: [Server Ready Message, URL/Port Declaration, Framework-Specific Ready]
   
   ✅ Dev server startup detected (55% confidence)
   📋 Indicators matched: Server Ready Message, URL/Port Declaration, Framework-Specific Ready
   
   Polling port 5173 for HTTP response...
   
   ✅ Dev server ready and responding

═══════════════════════════════════════════════════
```

---

## 🧪 Framework Comparison

### Vite
```
Typical Confidence: 55-60%
Indicators Matched:
  ✅ Server Ready Message     (+25%)
  ✅ URL/Port Declaration     (+25%)
  ✅ Framework-Specific       (+5%)
```

### Create React App
```
Typical Confidence: 55-80%
Indicators Matched:
  ✅ Compilation Success      (+30%)
  ✅ URL/Port Declaration     (+25%)
  ✅ Framework-Specific       (+5%)
```

### Next.js
```
Typical Confidence: 70-80%
Indicators Matched:
  ✅ Compilation Success      (+30%)
  ✅ Server Ready Message     (+25%)
  ✅ URL/Port Declaration     (+25%)
```

### Express.js
```
Typical Confidence: 40-50%
Indicators Matched:
  ✅ URL/Port Declaration     (+25%)
  ✅ Network Interface Binding(+15%)
```

---

## 🚨 Error Scenarios

### Scenario: Timeout After 180s
```
Backend Output:
═══════════════════════════════════════════════════

   ⚠️ Timeout waiting for dev server startup after 180s
   
   📝 Last 10 log messages:
      > transender@1.0.0 dev
      > vite
      
      (No further output detected)

═══════════════════════════════════════════════════

💡 Diagnosis: Server started but produced no logs
✅ Solution: Check if server uses stderr or has silent mode
```

### Scenario: Low Confidence
```
Backend Output:
═══════════════════════════════════════════════════

   📊 Confidence: 15% | Matched: [Network Interface Binding]
   📊 Confidence: 15% | Matched: [Network Interface Binding]
   📊 Confidence: 20% | Matched: [Network Interface Binding, Framework-Specific]
   
   (Continues until timeout...)

═══════════════════════════════════════════════════

💡 Diagnosis: Server is starting but not logging standard patterns
✅ Solution: Lower threshold to 20% or add custom patterns
```

---

## 🎓 Understanding the Weights

### Why These Specific Values?

**30% - Compilation Success**
- Most reliable indicator for build-based frameworks
- Almost always means server will be ready in 1-2 seconds

**25% - Server Ready Message**
- Explicit "I'm ready" announcement
- High confidence when present

**25% - URL/Port Declaration**
- Server announcing its address means it's accessible
- Very strong indicator

**15% - Network Interface Binding**
- Lower-level network operation
- Useful but not as definitive

**5% - Framework-Specific**
- Nice to have, catches edge cases
- Low weight because it's supplementary

**40% Threshold**
- Requires at least 2 strong indicators OR
- Multiple weaker indicators combined
- Balances speed vs. reliability

---

## 💡 Pro Tips

### Tip 1: Watch the Backend Console
```bash
# Terminal output shows real-time detection
npm run server

# You'll see:
📊 Confidence: 25% | Matched: [...]
📊 Confidence: 55% | Matched: [...]
✅ Dev server startup detected (55% confidence)
```

### Tip 2: Customize for Your Framework
```typescript
// In server/index.ts, add custom patterns:
{
  name: 'My Custom Framework',
  weight: 20,
  check: (logs) => logs.some(msg =>
    msg.includes('my-framework-ready-message')
  )
}
```

### Tip 3: Debug with Last 10 Logs
```
On timeout, check what was actually logged:
📝 Last 10 log messages:
   [Shows actual server output]
```

---

## ✅ Quick Reference

| Confidence | Status | Action |
|------------|--------|--------|
| 0-39%      | ❌ Not Ready | Keep waiting |
| 40-69%     | ✅ Ready | Proceed to HTTP check |
| 70-100%    | 🎯 Very Confident | Proceed immediately |

**Recommended Thresholds:**
- **Testing:** 20-30%
- **Production:** 40-50%
- **Strict:** 60%+

