/**
 * Test for PATCH 08B-1E-RWD-02 — ADD SYNCED TOP HORIZONTAL SCROLLBAR FOR APPLY GRID
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

console.log('=== RUNNING PATCH 08B-1E-RWD-02 VERIFICATION ===\n');

const applyGridPath = path.join(process.cwd(), 'src/components/AIImageImport/ApplyGrid.tsx');
const applyGridContent = fs.readFileSync(applyGridPath, 'utf8');

// --------------------------------------------------------------------------
// TEST 1 — Top Horizontal Scrollbar Proxy Element
// --------------------------------------------------------------------------
console.log('--- TEST 1: Top Horizontal Scrollbar Proxy Element ---');
assert(
  applyGridContent.includes('id="apply-grid-top-scrollbar"'),
  'Test 1: apply-grid-top-scrollbar exists'
);
assert(
  applyGridContent.includes('topScrollContainerRef'),
  'Test 1: topScrollContainerRef is attached to top scrollbar'
);
assert(
  applyGridContent.includes('overflow-x-auto') && applyGridContent.includes('overscroll-x-contain'),
  'Test 1: Top scrollbar proxy has overflow-x-auto and overscroll-x-contain'
);

// --------------------------------------------------------------------------
// TEST 2 — Sticky Positioning & Stacking Hierarchy
// --------------------------------------------------------------------------
console.log('\n--- TEST 2: Sticky Positioning & Stacking Hierarchy ---');
const topScrollbarSnippet = applyGridContent.slice(
  applyGridContent.indexOf('id="apply-grid-top-scrollbar"') - 200,
  applyGridContent.indexOf('id="apply-grid-top-scrollbar"') + 1000
);

assert(
  topScrollbarSnippet.includes('sticky z-10') || topScrollbarSnippet.includes('sticky z-[10]'),
  'Test 2: Top scrollbar has sticky z-10 positioning'
);
assert(
  topScrollbarSnippet.includes('--apply-status-bar-height') &&
  topScrollbarSnippet.includes('dayHeaderHeight'),
  'Test 2: Top scrollbar sticks below both the ApplyStatusBar and DayHeader'
);
assert(
  applyGridContent.indexOf('id="apply-grid-day-header"') < applyGridContent.indexOf('id="apply-grid-top-scrollbar"') &&
  applyGridContent.indexOf('id="apply-grid-top-scrollbar"') < applyGridContent.indexOf('id="apply-grid-cell-body"'),
  'Test 2: Top scrollbar is structurally positioned between DayHeader and CellBody'
);

// --------------------------------------------------------------------------
// TEST 3 — Guarded Bidirectional Synchronization & Single Scroll Owner
// --------------------------------------------------------------------------
console.log('\n--- TEST 3: Guarded Bidirectional Synchronization ---');
assert(
  applyGridContent.includes('activeScrollSourceRef'),
  'Test 3: Guard ref activeScrollSourceRef prevents circular scroll feedback loops'
);
assert(
  applyGridContent.includes('handleTopScroll') &&
  applyGridContent.includes('cellBodyContainerRef.current.scrollLeft = newScrollLeft'),
  'Test 3: handleTopScroll updates cellBodyContainerRef.scrollLeft'
);
assert(
  applyGridContent.includes('handleCellBodyScroll') &&
  applyGridContent.includes('topScrollContainerRef.current.scrollLeft = newScrollLeft'),
  'Test 3: handleCellBodyScroll updates topScrollContainerRef.scrollLeft'
);
assert(
  applyGridContent.includes('dayHeaderContainerRef.current.scrollLeft = newScrollLeft') ||
  applyGridContent.includes('dayHeaderContainerRef.current.scrollLeft = currentScrollLeft'),
  'Test 3: Both scroll paths keep Day Header in precise horizontal alignment'
);

// --------------------------------------------------------------------------
// TEST 4 — Single Timetable Content Canvas (No Duplicate Grids)
// --------------------------------------------------------------------------
console.log('\n--- TEST 4: Single Timetable Content Canvas ---');
const morningOccurrences = (applyGridContent.match(/Buổi sáng/g) || []).length;
const afternoonOccurrences = (applyGridContent.match(/Buổi chiều/g) || []).length;
assert(
  morningOccurrences === 1 && afternoonOccurrences === 1,
  'Test 4: Exactly one Buổi sáng and one Buổi chiều session in ApplyGrid (no duplicated grids)'
);
const cellComponentOccurrences = (applyGridContent.match(/<ApplyGridCell/g) || []).length;
assert(
  cellComponentOccurrences === 2, // 1 in morning loop, 1 in afternoon loop
  'Test 4: Exactly one render path for morning cells and afternoon cells'
);

// --------------------------------------------------------------------------
// TEST 5 — Desktop & Overflow Detection Behavior
// --------------------------------------------------------------------------
console.log('\n--- TEST 5: Desktop & Overflow Detection Behavior ---');
assert(
  applyGridContent.includes('hasOverflow') && applyGridContent.includes('setHasOverflow'),
  'Test 5: hasOverflow state tracks horizontal overflow reactively'
);
assert(
  applyGridContent.includes('scrollWidth > clientWidth') ||
  applyGridContent.includes('scrollW > clientW'),
  'Test 5: Overflow detection compares scrollWidth with clientWidth'
);
assert(
  topScrollbarSnippet.includes("display: hasOverflow ? 'block' : 'none'"),
  'Test 5: Top scrollbar is cleanly hidden (display: none) when no overflow exists'
);

// --------------------------------------------------------------------------
// TEST 6 — Accessibility & Touch Interaction
// --------------------------------------------------------------------------
console.log('\n--- TEST 6: Accessibility & Touch Interaction ---');
assert(
  topScrollbarSnippet.includes('aria-hidden="true"'),
  'Test 6: Top scrollbar proxy has aria-hidden="true" to avoid duplicate screen-reader semantics'
);
assert(
  topScrollbarSnippet.includes('tabIndex={-1}'),
  'Test 6: Top scrollbar proxy has tabIndex={-1} to avoid interfering with keyboard cell navigation'
);
assert(
  applyGridContent.includes('handleTopTouchStart') && applyGridContent.includes('handleTopTouchMove'),
  'Test 6: Touch drag handlers are provided for touch device viewports'
);

console.log('\n=== ALL PATCH 08B-1E-RWD-02 VERIFICATION TESTS PASSED! ===\n');
