/**
 * Test for PATCH 08B-1E-RWD-04 — REMOVE OUTER VERTICAL SCROLL / KEEP SINGLE MODAL SCROLLER
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

console.log('=== RUNNING PATCH 08B-1E-RWD-04 VERIFICATION ===\n');

const modalPath = path.join(process.cwd(), 'src/components/AIImageImport/AIImageImportModal.tsx');
const modalContent = fs.readFileSync(modalPath, 'utf8');

// --------------------------------------------------------------------------
// TEST 1: Backdrop Root — Viewport Fixed & Overflow Hidden
// --------------------------------------------------------------------------
console.log('--- TEST 1: Backdrop Root Viewport & Overflow ---');
const backdropSnippet = modalContent.slice(
  modalContent.indexOf('id="ai-image-import-backdrop"'),
  modalContent.indexOf('id="ai-image-import-backdrop"') + 400
);

assert(
  backdropSnippet.includes('fixed inset-0'),
  'Test 1: Backdrop has fixed inset-0 viewport positioning'
);
assert(
  backdropSnippet.includes('overflow-hidden'),
  'Test 1: Backdrop has overflow-hidden (NO vertical or horizontal scrolling)'
);
assert(
  !backdropSnippet.includes('overflow-y-auto'),
  'Test 1: Backdrop DOES NOT have overflow-y-auto'
);
assert(
  backdropSnippet.includes('100dvh'),
  'Test 1: Backdrop uses 100dvh for dynamic mobile viewport height'
);

// --------------------------------------------------------------------------
// TEST 2: Modal Shell — Bounded, Flex Column & Overflow Hidden
// --------------------------------------------------------------------------
console.log('\n--- TEST 2: Modal Shell Viewport Containment ---');
const shellSnippet = modalContent.slice(
  modalContent.indexOf('id="ai-image-import-modal"'),
  modalContent.indexOf('id="ai-image-import-modal"') + 600
);

assert(
  shellSnippet.includes('flex flex-col') || shellSnippet.includes('flex-col'),
  'Test 2: Modal shell uses flex-col layout'
);
assert(
  shellSnippet.includes('overflow-hidden'),
  'Test 2: Modal shell has overflow-hidden (never creates scrollbar)'
);
assert(
  !shellSnippet.includes('overflow-y-auto'),
  'Test 2: Modal shell DOES NOT have overflow-y-auto'
);
assert(
  shellSnippet.includes('100dvh') || shellSnippet.includes('maxHeight: \'calc(100dvh'),
  'Test 2: Modal shell max-height is bounded by 100dvh'
);

// --------------------------------------------------------------------------
// TEST 3: Modal Body — The Sole Vertical Scroll Container
// --------------------------------------------------------------------------
console.log('\n--- TEST 3: Modal Body Sole Vertical Scroller ---');
const bodySnippet = modalContent.slice(
  modalContent.indexOf('id="ai-image-import-modal-body"'),
  modalContent.indexOf('id="ai-image-import-modal-body"') + 400
);

assert(
  bodySnippet.includes('overflow-y-auto'),
  'Test 3: Modal body has overflow-y-auto'
);
assert(
  bodySnippet.includes('overflow-x-hidden'),
  'Test 3: Modal body has overflow-x-hidden'
);
assert(
  bodySnippet.includes('min-h-0') || bodySnippet.includes('minHeight: 0'),
  'Test 3: Modal body specifies min-height: 0'
);
assert(
  bodySnippet.includes('flex-1') || bodySnippet.includes('flex: \'1 1 auto\''),
  'Test 3: Modal body specifies flex: 1 1 auto'
);
assert(
  bodySnippet.includes('overscroll-y-contain'),
  'Test 3: Modal body has overscroll-y-contain to prevent scroll chaining'
);

// --------------------------------------------------------------------------
// TEST 4: No Stacked / Duplicate Vertical Scrollbars in Modal Workspaces
// --------------------------------------------------------------------------
console.log('\n--- TEST 4: No Nested Vertical Scroll Containers in Workspaces ---');
const previewPath = path.join(process.cwd(), 'src/components/AIImageImport/ApplyPreview.tsx');
const previewContent = fs.readFileSync(previewPath, 'utf8');
assert(
  !previewContent.includes('overflow-y-auto') && !previewContent.includes('overflow-y-scroll'),
  'Test 4: ApplyPreview workspace does NOT have nested overflow-y-auto'
);

const statusBarPath = path.join(process.cwd(), 'src/components/AIImageImport/ApplyStatusBar.tsx');
const statusBarContent = fs.readFileSync(statusBarPath, 'utf8');
assert(
  !statusBarContent.includes('overflow-y-auto'),
  'Test 4: ApplyStatusBar does NOT have nested overflow-y-auto'
);

const gridPath = path.join(process.cwd(), 'src/components/AIImageImport/ApplyGrid.tsx');
const gridContent = fs.readFileSync(gridPath, 'utf8');
assert(
  !gridContent.includes('overflow-y-auto') && !gridContent.includes('overflow-y-scroll'),
  'Test 4: ApplyGrid does NOT have nested overflow-y-auto'
);

// --------------------------------------------------------------------------
// TEST 5: Background Body Scroll Lock
// --------------------------------------------------------------------------
console.log('\n--- TEST 5: Document Body Scroll Lock ---');
assert(
  modalContent.includes('document.body.style.overflow = \'hidden\''),
  'Test 5: Body overflow is set to hidden when modal is open'
);
assert(
  modalContent.includes('document.body.style.overflow = originalOverflow'),
  'Test 5: Original body overflow is restored on unmount/close'
);
assert(
  modalContent.includes('document.body.style.paddingRight = originalPaddingRight'),
  'Test 5: Original body padding-right is restored on unmount/close'
);

// --------------------------------------------------------------------------
// TEST 6: Horizontal Scroll Isolation Maintained
// --------------------------------------------------------------------------
console.log('\n--- TEST 6: ApplyGrid Horizontal Scrolling Isolated & Functional ---');
assert(
  gridContent.includes('id="apply-grid-top-scrollbar"'),
  'Test 6: ApplyGrid top horizontal scrollbar exists'
);
assert(
  gridContent.includes('id="apply-grid-cell-body"'),
  'Test 6: ApplyGrid cell body container exists'
);
assert(
  gridContent.includes('[scrollbar-width:none]'),
  'Test 6: Duplicate bottom horizontal scrollbar remains hidden'
);

console.log('\n=== ALL PATCH 08B-1E-RWD-04 VERIFICATION TESTS PASSED! ===\n');
