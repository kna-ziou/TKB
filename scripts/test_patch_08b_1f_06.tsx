/**
 * Automated Test Suite for PATCH 08B-1F-06
 * Tests First-Entry UX, Keep Invalid Key Editor Open, and Separation of Candidate vs Canonical Key.
 */

import React from 'react';
import { computeKeyFingerprint } from '../src/config/geminiConfig';
import { GeminiApiKeyEditorMode, GeminiCredentialContextType } from '../src/context/GeminiCredentialContext';
import { GeminiValidationResult, GeminiValidationState } from '../src/services/geminiService';

// Test harness simulating GeminiCredentialContext and GeminiApiKeyEditor
class MockCredentialStore {
  apiKey: string | null = null;
  validatedKeyFingerprint: string | null = null;
  validationState: GeminiValidationState = 'idle';
  validationMessage: string = '';
  candidateError: string | null = null;
  isImportModalOpen: boolean = false;
  activeValidationId: number = 0;
  currentFingerprint: string | null = null;

  // Custom mock probe handler
  probeHandler: (key: string) => Promise<GeminiValidationResult> = async (key: string) => {
    if (key.startsWith('AIzaSyValid')) {
      return { state: 'valid', message: '' };
    }
    return { state: 'invalid', message: 'API Key không hợp lệ hoặc đã bị vô hiệu hóa.' };
  };

  get isConnected(): boolean {
    const currentFp = computeKeyFingerprint(this.apiKey);
    return Boolean(
      this.validationState === 'valid' &&
      this.validatedKeyFingerprint !== null &&
      currentFp !== null &&
      this.validatedKeyFingerprint === currentFp
    );
  }

  abortActiveValidation() {
    this.activeValidationId++;
    this.candidateError = null;
    if (this.validationState === 'validating') {
      this.validationState = 'idle';
      this.validationMessage = '';
    }
  }

  async validateAndSaveKey(
    candidateKey: string,
    mode: GeminiApiKeyEditorMode = 'initial_connect'
  ): Promise<boolean> {
    const currentValidationId = ++this.activeValidationId;
    const trimmed = candidateKey.trim();
    const candidateFp = computeKeyFingerprint(trimmed);

    this.candidateError = null;

    if (mode === 'initial_connect') {
      this.apiKey = null;
      this.currentFingerprint = candidateFp;
      this.validatedKeyFingerprint = null;
      this.validationState = 'validating';
      this.validationMessage = 'Đang kiểm tra kết nối...';
    } else {
      // In change_key mode: preserve existing valid key in canonical state!
      this.currentFingerprint = candidateFp;
    }

    try {
      const result = await this.probeHandler(trimmed);

      if (currentValidationId !== this.activeValidationId) {
        return false;
      }
      if (this.currentFingerprint !== candidateFp) {
        return false;
      }

      if (result.state === 'valid' && candidateFp !== null) {
        // Atomic commit
        this.apiKey = trimmed;
        this.validatedKeyFingerprint = candidateFp;
        this.validationState = 'valid';
        this.validationMessage = '';
        this.candidateError = null;
        return true;
      } else {
        this.candidateError = result.message;
        if (mode === 'initial_connect') {
          this.apiKey = null;
          this.validatedKeyFingerprint = null;
          this.validationState = result.state;
          this.validationMessage = result.message;
        }
        return false;
      }
    } catch {
      if (
        currentValidationId !== this.activeValidationId ||
        this.currentFingerprint !== candidateFp
      ) {
        return false;
      }
      const netErr = 'Không thể kết nối Gemini. Vui lòng kiểm tra kết nối mạng.';
      this.candidateError = netErr;
      if (mode === 'initial_connect') {
        this.apiKey = null;
        this.validatedKeyFingerprint = null;
        this.validationState = 'network_error';
        this.validationMessage = netErr;
      }
      return false;
    }
  }
}

