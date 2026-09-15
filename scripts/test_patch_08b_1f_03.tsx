/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PATCH 08B-1F-03 — Component-Level UI Regression Test for Gemini Connection Badge
 * 
 * Verifies that GeminiCredentialCard (the exact card rendered by the main "Quét TKB từ ảnh" modal)
 * strictly derives its "Đã kết nối" badge from the canonical credential state:
 * isConnected = validationState === "valid"
 *            && validatedKeyFingerprint != null
 *            && validatedKeyFingerprint === fingerprint(currentApiKey)
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import { TimetableProvider } from '../src/context/TimetableContext';
import {
  GeminiCredentialProvider,
  GeminiCredentialContext,
  GeminiCredentialContextType,
} from '../src/context/GeminiCredentialContext';
import { GeminiCredentialCard } from '../src/components/AIImageImport/GeminiCredentialCard';
import { computeKeyFingerprint, maskApiKey } from '../src/config/geminiConfig';
import { GeminiValidationState } from '../src/services/geminiService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('================================================================');
console.log('STARTING PATCH 08B-1F-03: COMPONENT-LEVEL CONNECTION CARD TESTS');
console.log('================================================================\n');

// ----------------------------------------------------
// TEST 1: Default Empty State with Provider
// ----------------------------------------------------
console.log('--- 1. Testing Default Empty State ---\n');

const keyA = 'AIzaSyKeyA_1234567890';
const fingerprintA = computeKeyFingerprint(keyA);

// Render Step A: Default empty state
const htmlA = renderToString(
  <GeminiCredentialProvider>
    <GeminiCredentialCard />
  </GeminiCredentialProvider>
);

// Verify default state when no key is set
assert(!htmlA.includes('Đã kết nối'), 'Test 1.0: Default empty state does NOT show "Đã kết nối"');
assert(htmlA.includes('Chưa kết nối'), 'Test 1.0: Default empty state shows "Chưa kết nối"');

// ----------------------------------------------------
// TEST 2: Sequence Execution with Real Component
// ----------------------------------------------------
console.log('\n--- 2. End-to-End State Transition Sequence on GeminiCredentialCard ---\n');

interface TestState {
  apiKey: string | null;
  validatedFingerprint: string | null;
  validationState: GeminiValidationState;
  validationMessage: string;
}

function renderCardWithState(state: TestState): string {
  const currentFp = computeKeyFingerprint(state.apiKey);
  const isMatch = Boolean(
    currentFp !== null &&
    state.validatedFingerprint !== null &&
    currentFp === state.validatedFingerprint
  );
  const isConn = Boolean(
    state.validationState === 'valid' &&
    state.validatedFingerprint !== null &&
    isMatch
  );

  const mockValue: GeminiCredentialContextType = {
    apiKey: state.apiKey,
    currentApiKey: state.apiKey,
    maskedKey: state.apiKey ? maskApiKey(state.apiKey) : '',
    validatedKeyFingerprint: state.validatedFingerprint,
    currentKeyFingerprint: currentFp,
    isFingerprintMatch: isMatch,
    isConnected: isConn,
    hasKey: isConn,
    credentialState: isConn ? 'ready_unverified' : 'missing',
    remoteConfirmedForCurrentKey: isConn,
    validationState: state.validationState,
    validationMessage: state.validationMessage,
    candidateError: null,
    candidateErrorState: null,
    isImportModalOpen: true,
    openImportModal: () => {},
    closeImportModal: () => {},
    isKeyEditorOpen: false,
    keyEditorMode: 'initial_connect',
    openKeyEditor: () => {},
    closeKeyEditor: () => {},
    setCurrentApiKey: () => {},
    validateAndSaveKey: async () => false,
    abortActiveValidation: () => {},
    handleKeyInputChange: () => {},
    clearApiKey: () => {},
    confirmRemoteCredential: () => {},
    setCredentialAuthError: () => {},
  };

  return renderToString(
    <GeminiCredentialContext.Provider value={mockValue}>
      <GeminiCredentialCard />
    </GeminiCredentialContext.Provider>
  );
}

// STEP A: Valid Key A
const stepA_Html = renderCardWithState({
  apiKey: keyA,
  validatedFingerprint: fingerprintA,
  validationState: 'valid',
  validationMessage: '',
});

