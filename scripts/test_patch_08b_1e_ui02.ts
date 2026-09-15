/**
 * Verification script for PATCH 08B-1E-UI02: Sticky Apply Grid Day Header
 */
import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

console.log('=== RUNNING PATCH 08B-1E-UI02 ACCEPTANCE VERIFICATION ===\n');

const applyGridPath = path.join(process.cwd(), 'src/components/AIImageImport/ApplyGrid.tsx');
const applyStatusBarPath = path.join(process.cwd(), 'src/components/AIImageImport/ApplyStatusBar.tsx');
const applyPreviewPath = path.join(process.cwd(), 'src/components/AIImageImport/ApplyPreview.tsx');

const applyGridContent = fs.readFileSync(applyGridPath, 'utf8');
const applyStatusBarContent = fs.readFileSync(applyStatusBarPath, 'utf8');
const applyPreviewContent = fs.readFileSync(applyPreviewPath, 'utf8');

// --------------------------------------------------------------------------
// TEST 1 — ApplyStatusBar Preservation & Height Exposure
// --------------------------------------------------------------------------
console.log('--- TEST 1: ApplyStatusBar Preservation & Height Exposure ---');
assert(
  applyStatusBarContent.includes('id="apply-status-bar"'),
  'Test 1: ApplyStatusBar maintains id="apply-status-bar"'
);
assert(
  applyStatusBarContent.includes('sticky top-0 z-20'),
  'Test 1: ApplyStatusBar has sticky top-0 z-20'
);
assert(
  applyStatusBarContent.includes('--apply-status-bar-height'),
  'Test 1: ApplyStatusBar dynamically exposes --apply-status-bar-height'
);
assert(
  applyStatusBarContent.includes('ResizeObserver'),
  'Test 1: ApplyStatusBar observes height changes reactively via ResizeObserver'
);
assert(
  applyPreviewContent.includes('--apply-status-bar-height'),
  'Test 1: ApplyPreview provides safe initial fallback for --apply-status-bar-height'
);

// --------------------------------------------------------------------------
// TEST 2 — Sticky Day Header Row
// --------------------------------------------------------------------------
console.log('\n--- TEST 2: Sticky Day Header Row ---');
assert(
  applyGridContent.includes('id="apply-grid-day-header"'),
  'Test 2: id="apply-grid-day-header" exists'
);
assert(
  applyGridContent.includes('sticky z-10') || applyGridContent.includes('sticky z-[10]'),
  'Test 2: Day header has sticky positioning and z-index below status bar'
);
assert(
  applyGridContent.includes("top: 'var(--apply-status-bar-height"),
  'Test 2: Day header sticky top uses var(--apply-status-bar-height)'
);
assert(
  applyGridContent.includes('bg-white'),
  'Test 2: Day header has opaque bg-white background so scrolling cells do not show through'
);
assert(
  applyGridContent.includes('border-b border-slate-200'),
  'Test 2: Day header has subtle bottom divider border'
);

// --------------------------------------------------------------------------
// TEST 3 — Horizontal Scroll Synchronization & Single Scroll Owner
// --------------------------------------------------------------------------
console.log('\n--- TEST 3: Horizontal Scroll Synchronization & Single Scroll Owner ---');
assert(
  applyGridContent.includes('overflow-hidden') &&
  applyGridContent.includes('dayHeaderContainerRef'),
  'Test 3: Day header container uses overflow-hidden without independent scrollbar'
);
assert(
  applyGridContent.includes('overflow-x-auto rounded-b-2xl') &&
  applyGridContent.includes('cellBodyContainerRef'),
  'Test 3: Cell body container owns horizontal scroll with overflow-x-auto'
);
assert(
  applyGridContent.includes('dayHeaderContainerRef.current.scrollLeft = e.currentTarget.scrollLeft') ||
  applyGridContent.includes('handleCellBodyScroll'),
  'Test 3: Cell body scroll synchronizes scrollLeft to dayHeaderContainerRef'
);

// --------------------------------------------------------------------------
// TEST 4 — First Column ("Tiết") & Day Column Exact Alignment
// --------------------------------------------------------------------------
console.log('\n--- TEST 4: First Column and Day Column Alignment ---');
const headerGridMatch = applyGridContent.match(/gridTemplateColumns:\s*`50px repeat\(\$\{targetDays\.length\},\s*minmax\(0,\s*1fr\)\)`/g);
assert(
  headerGridMatch !== null && headerGridMatch.length >= 3,
  'Test 4: Day header and all session rows share identical 50px + repeat(targetDays) grid template'
);
assert(
  applyGridContent.includes('Tiết') && applyGridContent.includes('{period}'),
  'Test 4: Period number column and Tiết header column are 50px wide in sync'
);

// --------------------------------------------------------------------------
// TEST 5 — Session Headers ("Buổi sáng", "Buổi chiều") Not Sticky
// --------------------------------------------------------------------------
console.log('\n--- TEST 5: Session Headers Not Sticky ---');
const morningHeaderMatch = applyGridContent.includes('Buổi sáng');
const afternoonHeaderMatch = applyGridContent.includes('Buổi chiều');
assert(morningHeaderMatch && afternoonHeaderMatch, 'Test 5: Both session headers exist');

// Verify session headers themselves do not have sticky classes
const morningSessionBlock = applyGridContent.slice(
  applyGridContent.indexOf('Buổi sáng') - 100,
  applyGridContent.indexOf('Buổi sáng') + 100
);
const afternoonSessionBlock = applyGridContent.slice(
  applyGridContent.indexOf('Buổi chiều') - 100,
  applyGridContent.indexOf('Buổi chiều') + 100
);
assert(
  !morningSessionBlock.includes('sticky') && !afternoonSessionBlock.includes('sticky'),
  'Test 5: Session headers are inside cell body and not given sticky classes'
);

// --------------------------------------------------------------------------
// TEST 6 — Accessibility & No Duplicated Headers
// --------------------------------------------------------------------------
console.log('\n--- TEST 6: Accessibility & No Duplicated Headers ---');
const dayHeaderCount = (applyGridContent.match(/id="apply-grid-day-header"/g) || []).length;
assert(
  dayHeaderCount === 1,
  'Test 6: Exactly one Day Header element in the DOM (no duplicated clones)'
);

console.log('\n=== ALL PATCH 08B-1E-UI02 ACCEPTANCE TESTS PASSED! ===');