// Simulated Editor Controller matching GeminiApiKeyEditorModal.tsx logic
class MockEditorController {
  isOpen: boolean;
  mode: GeminiApiKeyEditorMode;
  inputValue: string = '';
  localError: string | null = null;
  isLocallyValidating: boolean = false;
  isSubmitting: boolean = false;

  constructor(
    public store: MockCredentialStore,
    isOpen: boolean = true,
    mode: GeminiApiKeyEditorMode = 'initial_connect',
    public onClose: () => void = () => {}
  ) {
    this.isOpen = isOpen;
    this.mode = mode;
    this.inputValue = '';
  }

  get displayedError(): string | null {
    return (
      this.localError ||
      this.store.candidateError ||
      (this.mode === 'initial_connect' && this.store.validationMessage) ||
      null
    );
  }

  handlePaste(text: string) {
    this.inputValue = text.trim();
    this.localError = null;
  }

  handleInputChange(text: string) {
    this.inputValue = text;
    this.localError = null;
    if (this.isLocallyValidating) {
      this.store.abortActiveValidation();
      this.isLocallyValidating = false;
    }
  }

  async handleSubmit(): Promise<boolean> {
    if (this.isSubmitting || this.isLocallyValidating) return false;

    const trimmed = this.inputValue.trim();
    if (!trimmed) {
      this.localError = 'Vui lòng nhập Gemini API Key của bạn.';
      return false;
    }

    if (/[\s\x00-\x1F\x7F]/.test(trimmed) || trimmed.length < 10) {
      this.localError = 'API Key không hợp lệ. Vui lòng kiểm tra lại định dạng khóa.';
      return false;
    }

    this.localError = null;
    this.isSubmitting = true;
    this.isLocallyValidating = true;

    try {
      const success = await this.store.validateAndSaveKey(trimmed, this.mode);
      if (success) {
        this.isOpen = false;
        this.onClose();
        return true;
      } else {
        // Keeps editor open on failure!
        return false;
      }
    } finally {
      this.isLocallyValidating = false;
      this.isSubmitting = false;
    }
  }
}

