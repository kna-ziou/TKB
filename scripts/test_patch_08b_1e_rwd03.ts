/**
 * Test for PATCH 08B-1E-RWD-03 — REMOVE DUPLICATE BOTTOM HORIZONTAL SCROLLBAR
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

console.log('=== RUNNING PATCH 08B-1E-RWD-03 VERIFICATION ===\n');

const applyGridPath = path.join(process.cwd(), 'src/components/AIImageImport/ApplyGrid.tsx');
const applyGridContent = fs.readFileSync(applyGridPath, 'utf8');

// --------------------------------------------------------------------------
// TEST 1 — Bottom Scrollbar Visually Hidden on Cell Body
// --------------------------------------------------------------------------
console.log('--- TEST 1: Bottom Scrollbar Visually Hidden on Cell Body ---');
const cellBodySnippet = applyGridContent.slice(
  applyGridContent.indexOf('id="apply-grid-cell-body"') - 100,
  applyGridContent.indexOf('id="apply-grid-cell-body"') + 300
);

assert(
  cellBodySnippet.includes('[scrollbar-width:none]'),
  'Test 1: Cell body has scrollbar-width:none to hide native Firefox/standard scrollbar'
);
assert(
  cellBodySnippet.includes('[&::-webkit-scrollbar]:hidden'),
  'Test 1: Cell body has [&::-webkit-scrollbar]:hidden to hide WebKit/Blink scrollbar'
);
assert(
  cellBodySnippet.includes('[-ms-overflow-style:none]'),
  'Test 1: Cell body has [-ms-overflow-style:none] for legacy Microsoft Edge'
);

// --------------------------------------------------------------------------
// TEST 2 — Horizontal Scrolling Capability Fully Preserved
// --------------------------------------------------------------------------
console.log('\n--- TEST 2: Horizontal Scrolling Capability Preserved ---');
assert(
  cellBodySnippet.includes('overflow-x-auto rounded-b-2xl'),
  'Test 2: Cell body retains overflow-x-auto for native horizontal scrolling'
);
assert(
  cellBodySnippet.includes('onScroll={handleCellBodyScroll}'),
  'Test 2: Cell body retains onScroll handler for bidirectional synchronization'
);
assert(
  cellBodySnippet.includes('overscroll-x-contain'),
  'Test 2: Cell body retains overscroll-x-contain'
);

// --------------------------------------------------------------------------
// TEST 3 — Top Scrollbar Remains Visible & Functional
// --------------------------------------------------------------------------
console.log('\n--- TEST 3: Top Scrollbar Remains Visible & Functional ---');
const topScrollbarSnippet = applyGridContent.slice(
  applyGridContent.indexOf('id="apply-grid-top-scrollbar"') - 100,
  applyGridContent.indexOf('id="apply-grid-top-scrollbar"') + 1000
);

assert(
  topScrollbarSnippet.includes('[scrollbar-width:thin]'),
  'Test 3: Top scrollbar proxy retains visible scrollbar styling [scrollbar-width:thin]'
);
assert(
  topScrollbarSnippet.includes('[&::-webkit-scrollbar]:h-2'),
  'Test 3: Top scrollbar proxy retains visible height [&::-webkit-scrollbar]:h-2'
);
assert(
  topScrollbarSnippet.includes('onScroll={handleTopScroll}'),
  'Test 3: Top scrollbar retains onScroll={handleTopScroll}'
);
assert(
  topScrollbarSnippet.includes("display: hasOverflow ? 'block' : 'none'"),
  'Test 3: Top scrollbar is dynamically controlled by hasOverflow'
);

// --------------------------------------------------------------------------
// TEST 4 — Scoped Hiding Only (Not Applied Globally)
// --------------------------------------------------------------------------
console.log('\n--- TEST 4: Scoped Hiding Only ---');
const globalCssPath = path.join(process.cwd(), 'src/index.css');
const globalCssContent = fs.readFileSync(globalCssPath, 'utf8');
assert(
  !globalCssContent.includes('scrollbar-width: none') &&
  !globalCssContent.includes('::-webkit-scrollbar'),
  'Test 4: Scrollbar hiding is NOT applied in global index.css'
);

const modalPath = path.join(process.cwd(), 'src/components/AIImageImport/AIImageImportModal.tsx');
const modalContent = fs.readFileSync(modalPath, 'utf8');
assert(
  !modalContent.includes('[scrollbar-width:none]'),
  'Test 4: Modal dialog body vertical scrollbar is NOT hidden'
);

// --------------------------------------------------------------------------
// TEST 5 — Alignment & Sync Maintained
// --------------------------------------------------------------------------
console.log('\n--- TEST 5: Alignment & Sync Maintained ---');
assert(
  applyGridContent.includes('cellBodyContainerRef.current.scrollLeft = newScrollLeft'),
  'Test 5: Top scrollbar updates cellBodyContainerRef scrollLeft'
);
assert(
  applyGridContent.includes('dayHeaderContainerRef.current.scrollLeft = newScrollLeft') ||
  applyGridContent.includes('dayHeaderContainerRef.current.scrollLeft = scrollLeft'),
  'Test 5: Day header stays in lockstep alignment'
);

console.log('\n=== ALL PATCH 08B-1E-RWD-03 VERIFICATION TESTS PASSED! ===\n');