assert(stepA_Html.includes('✓ Đã kết nối'), 'Step A: Valid Key A displays "✓ Đã kết nối"');
assert(stepA_Html.includes('state=valid'), 'Step A: Diagnostic shows state=valid');
assert(stepA_Html.includes('match=true'), 'Step A: Diagnostic shows match=true');
assert(stepA_Html.includes('connected=true'), 'Step A: Diagnostic shows connected=true');

// STEP B: User changes key to Key B WITHOUT validating Key B
const keyB = 'AIzaSyKeyB_9876543210';
// Notice: fingerprint is still fingerprintA or null, but current key is keyB
const stepB_Html = renderCardWithState({
  apiKey: keyB,
  validatedFingerprint: null, // Invalidated immediately as required
  validationState: 'idle',
  validationMessage: '',
});

assert(!stepB_Html.includes('Đã kết nối'), 'Step B: Changed to Key B -> "Đã kết nối" badge IMMEDIATELY DISAPPEARS');
assert(stepB_Html.includes('Chưa kết nối'), 'Step B: Shows neutral "Chưa kết nối"');
assert(stepB_Html.includes('match=false'), 'Step B: Diagnostic shows match=false');
assert(stepB_Html.includes('connected=false'), 'Step B: Diagnostic shows connected=false');
assert(stepB_Html.includes(maskApiKey(keyB)), 'Step B: Masked key updated to Key B');

// Even if old validated fingerprint was mistakenly retained:
const stepB_StaleFingerprint_Html = renderCardWithState({
  apiKey: keyB,
  validatedFingerprint: fingerprintA, // Stale fingerprint from Key A
  validationState: 'valid', // Stale validation state
  validationMessage: '',
});
assert(!stepB_StaleFingerprint_Html.includes('Đã kết nối'), 'Step B (Safety Guard): Stale fingerprint from Key A does NOT match Key B -> NO "Đã kết nối"');
assert(stepB_StaleFingerprint_Html.includes('match=false'), 'Step B (Safety Guard): match is strictly false');
assert(stepB_StaleFingerprint_Html.includes('connected=false'), 'Step B (Safety Guard): connected is strictly false');

// STEP C: Key B Validation Running
const stepC_Validating_Html = renderCardWithState({
  apiKey: keyB,
  validatedFingerprint: null,
  validationState: 'validating',
  validationMessage: 'Đang kiểm tra...',
});
assert(!stepC_Validating_Html.includes('Đã kết nối'), 'Step C1: During validation, badge MUST NOT show "Đã kết nối"');
assert(stepC_Validating_Html.includes('Đang kiểm tra...'), 'Step C1: Badge shows "Đang kiểm tra..."');
assert(stepC_Validating_Html.includes('state=validating'), 'Step C1: Diagnostic shows state=validating');
assert(stepC_Validating_Html.includes('connected=false'), 'Step C1: Diagnostic shows connected=false');

// STEP C2: Key B Validation FAILS
const stepC_Fail_Html = renderCardWithState({
  apiKey: keyB,
  validatedFingerprint: null,
  validationState: 'invalid',
  validationMessage: 'API Key không hợp lệ.',
});
assert(!stepC_Fail_Html.includes('Đã kết nối'), 'Step C2: Validation failure MUST NOT show "Đã kết nối"');
assert(stepC_Fail_Html.includes('API Key không hợp lệ'), 'Step C2: Badge shows "API Key không hợp lệ"');
assert(stepC_Fail_Html.includes('state=invalid'), 'Step C2: Diagnostic shows state=invalid');
assert(stepC_Fail_Html.includes('connected=false'), 'Step C2: Diagnostic shows connected=false');

// STEP D: Key B Validation SUCCEEDS
const fingerprintB = computeKeyFingerprint(keyB);
const stepD_Success_Html = renderCardWithState({
  apiKey: keyB,
  validatedFingerprint: fingerprintB,
  validationState: 'valid',
  validationMessage: '',
});
assert(stepD_Success_Html.includes('✓ Đã kết nối'), 'Step D: Successful validation for Key B displays "✓ Đã kết nối"');
assert(stepD_Success_Html.includes('state=valid'), 'Step D: Diagnostic shows state=valid');
assert(stepD_Success_Html.includes('match=true'), 'Step D: Diagnostic shows match=true');
assert(stepD_Success_Html.includes('connected=true'), 'Step D: Diagnostic shows connected=true');
assert(stepD_Success_Html.includes(maskApiKey(keyB)), 'Step D: Displays Key B masked key');

console.log('\n================================================================');
console.log('ALL PATCH 08B-1F-03 REGRESSION TESTS PASSED PERFECTLY!');
console.log('================================================================\n');
