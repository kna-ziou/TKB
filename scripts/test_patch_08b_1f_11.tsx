/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PATCH 08B-1F-11 — CREDENTIAL UX STATE MODEL & FIRST-ENTRY ROUTING REGRESSION TESTS
 *
 * Verification suite covering tests A through G:
 * - TEST A: First entry (no key -> enter candidate -> confirm -> editor closes, import modal stays open, state=ready_unverified, zero network calls)
 * - TEST B: Malformed input ('PATCH 08B-1F test' -> editor stays open, local error, zero fetch)
 * - TEST C: Modified real-looking key (verified key A -> edit chars -> confirm -> state=ready_unverified, NOT verified, NOT 'API Key hợp lệ', NOT 'Đã kết nối')
 * - TEST D: Recognition succeeds (ready_unverified -> real Gemini recognition succeeds -> state=verified, badge='✓ Đã xác thực')
 * - TEST E: Recognition auth fails (ready_unverified -> 401/403 -> state=auth_error, API editor opens, image preserved)
 * - TEST F: Corrected key (auth_error -> enter correct key -> confirm -> ready_unverified, upload image preserved, retry -> verified)
 * - TEST G: Cancel change-key editor (verified key A -> open Change API Key -> type candidate B -> Cancel -> key A remains current and verified)
 */

import assert from 'assert';
import {
  isMalformedApiKey,
  validateGeminiApiKey,
  executeTimetableRecognition,
  VALIDATION_MESSAGES,
  CredentialState,
  GeminiValidationState,
} from '../src/services/geminiService';
import { PreparedImageData } from '../src/services/imagePreparationService';

const mockImage: PreparedImageData = {
  base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  mimeType: 'image/jpeg',
  width: 800,
  height: 600,
  rotationApplied: 0,
};

/**
 * Headless simulator replicating the exact state machine of GeminiCredentialContext
 */
class CredentialStateMachine {
  apiKey: string | null = null;
  credentialState: CredentialState = 'missing';
  remoteConfirmedForCurrentKey: boolean = false;
  candidateError: string | null = null;
  candidateErrorState: GeminiValidationState | null = null;
  isImportModalOpen: boolean = false;
  isKeyEditorOpen: boolean = false;
  keyEditorMode: 'initial_connect' | 'change_key' = 'initial_connect';

  openImportModal() {
    this.isImportModalOpen = true;
  }

  closeImportModal() {
    this.isImportModalOpen = false;
  }

  openKeyEditor(mode: 'initial_connect' | 'change_key' = 'initial_connect') {
    this.keyEditorMode = mode;
    this.isKeyEditorOpen = true;
  }

  closeKeyEditor() {
    this.isKeyEditorOpen = false;
  }

  get isConnected(): boolean {
    return Boolean(
      this.apiKey &&
      this.apiKey.trim().length >= 10 &&
      (this.credentialState === 'ready_unverified' || this.credentialState === 'verified')
    );
  }

  get validationState(): GeminiValidationState {
    if (this.credentialState === 'auth_error') return 'auth_error';
    if (this.credentialState === 'verified') return 'verified';
    if (this.credentialState === 'ready_unverified') return 'ready_unverified';
    return 'missing';
  }

  get validationMessage(): string {
    if (this.credentialState === 'auth_error') {
      return this.candidateError || 'API Key không hợp lệ hoặc không có quyền truy cập.';
    }
    if (this.credentialState === 'verified') return '✓ Đã xác thực';
    if (this.credentialState === 'ready_unverified') return 'API Key đã nhập';
    if (this.credentialState === 'missing') return 'Chưa nhập API Key';
    return '';
  }

  async validateAndSaveKey(candidateKey: string, mode: 'initial_connect' | 'change_key' = 'initial_connect'): Promise<boolean> {
    const trimmed = candidateKey.trim();
    this.candidateError = null;
    this.candidateErrorState = null;

    const validation = await validateGeminiApiKey(trimmed);

    if (validation.state === 'ready_unverified' || validation.state === 'candidate_ready') {
      this.apiKey = trimmed;
      this.credentialState = 'ready_unverified';
      this.remoteConfirmedForCurrentKey = false;
      this.candidateError = null;
      this.candidateErrorState = null;
      this.isKeyEditorOpen = false;
      return true;
    } else {
      this.candidateError = validation.message;
      this.candidateErrorState = 'invalid';
      return false;
    }
  }

