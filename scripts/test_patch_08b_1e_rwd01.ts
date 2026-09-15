/**
 * Test for PATCH 08B-1E-RWD-01 — REMOVE MODAL-LEVEL HORIZONTAL SCROLL AT 390PX
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

console.log('=== RUNNING PATCH 08B-1E-RWD-01 VERIFICATION ===\n');

// 1. Check AIImageImportModal.tsx
const modalPath = path.join(process.cwd(), 'src/components/AIImageImport/AIImageImportModal.tsx');
const modalContent = fs.readFileSync(modalPath, 'utf8');

console.log('--- TEST 1: Modal Shell & Dialog Hierarchy Overflow Protection ---');
assert(
  modalContent.includes('overflow-x-hidden'),
  'AIImageImportModal has overflow-x-hidden to prevent modal backdrop horizontal scroll'
);
assert(
  modalContent.includes('w-full') && modalContent.includes('max-w-full'),
  'AIImageImportModal dialog shell enforces max-w-full'
);
assert(
  modalContent.includes('min-w-0'),
  'AIImageImportModal uses min-w-0 to prevent flex item expansion beyond viewport'
);
assert(
  !modalContent.match(/id="ai-image-import-modal"[^>]*overflow-x-auto/),
  'AIImageImportModal body DOES NOT have overflow-x-auto'
);

// 2. Check ApplyPreview.tsx
const previewPath = path.join(process.cwd(), 'src/components/AIImageImport/ApplyPreview.tsx');
const previewContent = fs.readFileSync(previewPath, 'utf8');

console.log('\n--- TEST 2: ApplyPreview Workspace Width Containment ---');
assert(
  previewContent.includes('w-full max-w-full min-w-0'),
  'ApplyPreview container has w-full max-w-full min-w-0'
);
assert(
  previewContent.includes('break-words'),
  'ApplyPreview alert banners wrap text with break-words'
);

// 3. Check ApplyStatusBar.tsx
const statusBarPath = path.join(process.cwd(), 'src/components/AIImageImport/ApplyStatusBar.tsx');
const statusBarContent = fs.readFileSync(statusBarPath, 'utf8');

console.log('\n--- TEST 3: ApplyStatusBar Responsive Layout ---');
assert(
  statusBarContent.includes('w-full max-w-full min-w-0'),
  'ApplyStatusBar container has w-full max-w-full min-w-0'
);
assert(
  statusBarContent.includes('flex-wrap') || statusBarContent.includes('sm:flex-row'),
  'ApplyStatusBar uses responsive flex layout for mobile viewports'
);

// 4. Check ApplyOptionsPanel.tsx
const optionsPath = path.join(process.cwd(), 'src/components/AIImageImport/ApplyOptionsPanel.tsx');
const optionsContent = fs.readFileSync(optionsPath, 'utf8');

console.log('\n--- TEST 4: ApplyOptionsPanel Width & Mobile Cards ---');
assert(
  optionsContent.includes('w-full max-w-full min-w-0'),
  'ApplyOptionsPanel has w-full max-w-full min-w-0 containment'
);
assert(
  optionsContent.includes('block md:hidden') && optionsContent.includes('truncate'),
  'ApplyOptionsPanel includes mobile metadata cards with truncate'
);

// 5. Check ApplyGrid.tsx
const gridPath = path.join(process.cwd(), 'src/components/AIImageImport/ApplyGrid.tsx');
const gridContent = fs.readFileSync(gridPath, 'utf8');

console.log('\n--- TEST 5: ApplyGrid Isolated Horizontal Scroll Ownership ---');
assert(
  gridContent.includes('overflow-x-auto rounded-b-2xl'),
  'ApplyGrid cell body remains the sole owner of horizontal scrollbar'
);
assert(
  gridContent.includes('overflow-hidden') && gridContent.includes('apply-grid-day-header'),
  'ApplyGrid sticky day header does not display its own horizontal scrollbar'
);
assert(
  gridContent.includes('w-full max-w-full min-w-0'),
  'ApplyGrid table container is constrained with w-full max-w-full min-w-0'
);

console.log('\n=== ALL PATCH 08B-1E-RWD-01 VERIFICATION TESTS PASSED! ===');
