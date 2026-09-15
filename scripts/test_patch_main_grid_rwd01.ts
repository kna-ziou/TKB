/**
 * Test for PATCH MAIN-GRID-RWD-01 — MOBILE STICKY DAY HEADER + TOP HORIZONTAL SCROLLBAR
 */
import fs from 'fs';
import path from 'path';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`PASS: ${msg}`);
}

console.log('=== RUNNING PATCH MAIN-GRID-RWD-01 VERIFICATION ===\n');

const timetableGridPath = path.join(process.cwd(), 'src/components/TimetableGrid/TimetableGrid.tsx');
const timetableGridContent = fs.readFileSync(timetableGridPath, 'utf8');

const printToolbarPath = path.join(process.cwd(), 'src/components/PrintToolbar/PrintToolbar.tsx');
const printToolbarContent = fs.readFileSync(printToolbarPath, 'utf8');

const hookPath = path.join(process.cwd(), 'src/hooks/useHorizontalScrollSync.ts');
const hookContent = fs.readFileSync(hookPath, 'utf8');

const indexCssPath = path.join(process.cwd(), 'src/index.css');
const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');

// --------------------------------------------------------------------------
// TEST 1 — Sticky Day Header Structure & Placement
// --------------------------------------------------------------------------
console.log('--- TEST 1: Sticky Day Header Structure & Placement ---');
assert(
  timetableGridContent.includes('id="main-timetable-day-header"'),
  'Test 1.1: main-timetable-day-header exists in TimetableGrid'
);
assert(
  timetableGridContent.includes('ref={headerRef}'),
  'Test 1.2: headerRef is attached to main-timetable-day-header'
);
assert(
  timetableGridContent.includes('sticky z-15') || timetableGridContent.includes('sticky'),
  'Test 1.3: Day Header has sticky positioning'
);
assert(
  timetableGridContent.includes('stickyDayHeaderTop') &&
  timetableGridContent.includes('--print-toolbar-height') &&
  timetableGridContent.includes('--app-header-height'),
  'Test 1.4: Day Header sticks below both App Header and Print Toolbar'
);
assert(
  timetableGridContent.includes('btn-day-menu-'),
  'Test 1.5: Day Action Menu triggers are intact in the sticky Day Header'
);

// --------------------------------------------------------------------------
// TEST 2 — Top Horizontal Scrollbar Proxy Element
// --------------------------------------------------------------------------
console.log('\n--- TEST 2: Top Horizontal Scrollbar Proxy Element ---');
assert(
  timetableGridContent.includes('id="main-timetable-top-scrollbar"'),
  'Test 2.1: main-timetable-top-scrollbar exists'
);
assert(
  timetableGridContent.includes('ref={topScrollRef}'),
  'Test 2.2: topScrollRef is attached to top scrollbar'
);
assert(
  timetableGridContent.includes('overflow-x-auto') && timetableGridContent.includes('overscroll-x-contain'),
  'Test 2.3: Top scrollbar proxy has overflow-x-auto and overscroll-x-contain'
);
assert(
  timetableGridContent.includes('aria-hidden="true"') && timetableGridContent.includes('tabIndex={-1}'),
  'Test 2.4: Top scrollbar proxy has aria-hidden="true" and tabIndex={-1} for accessibility'
);
assert(
  timetableGridContent.includes("display: hasOverflow ? 'block' : 'none'"),
  'Test 2.5: Top scrollbar proxy is conditionally displayed when hasOverflow is true'
);

// --------------------------------------------------------------------------
// TEST 3 — Structural Hierarchy & Stacking Order
// --------------------------------------------------------------------------
console.log('\n--- TEST 3: Structural Hierarchy & Stacking Order ---');
const headerIdx = timetableGridContent.indexOf('id="main-timetable-day-header"');
const topScrollbarIdx = timetableGridContent.indexOf('id="main-timetable-top-scrollbar"');
const bodyViewportIdx = timetableGridContent.indexOf('id="main-timetable-scroll-viewport"');

