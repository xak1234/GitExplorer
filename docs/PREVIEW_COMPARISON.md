# Preview Window Comparison

Choose the right preview window for your workflow.

## 🎬 preview.html (Compact)

**Best for:** General development, first-time users, full feature set

### Features
- ✅ **36px header** with clear labels
- ✅ **Collapsible to 28px** using [⇕] button
- ✅ Full text labels on buttons
- ✅ Responsive design (adapts to narrow viewports)
- ✅ Remembers your size preference
- ✅ Easy to understand controls

### Controls
```
🎬 Video Output  [↻ Reload] [🌐 Open in Browser] [🔧 DevTools] [⇕ Toggle Size]  Status: ✓ App Loaded
```

### Visual Layout
```
┌────────────────────────────────────────────────────────────┐
│ 🎬 Video Output [↻ Reload][🌐][🔧][⇕]      Status: ✓      │ ← 36px (28px minimized)
├────────────────────────────────────────────────────────────┤
│                                                            │
│                                                            │
│              Your Application Preview                      │
│                  (Full Screen)                             │
│                                                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### When to Use
- ✓ You want clear, labeled controls
- ✓ You're new to the project
- ✓ You need quick access to all features
- ✓ You have a reasonable viewport size (>600px wide)

---

## ⚡ preview-minimal.html (Ultra-Minimal)

**Best for:** Side-by-side layouts, maximum preview space, experienced users

### Features
- ✅ **24px header** (smallest possible)
- ✅ **Can hide completely** - click [⊝] or double-click anywhere
- ✅ Semi-transparent header (0.7 opacity, full on hover)
- ✅ Icon-only buttons (tooltips on hover)
- ✅ Remembers visibility preference
- ✅ Maximum screen real estate for preview

### Controls
```
[↻] [🌐] [⊝]  Status: ✓
```

### Visual Layout (Header Visible)
```
┌────────────────────────────────────────────────────────────┐
│ [↻][🌐][⊝]                                       Status: ✓ │ ← 24px (transparent)
├────────────────────────────────────────────────────────────┤
│                                                            │
│                                                            │
│              Your Application Preview                      │
│                  (Full Screen)                             │
│                                                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Visual Layout (Header Hidden)
```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                                                            │
│                                                            │
│              Your Application Preview                      │
│                  (Full Screen)                             │
│                                                            │
│                                                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```
*Double-click anywhere to toggle header visibility*

### When to Use
- ✓ Split-pane or side-by-side layout
- ✓ Small or narrow viewport (<600px wide)
- ✓ You know the controls by heart
- ✓ You want maximum preview space
- ✓ Presenting or demoing the app

---

## Side-by-Side Comparison

| Feature | preview.html | preview-minimal.html |
|---------|--------------|---------------------|
| Header Height | 36px (28px min) | 24px (0px hidden) |
| Button Labels | ✓ Full text | Icon only |
| Transparency | ✗ Solid | ✓ Semi-transparent |
| Hide Completely | ✗ No | ✓ Yes |
| Responsive Design | ✓ Advanced | ✓ Basic |
| Tooltips | ✓ Yes | ✓ Yes |
| Size Memory | ✓ Yes | ✓ Yes |
| Double-click Hide | ✗ No | ✓ Yes |
| Best For | General use | Minimal chrome |

---

## Recommended Layouts

### Layout 1: Side-by-Side with Compact Preview
**Use:** `preview.html`

```
┌─────────────────────┬─────────────────────┐
│                     │ Video Output (36px) │
│   Code Editor       │ ↻ 🌐 🔧 ⇕    Status │
│                     ├─────────────────────┤
│   (Your files)      │                     │
│                     │   Preview Window    │
│                     │                     │
├─────────────────────┴─────────────────────┤
│ Terminal 1: Backend │ Terminal 2: Frontend│
└─────────────────────┴─────────────────────┘
```

### Layout 2: Narrow Split with Minimal Preview
**Use:** `preview-minimal.html`

```
┌──────────┬──────────────────────────────────┐
│          │ ↻ 🌐 ⊝  ✓  (24px, transparent)  │
│  Editor  ├──────────────────────────────────┤
│          │                                  │
│          │        Preview Window            │
│          │      (Maximum Space)             │
│          │                                  │
├──────────┴──────────────────────────────────┤
│ Terminal: Both servers (split)              │
└─────────────────────────────────────────────┘
```

### Layout 3: Presentation Mode
**Use:** `preview-minimal.html` (hidden controls)

```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│         Your Application Preview            │
│             (No Distractions)               │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```
*Double-click anywhere to show/hide controls*

---

## Quick Tips

### Switching Between Versions
1. Open both files in VS Code tabs
2. Switch tabs to use different version
3. Or keep both open in different editor groups

### Keyboard Shortcuts (In Preview)
- **Double-click** (minimal.html only): Toggle header visibility
- **Right-click + Inspect**: Open DevTools
- **Ctrl+R / Cmd+R**: Reload page (browser built-in)

### Performance
Both versions are lightweight:
- **preview.html**: ~8KB
- **preview-minimal.html**: ~5KB
- No external dependencies
- Fast load times
- Low memory footprint

---

## Try Both!

Not sure which to use? Try both and see which fits your workflow better:

```powershell
# Open standard version
start preview.html

# Open minimal version
start preview-minimal.html
```

Or in VS Code Simple Browser:
1. `Ctrl+Shift+P` → "Simple Browser: Show"
2. Enter path: `file:///${workspaceFolder}/preview.html` OR
3. Enter path: `file:///${workspaceFolder}/preview-minimal.html`

---

## Need Help?

- **Controls not showing?** - Refresh the page or check browser console
- **Server not connecting?** - Ensure `npm run dev:full` is running
- **Preview blank?** - Check terminal logs for errors
- **Want even less chrome?** - Use `preview-minimal.html` with hidden controls

