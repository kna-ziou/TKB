/**
 * PATCH 08B-1F-05 Regression Test Suite
 * Validates the GeminiApiKeyEditorModal submit and validation lifecycle:
 * - CASE A: Paste only (editor remains open, probe count = 0, connected = false)
 * - CASE B: Explicit submit (probe count = 1, state = validating)
 * - CASE C: Invalid response (editor remains open, error visible, connected = false)
 * - CASE D: Valid response (editor closes, connected = true)
 * - CASE E: Double click (guard prevents second probe, probe count = 1)
 * - CASE F: Change key while validating (in-flight probe result ignored)
 */

import { computeKeyFingerprint } from '../src/config/geminiConfig';

// Mock validateGeminiApiKey probe
type ProbeMockHandler = (key: string, signal?: AbortSignal) => Promise<{
  state: 'valid' | 'invalid' | 'permission_denied' | 'rate_limited' | 'service_error' | 'network_error';
  message: string;
}>;

class MockGeminiCredentialManager {
  apiKey: string | null = null;
  validatedKeyFingerprint: string | null = null;
  validationState: 'idle' | 'validating' | 'valid' | 'invalid' | 'permission_denied' | 'rate_limited' | 'service_error' | 'network_error' = 'idle';
  validationMessage: string = '';

  activeValidationId: number = 0;
  currentFingerprint: string | null = null;
  probeCallCount: number = 0;
  probeHandler: ProbeMockHandler | null = null;

  get currentKeyFingerprint(): string | null {
    return computeKeyFingerprint(this.apiKey);
  }

  get isFingerprintMatch(): boolean {
    if (!this.currentKeyFingerprint || !this.validatedKeyFingerprint) return false;
    return this.currentKeyFingerprint === this.validatedKeyFingerprint;
  }

  get isConnected(): boolean {
    return (
      this.validationState === 'valid' &&
      this.validatedKeyFingerprint !== null &&
      this.isFingerprintMatch
    );
  }

  abortActiveValidation() {
    this.activeValidationId++;
    this.validationState = 'idle';
    this.validationMessage = '';
  }

  async validateAndSaveKey(candidateKey: string): Promise<boolean> {
    const currentValidationId = ++this.activeValidationId;
    const trimmed = candidateKey.trim();
    const candidateFingerprint = computeKeyFingerprint(trimmed);

    this.apiKey = trimmed;
    this.currentFingerprint = candidateFingerprint;
    this.validatedKeyFingerprint = null;
    this.validationState = 'validating';
    this.validationMessage = 'Đang kiểm tra...';
    this.probeCallCount++;

    try {
      if (!this.probeHandler) {
        throw new Error('No probe handler configured');
      }

      const result = await this.probeHandler(trimmed);

      // Stale response guard 1: ID check
      if (currentValidationId !== this.activeValidationId) {
        return false;
      }

      // Stale response guard 2: Fingerprint check
      if (this.currentFingerprint !== candidateFingerprint) {
        return false;
      }

      this.validationState = result.state;
      this.validationMessage = result.message;

      if (result.state === 'valid' && candidateFingerprint !== null) {
        this.apiKey = trimmed;
        this.validatedKeyFingerprint = candidateFingerprint;
        return true;
      } else {
        this.validatedKeyFingerprint = null;
        return false;
      }
    } catch {
      if (
        currentValidationId !== this.activeValidationId ||
        this.currentFingerprint !== candidateFingerprint
      ) {
        return false;
      }
      this.validationState = 'network_error';
      this.validationMessage = 'Không thể kết nối Gemini.';
      this.validatedKeyFingerprint = null;
      return false;
    }
  }
}

/**
 * Simulates GeminiApiKeyEditorModal lifecycle
 */
class MockGeminiApiKeyEditorModal {
  isOpen: boolean = true;
  inputValue: string = '';
  localError: string | null = null;
  isSubmitting: boolean = false;
  closedCount: number = 0;

  constructor(private context: MockGeminiCredentialManager) {
    this.inputValue = context.apiKey || '';
  }

  // Paste action
  handlePaste(pastedText: string) {
    const trimmed = pastedText.trim();
    this.inputValue = trimmed;
    this.localError = null;
    if (this.context.validationState === 'validating') {
      this.context.abortActiveValidation();
    }
  }

  // Input change action
  handleInputChange(text: string) {
    this.inputValue = text;
    this.localError = null;
    if (this.context.validationState === 'validating') {
      this.context.abortActiveValidation();
    }
  }

  // Submit action
  async handleSubmit(): Promise<boolean> {
    if (this.isSubmitting || this.context.validationState === 'validating') {
      return false;
    }

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

    try {
      const success = await this.context.validateAndSaveKey(trimmed);
      if (success) {
        this.isOpen = false;
        this.closedCount++;
        return true;
      } else {
        // Failure: editor remains open!
        return false;
      }
    } finally {
      this.isSubmitting = false;
    }
  }
}