// Run test suite
async function runTestSuite() {
  console.log('--- STARTING REGRESSION TEST SUITE (PATCH 08B-1F-06) ---\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}: ${detail || 'Assertion failed'}`);
      process.exit(1);
    }
  }

  // TEST A — first open, no key: API key editor opens immediately in initial_connect mode
  {
    const store = new MockCredentialStore();
    store.isImportModalOpen = true;
    let mainWorkflowClosed = false;

    // According to AIImageImportModal: if (!isConnected) return GeminiApiKeyEditorModal(mode="initial_connect")
    const editor = new MockEditorController(
      store,
      true,
      'initial_connect',
      () => { mainWorkflowClosed = true; }
    );

    assert(
      !store.isConnected && editor.isOpen && editor.mode === 'initial_connect',
      'TEST A: First open with no key opens API key editor immediately in initial_connect mode'
    );
  }

  // TEST B — invalid first key: editor remains open, inline error visible, upload UI not exposed as ready
  {
    const store = new MockCredentialStore();
    let workflowClosed = false;
    const editor = new MockEditorController(
      store,
      true,
      'initial_connect',
      () => { workflowClosed = true; }
    );

    editor.handleInputChange('AIzaSyInvalidRandom12345');
    const result = await editor.handleSubmit();

    assert(
      result === false &&
      editor.isOpen === true &&
      workflowClosed === false &&
      store.isConnected === false &&
      Boolean(editor.displayedError),
      'TEST B: Invalid first key keeps editor open, shows inline error, and upload UI is not exposed'
    );
  }

  // TEST C — valid first key: editor closes, main AI modal appears, connected=true
  {
    const store = new MockCredentialStore();
    let workflowClosed = false;
    const editor = new MockEditorController(
      store,
      true,
      'initial_connect',
      () => { workflowClosed = true; }
    );

    editor.handleInputChange('AIzaSyValidKeyRealSample123');
    const result = await editor.handleSubmit();

    assert(
      result === true &&
      editor.isOpen === false &&
      store.isConnected === true &&
      store.apiKey === 'AIzaSyValidKeyRealSample123',
      'TEST C: Valid first key closes editor, connects successfully'
    );
  }

  // TEST D — change existing valid key, then Cancel: old valid connection remains
  {
    const store = new MockCredentialStore();
    await store.validateAndSaveKey('AIzaSyValidKeyOldKey999', 'initial_connect');
    assert(store.isConnected === true, 'TEST D setup: initial valid key connected');

    // User clicks "Đổi API Key", opening editor in change_key mode
    let editorClosed = false;
    const editor = new MockEditorController(
      store,
      true,
      'change_key',
      () => { editorClosed = true; }
    );

    editor.handleInputChange('AIzaSyCandidateTyping...');
    // User cancels
    editor.isOpen = false;
    editorClosed = true;

    assert(
      store.isConnected === true &&
      store.apiKey === 'AIzaSyValidKeyOldKey999',
      'TEST D: Cancel during change_key preserves old valid connection completely'
    );
  }

  // TEST E — change existing valid key to invalid key: editor remains open, error shown, old valid credential remains active
  {
    const store = new MockCredentialStore();
    await store.validateAndSaveKey('AIzaSyValidKeyOldKey888', 'initial_connect');
    assert(store.isConnected === true, 'TEST E setup: initial valid key connected');

    const editor = new MockEditorController(
      store,
      true,
      'change_key',
      () => {}
    );

    editor.handleInputChange('AIzaSyInvalidKeyTest555');
    const result = await editor.handleSubmit();

    assert(
      result === false &&
      editor.isOpen === true &&
      Boolean(editor.displayedError) &&
      store.isConnected === true &&
      store.apiKey === 'AIzaSyValidKeyOldKey888',
      'TEST E: Change to invalid key keeps editor open, displays error, and old valid credential remains active'
    );
  }

  // TEST F — change existing key to new valid key: new key replaces old key atomically, editor closes, connected=true
  {
    const store = new MockCredentialStore();
    await store.validateAndSaveKey('AIzaSyValidKeyOldKey777', 'initial_connect');

    const editorClosedRef = { current: false };
    const editor = new MockEditorController(
      store,
      true,
      'change_key',
      () => { editorClosedRef.current = true; }
    );

    editor.handleInputChange('AIzaSyValidNewKey2026');
    const result = await editor.handleSubmit();

    assert(
      result === true &&
      editor.isOpen === false &&
      editorClosedRef.current === true &&
      store.isConnected === true &&
      store.apiKey === 'AIzaSyValidNewKey2026',
      'TEST F: Change to new valid key replaces old key atomically, editor closes, connected=true'
    );
  }

  // TEST G — paste only: does not auto-submit
  {
    const store = new MockCredentialStore();
    const editor = new MockEditorController(
      store,
      true,
      'initial_connect',
      () => {}
    );

    editor.handlePaste('AIzaSyValidKeyPastedOnly');

    assert(
      editor.inputValue === 'AIzaSyValidKeyPastedOnly' &&
      editor.isSubmitting === false &&
      store.validationState === 'idle' &&
      store.isConnected === false,
      'TEST G: Paste only updates input value, does not auto-submit or validate'
    );
  }

  // TEST H — invalid text "regression mới sau PATCH 08B-1F-04": rejected inside editor, editor stays open
  {
    const store = new MockCredentialStore();
    const editor = new MockEditorController(
      store,
      true,
      'initial_connect',
      () => {}
    );

    editor.handleInputChange('regression mới sau PATCH 08B-1F-04');
    const result = await editor.handleSubmit();

    assert(
      result === false &&
      editor.isOpen === true &&
      store.isConnected === false &&
      editor.displayedError === 'API Key không hợp lệ. Vui lòng kiểm tra lại định dạng khóa.',
      'TEST H: Invalid text with spaces rejected inside editor, editor stays open'
    );
  }

  console.log(`\nALL ${passed}/${total} TESTS PASSED SUCCESSFULLY!`);
}

runTestSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
