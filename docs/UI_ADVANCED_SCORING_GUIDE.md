# UI Advanced Scoring Display Guide

## Overview
The commit sidebar now displays rich, predictive analysis for each commit using the advanced scoring system.

## Visual Components

### 1. Score Badge (Color-Coded)
```
┌─────────────────────────────┐
│  [95] 🟢  ← Highly Recommended (85+)
│  [75] ✅  ← Recommended (70-84)
│  [55] 🟡  ← Possible (50-69)
│  [25] 🔴  ← Not Recommended (<50)
└─────────────────────────────┘
```

**Colors:**
- **Green (bright)** - Highly Recommended: `bg-green-900/60 text-green-300 border-green-500/50`
- **Green (soft)** - Recommended: `bg-green-900/40 text-green-400 border-green-500/30`
- **Yellow** - Possible: `bg-yellow-900/50 text-yellow-300 border-yellow-500/50`
- **Red** - Not Recommended: `bg-red-900/50 text-red-300 border-red-500/50`

### 2. Framework Detection
```
┌─────────────────────┐
│  React (Vite)       │ ← Detected framework
│  Vue.js             │
│  Next.js            │
└─────────────────────┘
```

**Display:** Blue text (`text-blue-400`), semibold, truncated if too long

### 3. Setup Time Estimate
```
┌──────────────────┐
│  ⏱️ 1-2 minutes  │ ← Estimated install + startup time
│  ⏱️ 2-4 minutes  │
│  ⏱️ 5+ minutes   │
└──────────────────┘
```

**Display:** Gray text (`text-gray-400`), clock emoji indicator

### 4. Confidence Bar
```
┌──────────────────────┐
│ ████████████░░░░ 85% │ ← Visual confidence meter
│ Green = 80%+         │
│ Yellow = 60-79%      │
│ Orange = <60%        │
└──────────────────────┘
```

**Colors:**
- **Green bar** - High confidence (80%+): `bg-green-500`
- **Yellow bar** - Medium confidence (60-79%): `bg-yellow-500`
- **Orange bar** - Low confidence (<60%): `bg-orange-500`

### 5. Expandable Details
```
┌────────────────────────────────────────┐
│  ▶ Show Details                        │ ← Clickable to expand
└────────────────────────────────────────┘

When clicked:
┌────────────────────────────────────────┐
│  ▼ Hide Details                        │
│  ╭────────────────────────────────────╮│
│  │ Strengths:                         ││
│  │ ✅ Modern framework: React (Vite) ││
│  │ ✅ Has development server script  ││
│  │ ✅ Reasonable dependency count(23)││
│  │                                    ││
│  │ Issues:                            ││
│  │ ⚠️ Requires environment config    ││
│  ╰────────────────────────────────────╯│
└────────────────────────────────────────┘
```

## Full Commit Display Example

### Example 1: Highly Recommended Commit
```
┌──────────────────────────────────────────────────────────┐
│  Add game mechanics and scoring system                   │
│  📝 a556fcb by John Doe                        [95] 🟢  │
│  2025-10-30 21:04:49                  React (Vite)      │
│                                       ⏱️ 1-2 minutes     │
│                                       ████████████░ 100% │
│                                                          │
│  ▶ Show Details                                          │
└──────────────────────────────────────────────────────────┘
```

