# Testing Mobile Optimization - Quick Guide

## How to Test Mobile/Tablet Features

### Method 1: Desktop Browser DevTools (Easiest)

1. **Start the development server** (if not already running):
   ```bash
   npm start
   ```

2. **Open in Chrome/Edge**:
   - Navigate to `http://localhost:3000`
   
3. **Open DevTools**:
   - Press `F12` or `Ctrl+Shift+I`
   
4. **Enable Device Toolbar**:
   - Press `Ctrl+Shift+M` or click the device icon
   
5. **Test Different Devices**:
   - Select from dropdown: iPhone SE, iPhone 13 Pro, iPad, iPad Pro, etc.
   - Try both portrait and landscape orientations
   
6. **Check Console**:
   - Look for: `🎮 Lifty Game - Device Detection:`
   - Verify device type, screen info, and auto-scale values
   
7. **Observe Start Screen**:
   - Should show "Mobile Mode" or "Tablet Mode"
   - Should display current scale percentage

### Method 2: Real Device Testing

#### On Mobile Phone (iPhone/Android):
1. Ensure phone and computer are on same network
2. Find your computer's IP address:
   - Windows: `ipconfig` → look for IPv4 Address
   - Mac/Linux: `ifconfig` → look for inet address
3. On phone browser, navigate to: `http://YOUR_IP:3000`
4. Check that game scales appropriately
5. Test touch controls work correctly

#### On Tablet (iPad/Android Tablet):
1. Same steps as mobile phone
2. Test both portrait and landscape
3. Verify scale adjusts automatically on rotation

### What to Look For

#### ✅ Correct Behavior:
- [ ] Game canvas fits on screen without scrolling
- [ ] No horizontal or vertical scrollbars
- [ ] Start screen shows device mode indicator (mobile/tablet only)
- [ ] Scale percentage is displayed and appropriate
- [ ] Console shows device detection info
- [ ] Touch controls respond to taps/swipes
- [ ] Orientation changes adjust scale automatically
- [ ] Manual scale dial works and persists
- [ ] Pull-to-refresh doesn't interfere with gameplay
- [ ] No text selection when touching game

#### ❌ Issues to Watch For:
- [ ] Canvas too large for viewport
- [ ] Scrollbars appearing
- [ ] Touch controls unresponsive
- [ ] Scale not adjusting on rotation
- [ ] Pull-to-refresh triggering
- [ ] Text getting selected when tapping
- [ ] Console errors

### Testing Scenarios

#### Scenario 1: First Load (Auto-Detection)
1. Clear browser localStorage
2. Reload page
3. Console should show device detection
4. Scale should be automatically set based on device
5. Device indicator should appear on start screen

#### Scenario 2: Orientation Change
1. Start in portrait mode
2. Rotate to landscape
3. Scale should auto-adjust (if not manually set)
4. Game should remain playable

#### Scenario 3: Manual Scale Override
1. Click/tap the scale dial (bottom-right corner)
2. Select a different scale (e.g., 75%)
3. Reload page
4. Scale should persist (not auto-adjust)

#### Scenario 4: Reset to Auto
1. Open browser DevTools console
2. Run: `localStorage.removeItem('liftyUserSetScale')`
3. Reload page
4. Scale should auto-detect again

### Device-Specific Expected Scales

| Device | Screen Size | Expected Scale |
|--------|-------------|----------------|
| iPhone SE | 375×667 | 50% |
| iPhone 13 | 390×844 | 55% |
| iPhone 13 Pro Max | 428×926 | 55% |
| Samsung Galaxy S21 | 360×800 | 50% |
| iPad | 768×1024 | 75% (portrait) / 85% (landscape) |
| iPad Pro 11" | 834×1194 | 85% (portrait) / 100% (landscape) |
| iPad Pro 12.9" | 1024×1366 | 85% (portrait) / 100% (landscape) |

### Console Commands for Testing

Open browser console and try these:

```javascript
// Check current device detection
detectDeviceType()

// Check current scale
localStorage.getItem('liftyUiScale')

// Check if user has set manual scale
localStorage.getItem('liftyUserSetScale')

// Reset to auto-detection
localStorage.removeItem('liftyUserSetScale')
localStorage.removeItem('liftyUiScale')
// Then reload page

// View all Lifty localStorage
Object.keys(localStorage).filter(k => k.includes('lifty'))
```

### Performance Testing

1. **Frame Rate**: Should maintain 60fps on most devices
2. **Touch Latency**: Touch response should feel instant
3. **Orientation Change**: Should be smooth (< 500ms)
4. **Memory Usage**: Check DevTools > Performance

### Browser-Specific Testing

#### Safari iOS:
- [ ] Test PWA full-screen mode
- [ ] Check status bar appearance
- [ ] Verify notch handling (iPhone X+)
- [ ] Test home button gestures don't interfere

#### Chrome Android:
- [ ] Test address bar hiding
- [ ] Check navigation bar color
- [ ] Verify back button behavior
- [ ] Test split-screen mode

#### Samsung Internet:
- [ ] Basic functionality
- [ ] Touch controls
- [ ] Screen orientation

### Troubleshooting Common Issues

**Issue: Scale is wrong**
- Clear localStorage: `localStorage.clear()`
- Check console for detection info
- Verify screen dimensions are reported correctly

**Issue: Touch not working**
- Check that `touch-action: none` is applied
- Verify no JavaScript errors in console
- Try different touch positions

**Issue: Pull-to-refresh interfering**
- Verify `overscroll-behavior: none` in CSS
- Check that `passive: false` is set on touch listeners

**Issue: Scale not persisting**
- Check localStorage is enabled
- Verify no Private/Incognito mode
- Check for localStorage quota issues

### Automated Testing (Optional)

If you want to add automated tests:

```javascript
// Example Jest/Testing Library test
describe('Mobile Device Detection', () => {
  it('should detect mobile devices', () => {
    const device = detectDeviceType();
    expect(device).toHaveProperty('isMobile');
    expect(device).toHaveProperty('isTablet');
  });
  
  it('should calculate optimal scale', () => {
    const scale = getOptimalScale();
    expect(scale).toBeGreaterThanOrEqual(0.5);
    expect(scale).toBeLessThanOrEqual(1.5);
  });
});
```

---

## Quick Test Checklist

Use this for rapid verification:

- [ ] Desktop browser shows 100% scale, no device indicator
- [ ] Mobile emulation shows 50-65% scale, "Mobile Mode"
- [ ] Tablet emulation shows 75-100% scale, "Tablet Mode"
- [ ] Console shows device detection log on load
- [ ] Orientation change adjusts scale
- [ ] Manual dial override works
- [ ] Touch controls respond correctly
- [ ] No scrollbars appear
- [ ] Pull-to-refresh is disabled
- [ ] Build succeeds: `npm run build`
- [ ] Dev server runs: `npm start`

---

**Happy Testing!** 📱🎮

If you find any issues, check the console for errors and verify localStorage settings.