assert(
  headerIdx < topScrollbarIdx && topScrollbarIdx < bodyViewportIdx,
  'Test 3.1: Strict order: Day Header -> Top Scrollbar -> Scroll Viewport'
);

assert(
  timetableGridContent.includes('stickyTopScrollbarTop') &&
  timetableGridContent.includes('headerHeight'),
  'Test 3.2: Top scrollbar sticks immediately below Day Header using headerHeight'
);

// --------------------------------------------------------------------------
// TEST 4 — Single Timetable Content Canvas & Hidden Bottom Scrollbar
// --------------------------------------------------------------------------
console.log('\n--- TEST 4: Single Timetable Content Canvas & Hidden Bottom Scrollbar ---');
assert(
  timetableGridContent.includes('id="main-timetable-scroll-viewport"'),
  'Test 4.1: main-timetable-scroll-viewport wraps the data table'
);
assert(
  timetableGridContent.includes('scrollbar-width:none') || timetableGridContent.includes('[scrollbar-width:none]'),
  'Test 4.2: Bottom horizontal scrollbar is hidden via scrollbar-width:none'
);
assert(
  timetableGridContent.includes('[&::-webkit-scrollbar]:hidden'),
  'Test 4.3: Webkit scrollbar is hidden on the body viewport'
);
assert(
  timetableGridContent.includes('id="timetable-table"'),
  'Test 4.4: Table retains id="timetable-table"'
);

const morningOccurrences = (timetableGridContent.match(/Buổi sáng/g) || []).length;
const afternoonOccurrences = (timetableGridContent.match(/Buổi chiều/g) || []).length;
assert(
  morningOccurrences === 1 && afternoonOccurrences === 1,
  'Test 4.5: Exactly one Buổi sáng section and one Buổi chiều section rendered (no duplicated canvas)'
);

// --------------------------------------------------------------------------
// TEST 5 — Reusable Hook & Guarded Bidirectional Synchronization
// --------------------------------------------------------------------------
console.log('\n--- TEST 5: Reusable Hook & Guarded Bidirectional Synchronization ---');
assert(
  hookContent.includes('activeScrollSourceRef'),
  'Test 5.1: activeScrollSourceRef prevents circular scroll loops'
);
assert(
  hookContent.includes('handleBodyScroll') &&
  hookContent.includes('headerRef.current.scrollLeft = newScrollLeft'),
  'Test 5.2: handleBodyScroll synchronizes header'
);
assert(
  hookContent.includes('handleTopScroll') &&
  hookContent.includes('bodyRef.current.scrollLeft = newScrollLeft'),
  'Test 5.3: handleTopScroll synchronizes body'
);
assert(
  hookContent.includes('handleHeaderTouchStart') && hookContent.includes('handleHeaderTouchMove'),
  'Test 5.4: Touch swipe handlers for day header'
);
assert(
  hookContent.includes('handleTopTouchStart') && hookContent.includes('handleTopTouchMove'),
  'Test 5.5: Touch swipe handlers for top scrollbar'
);

// --------------------------------------------------------------------------
// TEST 6 — Dynamic PrintToolbar Height Synchronization
// --------------------------------------------------------------------------
console.log('\n--- TEST 6: Dynamic PrintToolbar Height Synchronization ---');
assert(
  printToolbarContent.includes('--print-toolbar-height'),
  'Test 6.1: PrintToolbar synchronizes --print-toolbar-height CSS variable'
);
assert(
  printToolbarContent.includes('toolbarRef'),
  'Test 6.2: PrintToolbar attaches toolbarRef'
);
assert(
  indexCssContent.includes('--print-toolbar-height'),
  'Test 6.3: index.css declares --print-toolbar-height fallback in :root'
);

console.log('\n=== ALL PATCH MAIN-GRID-RWD-01 VERIFICATION TESTS PASSED! ===\n');