### Example 2: Recommended Commit (Expanded)
```
┌──────────────────────────────────────────────────────────┐
│  Refactor component structure                            │
│  📝 42017f9 by Jane Smith                      [72] ✅   │
│  2025-10-29 15:30:22                  React (CRA)       │
│                                       ⏱️ 2-4 minutes     │
│                                       ████████░░░░░ 85%  │
│                                                          │
│  ▼ Hide Details                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Strengths:                                         │ │
│  │ ✅ Modern framework detected: React (CRA)         │ │
│  │ ✅ Has development server script                  │ │
│  │ ✅ Well-organized project structure               │ │
│  │                                                    │ │
│  │ Issues:                                            │ │
│  │ ⚠️ Many dependencies (67) - longer install time   │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Example 3: Possible Commit
```
┌──────────────────────────────────────────────────────────┐
│  Update README and docs                                  │
│  📝 2dd7f02 by Bob Wilson                      [55] 🟡  │
│  2025-10-28 10:15:33                     (No framework) │
│                                          ⏱️ < 1 minute   │
│                                          ███████░░░░ 70% │
│                                                          │
│  ▶ Show Details                                          │
└──────────────────────────────────────────────────────────┘
```

### Example 4: Not Recommended Commit
```
┌──────────────────────────────────────────────────────────┐
│  Backend API updates                                     │
│  📝 bf60e02 by Alice Brown                     [15] 🔴  │
│  2025-10-27 08:45:12                     (Python/Flask) │
│                                          ⏱️ unknown      │
│                                          ████░░░░░░░ 40% │
│                                                          │
│  ▶ Show Details                                          │
└──────────────────────────────────────────────────────────┘
```

## Status Indicators

### Loading State
```
┌────────────────────┐
│  🔄 Analyzing...   │ ← Yellow color while checking
└────────────────────┘
```

### Legacy Display (No Score)
```
┌────────┐
│  📺   │ ← Simple preview icon (fallback)
└────────┘
```

## Auto-Launch Banner
When a commit with `highly_recommended` or `recommended` status is selected:
```
┌────────────────────────────────────────────┐
│  🎬 Auto-launching preview...              │ ← Green background
└────────────────────────────────────────────┘
```

## Commit Filter Summary
```
┌────────────────────────────────────────────┐
│  📺 Showing 18 previewable / 20 total      │
└────────────────────────────────────────────┘
```

## Color Palette Reference

### Background Colors
- **Primary background**: `bg-gray-800`
- **Hover state**: `bg-gray-700`
- **Selected commit**: `bg-blue-accent/20`
- **Detail panel**: `bg-gray-900/50`

### Text Colors
- **Primary text**: `text-gray-200`
- **Secondary text**: `text-gray-400`
- **Tertiary text**: `text-gray-500`
- **Framework**: `text-blue-400`
- **Time estimate**: `text-gray-400`
- **Strengths**: `text-green-400`
- **Issues**: `text-yellow-400`

### Border Colors
- **Separator**: `border-gray-700`
- **Score badges**: Various (see above)

## Responsive Behavior

### Sidebar Width
- Default: `w-80` (320px)
- Large screens: `lg:w-96` (384px)

### Text Truncation
- Commit messages: `truncate`
- Framework names: `truncate max-w-[120px]`

## Tooltip Information
Hovering over the score badge shows:
```
Score: 95/100 • Confidence: 100%
HIGHLY RECOMMENDED
```

## Interaction States

### Click Actions
1. **Commit button** → Selects commit
2. **Show/Hide Details button** → Toggles expanded view
3. Clicking anywhere else → No action (clean UX)

### Visual Feedback
- Button hover: `hover:bg-gray-700`
- Score badge hover: Tooltip appears
- Details button hover: `hover:text-blue-300`

---

## Testing the UI

**To see the advanced scoring:**

1. **Restart backend server:**
   ```powershell
   .\restart-backend.ps1
   # OR
   taskkill /F /IM node.exe && npm run server
   ```

2. **Refresh frontend:**
   - Press F5 in your browser

3. **Connect to a repository:**
   - Use `https://github.com/xak1234/Lifty` (default)
   - Click "Connect"

4. **Observe:**
   - Score badges appear (95, 72, 55, etc.)
   - Framework labels show (React (Vite), etc.)
   - Confidence bars animate
   - Setup time estimates display
   - Click "Show Details" to see strengths/issues

## Expected Results

### For Lifty Repository (React + Vite):
- **Score**: 90-95/100
- **Confidence**: 95-100%
- **Recommendation**: 🟢 Highly Recommended
- **Framework**: React (Vite)
- **Setup Time**: 1-2 minutes
- **Strengths**:
  - ✅ Modern framework detected: React (Vite)
  - ✅ Has development server script
  - ✅ Reasonable dependency count (23)
  - ✅ Well-organized project structure
  - ✅ Has build configuration
  - ✅ Has source files (45)

---

**The UI now provides complete, at-a-glance analysis of commit previewability with rich visual feedback!** 🎨✨