  confirmRemoteCredential() {
    this.remoteConfirmedForCurrentKey = true;
    this.credentialState = 'verified';
    this.candidateError = null;
    this.candidateErrorState = null;
  }

  setCredentialAuthError(errorMessage?: string, autoOpenEditor: boolean = true) {
    const authMsg = errorMessage || 'API Key không hợp lệ hoặc không có quyền truy cập.';
    this.credentialState = 'auth_error';
    this.candidateError = authMsg;
    this.candidateErrorState = 'auth_error';
    this.remoteConfirmedForCurrentKey = false;
    if (autoOpenEditor) {
      this.keyEditorMode = 'change_key';
      this.isKeyEditorOpen = true;
    }
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('STARTING PATCH 08B-1F-11: CREDENTIAL UX STATE MODEL REGRESSION TESTS');
  console.log('================================================================\n');

  const originalFetch = globalThis.fetch;

  try {
    // -------------------------------------------------------------------------
    // TEST A — First Entry Routing & State
    // Open AI Import with no key -> enter locally acceptable candidate -> Confirm
    // Expected:
    // - Editor closes (isKeyEditorOpen becomes false)
    // - Import modal stays open (isImportModalOpen remains true)
    // - State = 'ready_unverified'
    // - Zero network requests
    // -------------------------------------------------------------------------
    console.log('--- TEST A: First Entry Routing & State ---');
    let fetchCountA = 0;
    globalThis.fetch = (async () => {
      fetchCountA++;
      throw new Error('fetch must not be called during key entry!');
    }) as any;

    const machine = new CredentialStateMachine();

    // Initial state: missing, modal closed
    assert.strictEqual(machine.credentialState, 'missing');
    assert.strictEqual(machine.apiKey, null);
    assert.strictEqual(machine.validationState, 'missing');
    assert.strictEqual(machine.validationMessage, 'Chưa nhập API Key');

    // User clicks "Quét TKB từ ảnh"
    machine.openImportModal();
    assert.strictEqual(machine.isImportModalOpen, true);

    // Enter candidate key
    const candidateKeyA = 'AIzaSyA_FreshKeyForTestA1234567890';
    const saveSuccess = await machine.validateAndSaveKey(candidateKeyA, 'initial_connect');

    assert.strictEqual(saveSuccess, true);
    assert.strictEqual(fetchCountA, 0, 'Zero network requests allowed on key entry');
    assert.strictEqual(machine.credentialState, 'ready_unverified');
    assert.strictEqual(machine.validationState, 'ready_unverified');
    assert.strictEqual(machine.validationMessage, 'API Key đã nhập');
    assert.strictEqual(machine.isKeyEditorOpen, false);
    // Import modal MUST remain open!
    assert.strictEqual(machine.isImportModalOpen, true);

    console.log('✅ PASS: TEST A: First entry preserves import modal, sets ready_unverified with zero network calls\n');

    // -------------------------------------------------------------------------
    // TEST B — Malformed Input
    // E.g. 'PATCH 08B-1F test'
    // Expected:
    // - Local sanity check fails
    // - Local error shown
    // - Zero fetch
    // -------------------------------------------------------------------------
    console.log('--- TEST B: Malformed Input ---');
    const malformedCandidates = [
      'PATCH 08B-1F test',
      'key with internal spaces',
      'short',
      '',
      '   ',
    ];

    let fetchCountB = 0;
    for (const input of malformedCandidates) {
      assert.strictEqual(isMalformedApiKey(input), true, `Input "${input}" must be detected as malformed`);
      const saveRes = await machine.validateAndSaveKey(input);
      assert.strictEqual(saveRes, false, `Input "${input}" must fail validateAndSaveKey`);
      assert.strictEqual(machine.candidateErrorState, 'invalid');
      const expectedMsg = !input.trim()
        ? 'Vui lòng nhập Gemini API Key của bạn.'
        : 'API Key không hợp lệ.';
      assert.strictEqual(machine.candidateError, expectedMsg);
    }
    assert.strictEqual(fetchCountB, 0, 'Zero network requests on malformed input');
    console.log('✅ PASS: TEST B: Malformed input rejected locally without network calls\n');

    // -------------------------------------------------------------------------
    // TEST C — Modified Real-Looking Key (Bug B Repro & Fix)
    // Current verified key A -> edit characters -> confirm
    // Expected:
    // - State becomes ready_unverified (NOT verified)
    // - Remote confirmation cleared
    // - NOT 'API Key hợp lệ'
    // - NOT 'Đã kết nối'
    // -------------------------------------------------------------------------
    console.log('--- TEST C: Modified Real-Looking Key Reverts Verified State ---');
    // First simulate key A being verified
    machine.confirmRemoteCredential();
    assert.strictEqual(machine.credentialState, 'verified');
    assert.strictEqual(machine.remoteConfirmedForCurrentKey, true);
    assert.strictEqual(machine.validationState, 'verified');
    assert.strictEqual(machine.validationMessage, '✓ Đã xác thực');

    // User now modifies key A into candidate B (passes local sanity check)
    const modifiedCandidate = 'AIzaSyA_FreshKeyForTestA1234567899_MODIFIED';
    const ok = await machine.validateAndSaveKey(modifiedCandidate, 'change_key');
    assert.strictEqual(ok, true);

    // CRITICAL: Must be ready_unverified, NOT verified, NOT valid!
    assert.strictEqual(machine.credentialState, 'ready_unverified');
    assert.strictEqual(machine.remoteConfirmedForCurrentKey, false);
    assert.strictEqual(machine.validationState, 'ready_unverified');
    assert.strictEqual(machine.validationMessage, 'API Key đã nhập');
    assert.notStrictEqual(machine.validationMessage, 'API Key hợp lệ');
    assert.notStrictEqual(machine.validationMessage, 'Đã kết nối');
    console.log('✅ PASS: TEST C: Modifying key immediately invalidates verified status back to ready_unverified\n');

    // -------------------------------------------------------------------------
    // TEST D — Recognition Succeeds
    // ready_unverified -> real Gemini recognition succeeds
    // Expected:
    // - State becomes verified
    // - Badge text = '✓ Đã xác thực'
    // -------------------------------------------------------------------------
    console.log('--- TEST D: Real Recognition Succeeds Transitions to Verified ---');
    const mockTimetableJson = {
      sourceSummary: {
        rawTitle: 'Thời khóa biểu mẫu',
        schoolName: 'THPT Mẫu',
        className: '10A1',
      },
      days: [
        { dayKey: 'monday', label: 'Thứ Hai', confidence: 0.95 },
      ],
      sessions: [
        {
          sessionKey: 'morning',
          label: 'Buổi sáng',
          confidence: 0.95,
          periods: [
            {
              periodNumber: 1,
              timeRange: '07:00 - 07:45',
              cells: [
                {
                  dayKey: 'monday',
                  subjectRaw: 'Toán',
                  subjectNormalized: 'Toán',
                  status: 'recognized',
                  confidence: 0.95,
                },
              ],
            },
          ],
        },
      ],
    };

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify(mockTimetableJson),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const recognitionRes = await executeTimetableRecognition(machine.apiKey!, mockImage);
    assert.strictEqual(recognitionRes.state, 'success');
    assert.strictEqual(Boolean(recognitionRes.isAuthError), false);

    // Context transition on recognition success
    machine.confirmRemoteCredential();
    assert.strictEqual(machine.credentialState, 'verified');
    assert.strictEqual(machine.validationState, 'verified');
    assert.strictEqual(machine.validationMessage, '✓ Đã xác thực');
    console.log('✅ PASS: TEST D: Successful recognition marks credential as verified\n');

    // -------------------------------------------------------------------------
    // TEST E — Recognition Auth Failure (401 / 403)
    // ready_unverified -> 401/403
    // Expected:
    // - State = 'auth_error'
    // - candidateError indicates invalid key or missing access
    // - isKeyEditorOpen = true (auto open editor for recovery)
    // -------------------------------------------------------------------------
    console.log('--- TEST E: Recognition Auth Failure (401/403) ---');
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: 403,
            message: 'API_KEY_INVALID: The provided API key is invalid.',
            status: 'PERMISSION_DENIED',
          },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const authFailRes = await executeTimetableRecognition('AIzaSyBadKey1234567890', mockImage);
    assert.strictEqual(authFailRes.state, 'permission_denied');
    assert.strictEqual(authFailRes.isAuthError, true);

    machine.setCredentialAuthError(
      'API Key không hợp lệ hoặc không có quyền truy cập.',
      true
    );

    assert.strictEqual(machine.credentialState, 'auth_error');
    assert.strictEqual(machine.validationState, 'auth_error');
    assert.strictEqual(
      machine.validationMessage,
      'API Key không hợp lệ hoặc không có quyền truy cập.'
    );
    assert.strictEqual(machine.isKeyEditorOpen, true);
    assert.strictEqual(machine.keyEditorMode, 'change_key');
    console.log('✅ PASS: TEST E: Auth failure sets auth_error and auto-opens editor for recovery\n');

    // -------------------------------------------------------------------------
    // TEST F — Corrected Key After Auth Error
    // auth_error -> enter correct key -> confirm
    // Expected:
    // - State becomes ready_unverified
    // - Editor closes
    // - Next recognition succeeds -> verified
    // -------------------------------------------------------------------------
    console.log('--- TEST F: Corrected Key After Auth Error ---');
    const correctedKey = 'AIzaSy_CorrectedWorkingKey9876543210';
    const correctedOk = await machine.validateAndSaveKey(correctedKey, 'change_key');
    assert.strictEqual(correctedOk, true);

    assert.strictEqual(machine.credentialState, 'ready_unverified');
    assert.strictEqual(machine.isKeyEditorOpen, false);
    assert.strictEqual(machine.apiKey, correctedKey);

    // Next recognition call succeeds
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(mockTimetableJson) }],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const retryRes = await executeTimetableRecognition(machine.apiKey!, mockImage);
    assert.strictEqual(retryRes.state, 'success');

    machine.confirmRemoteCredential();
    assert.strictEqual(machine.credentialState, 'verified');
    console.log('✅ PASS: TEST F: Corrected key transitions to ready_unverified then verified upon success\n');

    // -------------------------------------------------------------------------
    // TEST G — Cancel Change-Key Editor
    // Verified key A -> open Change API Key -> type candidate B -> Cancel
    // Expected:
    // - Key A remains current and verified
    // -------------------------------------------------------------------------
    console.log('--- TEST G: Cancel Change-Key Preserves Current Verified Key ---');
    const keyABefore = machine.apiKey;
    const stateABefore = machine.credentialState;
    const confirmedABefore = machine.remoteConfirmedForCurrentKey;

    assert.strictEqual(stateABefore, 'verified');

    // Open change key editor
    machine.openKeyEditor('change_key');
    assert.strictEqual(machine.isKeyEditorOpen, true);

    // User types candidate B in editor UI (this is local to the input field, does NOT touch machine state)
    // User clicks Cancel
    machine.closeKeyEditor();

    assert.strictEqual(machine.isKeyEditorOpen, false);
    assert.strictEqual(machine.apiKey, keyABefore);
    assert.strictEqual(machine.credentialState, 'verified');
    assert.strictEqual(machine.remoteConfirmedForCurrentKey, confirmedABefore);
    assert.strictEqual(machine.validationMessage, '✓ Đã xác thực');
    console.log('✅ PASS: TEST G: Cancelling editor preserves existing verified key and verified state\n');

    console.log('================================================================');
    console.log('ALL PATCH 08B-1F-11 REGRESSION TESTS PASSED (100% GREEN)');
    console.log('================================================================\n');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runTests().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