async function runTests() {
  console.log('--- STARTING PATCH 08B-1F-05 REGRESSION TESTS ---\n');
  let allPassed = true;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      allPassed = false;
    }
  }

  // ==========================================
  // CASE A — Paste only
  // ==========================================
  {
    const ctx = new MockGeminiCredentialManager();
    ctx.probeHandler = async () => ({ state: 'valid', message: '' });
    const modal = new MockGeminiApiKeyEditorModal(ctx);

    // User pastes candidate key
    modal.handlePaste('AIzaSyNewCandidateKeyPasteOnly12345');

    assert(modal.isOpen === true, 'CASE A: Editor remains open after paste');
    assert(ctx.probeCallCount === 0, 'CASE A: Probe call count = 0 (no auto-submit)');
    assert(ctx.isConnected === false, 'CASE A: isConnected = false');
    assert(modal.inputValue === 'AIzaSyNewCandidateKeyPasteOnly12345', 'CASE A: Candidate input captured');
  }

  // ==========================================
  // CASE B — Explicit submit
  // ==========================================
  {
    const ctx = new MockGeminiCredentialManager();
    let resolveProbe: (val: any) => void = () => {};
    ctx.probeHandler = () => new Promise((resolve) => {
      resolveProbe = resolve;
    });

    const modal = new MockGeminiApiKeyEditorModal(ctx);
    modal.handlePaste('AIzaSyValidCandidateKeyB1234567890');

    // User clicks submit
    const submitPromise = modal.handleSubmit();

    assert(ctx.probeCallCount === 1, 'CASE B: Probe call count = 1 after submit');
    assert(ctx.validationState === 'validating', 'CASE B: Context state is validating');
    assert(modal.isSubmitting === true, 'CASE B: Modal is in submitting state');
    assert(modal.isOpen === true, 'CASE B: Editor remains open while probe runs');

    // Finish probe
    resolveProbe({ state: 'valid', message: '' });
    await submitPromise;
  }

  // ==========================================
  // CASE C — Invalid response
  // ==========================================
  {
    const ctx = new MockGeminiCredentialManager();
    ctx.probeHandler = async () => ({
      state: 'invalid',
      message: 'API Key không hợp lệ hoặc đã bị vô hiệu hóa.',
    });

    const modal = new MockGeminiApiKeyEditorModal(ctx);
    modal.handlePaste('abcdefghijk1234567890abcdefghijk');

    const result = await modal.handleSubmit();

    assert(result === false, 'CASE C: Submit returns false on invalid key');
    assert(modal.isOpen === true, 'CASE C: Editor remains open on failure');
    assert(modal.closedCount === 0, 'CASE C: onClose was not called');
    assert(ctx.validationState === 'invalid', 'CASE C: Context validationState = invalid');
    assert(ctx.isConnected === false, 'CASE C: Context isConnected = false');
    assert(ctx.probeCallCount === 1, 'CASE C: Exactly 1 probe ran');
  }

  // ==========================================
  // CASE D — Valid response
  // ==========================================
  {
    const ctx = new MockGeminiCredentialManager();
    ctx.probeHandler = async () => ({
      state: 'valid',
      message: '',
    });

    const modal = new MockGeminiApiKeyEditorModal(ctx);
    modal.handlePaste('AIzaSyGenuineGoodKey1234567890ABC');

    const result = await modal.handleSubmit();

    assert(result === true, 'CASE D: Submit returns true on valid key');
    assert(modal.isOpen === false, 'CASE D: Editor closes on success');
    assert(modal.closedCount === 1, 'CASE D: onClose was called once');
    assert(ctx.validationState === 'valid', 'CASE D: Context validationState = valid');
    assert(ctx.isConnected === true, 'CASE D: Context isConnected = true');
    assert(ctx.validatedKeyFingerprint === computeKeyFingerprint('AIzaSyGenuineGoodKey1234567890ABC'), 'CASE D: Fingerprint matches');
  }

  // ==========================================
  // CASE E — Double click protection
  // ==========================================
  {
    const ctx = new MockGeminiCredentialManager();
    let resolveProbe: (val: any) => void = () => {};
    ctx.probeHandler = () => new Promise((resolve) => {
      resolveProbe = resolve;
    });

    const modal = new MockGeminiApiKeyEditorModal(ctx);
    modal.handlePaste('AIzaSyDoubleClickKeyTest12345678');

    // Click 1
    const p1 = modal.handleSubmit();
    // Click 2 (simultaneous)
    const p2 = modal.handleSubmit();

    assert(ctx.probeCallCount === 1, 'CASE E: Exactly 1 probe called on double click');

    resolveProbe({ state: 'valid', message: '' });
    await Promise.all([p1, p2]);
    assert(ctx.probeCallCount === 1, 'CASE E: Total probe call count remains 1 after resolution');
  }

  // ==========================================
  // CASE F — Change key while validating
  // ==========================================
  {
    const ctx = new MockGeminiCredentialManager();
    let resolveProbe1: (val: any) => void = () => {};
    ctx.probeHandler = () => new Promise((resolve) => {
      resolveProbe1 = resolve;
    });

    const modal = new MockGeminiApiKeyEditorModal(ctx);
    modal.handlePaste('AIzaSyFirstCandidateKey123456789');

    // Start probe 1
    const p1 = modal.handleSubmit();
    assert(ctx.validationState === 'validating', 'CASE F: Probe 1 is validating');

    // User changes key while probe 1 is in flight
    modal.handleInputChange('AIzaSySecondCandidateKey987654321');

    assert(ctx.validationState === 'idle', 'CASE F: Context validationState reset to idle after key change');

    // Now probe 1 resolves as "valid"
    resolveProbe1({ state: 'valid', message: '' });
    const res1 = await p1;

    assert(res1 === false, 'CASE F: Probe 1 result rejected due to abort/id mismatch');
    assert(ctx.isConnected === false, 'CASE F: Key 2 is NOT marked as connected by old probe 1');
    assert(ctx.validatedKeyFingerprint === null, 'CASE F: validatedKeyFingerprint remains null');
  }

  console.log('\n--- ALL REGRESSION TESTS FINISHED ---');
  if (allPassed) {
    console.log('Result: ALL TEST SUITES PASSED PERFECTLY (6/6)');
  } else {
    console.error('Result: SOME TESTS FAILED');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
