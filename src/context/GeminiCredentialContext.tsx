/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { maskApiKey, computeKeyFingerprint } from '../config/geminiConfig';
import {
  GeminiValidationState,
  validateGeminiApiKey,
  isMalformedApiKey,
} from '../services/geminiService';

export type GeminiApiKeyEditorMode = 'initial_connect' | 'change_key';
export type CredentialState = 'missing' | 'ready_unverified' | 'verified' | 'auth_error';

export interface GeminiCredentialContextType {
  /** The plain API key kept strictly in RAM. Never persisted. */
  apiKey: string | null;
  /** Canonical alias for current API key */
  currentApiKey: string | null;
  /** Masked representation of the API key, e.g. ••••••••••••••••ABCD */
  maskedKey: string;
  /**
   * Safe in-memory fingerprint of the currently validated key.
   * Derived connection status ONLY holds true when fingerprint(apiKey) === validatedKeyFingerprint.
   */
  validatedKeyFingerprint: string | null;
  /** Fingerprint of current canonical API key */
  currentKeyFingerprint: string | null;
  /** Whether current key fingerprint strictly matches validated fingerprint */
  isFingerprintMatch: boolean;
  /**
   * Canonical connection status.
   * True when key is present and ready (passes local sanity check and not in auth error).
   */
  isConnected: boolean;
  /** Backward-compatible alias for isConnected */
  hasKey: boolean;
  /** Credential state model: missing, candidate_ready, auth_error */
  credentialState: CredentialState;
  /** Whether current key has been remotely confirmed via an actual successful Gemini request */
  remoteConfirmedForCurrentKey: boolean;
  /** Current connection validation state */
  validationState: GeminiValidationState;
  /** User-friendly status or error message */
  validationMessage: string;
  /** Candidate validation error message from the most recent probe/check */
  candidateError: string | null;
  /** Candidate validation error state from the most recent probe/check */
  candidateErrorState: GeminiValidationState | null;
  /** Whether the AI image import modal is currently visible */
  isImportModalOpen: boolean;
  /** Open the AI image import modal */
  openImportModal: () => void;
  /** Close the AI image import modal */
  closeImportModal: () => void;
  /** Whether the API key editor modal is currently open */
  isKeyEditorOpen: boolean;
  /** Editor mode: 'initial_connect' or 'change_key' */
  keyEditorMode: GeminiApiKeyEditorMode;
  /** Open the API key editor modal */
  openKeyEditor: (mode?: GeminiApiKeyEditorMode) => void;
  /** Close the API key editor modal */
  closeKeyEditor: () => void;
  /** Update canonical key immediately and invalidate previous validation */
  setCurrentApiKey: (newKey: string | null) => void;
  /** Validate candidate key locally and, if valid, store the API key in memory */
  validateAndSaveKey: (
    key: string,
    mode?: GeminiApiKeyEditorMode,
    externalSignal?: AbortSignal
  ) => Promise<boolean>;
  /** Abort active in-flight validation and reset validation state to idle */
  abortActiveValidation: () => void;
  /** Inform the context of in-progress key edits */
  handleKeyInputChange: (inputKey: string) => void;
  /** Clear credential from memory (e.g. "Đổi API Key") */
  clearApiKey: () => void;
  /** Confirm that the current in-memory key succeeded on a real Gemini request */
  confirmRemoteCredential: () => void;
  /** Set auth error when a real Gemini recognition request fails with 400/401/403 */
  setCredentialAuthError: (errorMessage?: string, autoOpenEditor?: boolean) => void;
}

export const GeminiCredentialContext = createContext<GeminiCredentialContextType | null>(null);

export const GeminiCredentialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pure in-memory state. Refreshing the tab or restarting completely resets this.
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [validatedKeyFingerprint, setValidatedKeyFingerprint] = useState<string | null>(null);
  const [credentialState, setCredentialState] = useState<CredentialState>('missing');
  const [remoteConfirmedForCurrentKey, setRemoteConfirmedForCurrentKey] = useState<boolean>(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [candidateErrorState, setCandidateErrorState] = useState<GeminiValidationState | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isKeyEditorOpen, setIsKeyEditorOpen] = useState<boolean>(false);
  const [keyEditorMode, setKeyEditorMode] = useState<GeminiApiKeyEditorMode>('initial_connect');
  const activeValidationIdRef = useRef<number>(0);
  const currentFingerprintRef = useRef<string | null>(null);

  const currentKeyFingerprint = useMemo(() => {
    return computeKeyFingerprint(apiKey);
  }, [apiKey]);

  currentFingerprintRef.current = currentKeyFingerprint;

  const maskedKey = useMemo(() => {
    return apiKey ? maskApiKey(apiKey) : '';
  }, [apiKey]);

  const isFingerprintMatch = Boolean(
    currentKeyFingerprint !== null &&
    validatedKeyFingerprint !== null &&
    currentKeyFingerprint === validatedKeyFingerprint
  );

  const hasKey = Boolean(
    apiKey &&
    apiKey.trim().length >= 10 &&
    (credentialState === 'ready_unverified' || credentialState === 'verified')
  );

  const isConnected = hasKey;

  const validationState: GeminiValidationState = useMemo(() => {
    if (credentialState === 'auth_error') {
      return 'auth_error';
    }
    if (credentialState === 'verified') {
      return 'verified';
    }
    if (credentialState === 'ready_unverified') {
      return 'ready_unverified';
    }
    return 'missing';
  }, [credentialState]);

  const validationMessage = useMemo(() => {
    if (credentialState === 'auth_error') {
      return candidateError || 'API Key không hợp lệ hoặc không có quyền truy cập.';
    }
    if (credentialState === 'verified') {
      return '✓ Đã xác thực';
    }
    if (credentialState === 'ready_unverified') {
      return 'API Key đã nhập';
    }
    if (credentialState === 'missing') {
      return 'Chưa nhập API Key';
    }
    return '';
  }, [credentialState, candidateError]);

  // Temporary DEV-only diagnostics (NEVER logs key, fingerprint, or secrets)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[GeminiKey] credential state:', credentialState);
      console.log('[GeminiKey] remote confirmed:', remoteConfirmedForCurrentKey);
      console.log('[GeminiKey] connected:', isConnected);
    }
  }, [credentialState, remoteConfirmedForCurrentKey, isConnected]);

  const openImportModal = useCallback(() => {
    setIsImportModalOpen(true);
  }, []);

  const closeImportModal = useCallback(() => {
    setIsImportModalOpen(false);
  }, []);

  const openKeyEditor = useCallback((mode?: GeminiApiKeyEditorMode) => {
    setKeyEditorMode(mode || (hasKey ? 'change_key' : 'initial_connect'));
    setIsKeyEditorOpen(true);
  }, [hasKey]);

  const closeKeyEditor = useCallback(() => {
    setIsKeyEditorOpen(false);
  }, []);

  const setCurrentApiKey = useCallback((newKey: string | null) => {
    activeValidationIdRef.current++;
    const trimmed = newKey ? newKey.trim() : null;
    currentFingerprintRef.current = computeKeyFingerprint(trimmed);
    setApiKey(newKey);
    setValidatedKeyFingerprint(null);
    setRemoteConfirmedForCurrentKey(false);
    setCandidateError(null);
    setCandidateErrorState(null);
    if (trimmed && trimmed.length >= 10 && !isMalformedApiKey(trimmed)) {
      setCredentialState('ready_unverified');
    } else {
      setCredentialState('missing');
    }
  }, []);

  const abortActiveValidation = useCallback(() => {
    activeValidationIdRef.current++;
    setCandidateError(null);
    setCandidateErrorState(null);
  }, []);

  const handleKeyInputChange = useCallback((_inputKey: string) => {
    setCandidateError(null);
    setCandidateErrorState(null);
  }, []);

  /**
   * PATCH 08B-1F-13: Server-side Gemini API key verification.
   * Calls POST /api/gemini/verify-key via validateGeminiApiKey.
   * If verified: atomically commits candidate as canonical in-memory key, sets verified state.
   * If invalid: keeps candidate uncommitted, preserves current valid key (if any), displays error.
   */
  const validateAndSaveKey = useCallback(async (
    candidateKey: string,
    _mode: GeminiApiKeyEditorMode = 'initial_connect',
    externalSignal?: AbortSignal
  ): Promise<boolean> => {
    const currentValidationId = ++activeValidationIdRef.current;
    const trimmedKey = candidateKey.trim();

    setCandidateError(null);
    setCandidateErrorState(null);

    // Fast local sanity check
    if (isMalformedApiKey(trimmedKey)) {
      setCandidateError(!trimmedKey ? 'Vui lòng nhập Gemini API Key của bạn.' : 'API Key không hợp lệ.');
      setCandidateErrorState('invalid');
      return false;
    }

    setCandidateErrorState('validating');

    try {
      const validation = await validateGeminiApiKey(trimmedKey, externalSignal);

      if (activeValidationIdRef.current !== currentValidationId) {
        return false;
      }

      if (validation.state === 'verified') {
        const candidateFingerprint = computeKeyFingerprint(trimmedKey);
        setApiKey(trimmedKey);
        setValidatedKeyFingerprint(candidateFingerprint);
        setCredentialState('verified');
        setRemoteConfirmedForCurrentKey(true);
        setCandidateError(null);
        setCandidateErrorState(null);
        setIsKeyEditorOpen(false);
        return true;
      } else {
        setCandidateError(validation.message || 'API Key không hợp lệ hoặc không tồn tại.');
        setCandidateErrorState(validation.state);
        return false;
      }
    } catch {
      if (activeValidationIdRef.current === currentValidationId) {
        setCandidateError('Không thể kết nối đến máy chủ để kiểm tra API Key.');
        setCandidateErrorState('network_error');
      }
      return false;
    }
  }, []);

  const clearApiKey = useCallback(() => {
    activeValidationIdRef.current++;
    currentFingerprintRef.current = null;
    setApiKey(null);
    setValidatedKeyFingerprint(null);
    setCredentialState('missing');
    setRemoteConfirmedForCurrentKey(false);
    setCandidateError(null);
    setCandidateErrorState(null);
    setIsKeyEditorOpen(false);
  }, []);

  const confirmRemoteCredential = useCallback(() => {
    setRemoteConfirmedForCurrentKey(true);
    setCredentialState('verified');
    setCandidateError(null);
    setCandidateErrorState(null);
  }, []);

  const setCredentialAuthError = useCallback((errorMessage?: string, autoOpenEditor: boolean = true) => {
    const authMsg = errorMessage || 'API Key không hợp lệ hoặc không có quyền truy cập.';
    setCredentialState('auth_error');
    setCandidateError(authMsg);
    setCandidateErrorState('auth_error');
    setRemoteConfirmedForCurrentKey(false);
    if (autoOpenEditor) {
      setKeyEditorMode('change_key');
      setIsKeyEditorOpen(true);
    }
  }, []);

  const value = useMemo(
    () => ({
      apiKey,
      currentApiKey: apiKey,
      maskedKey,
      validatedKeyFingerprint,
      currentKeyFingerprint,
      isFingerprintMatch,
      isConnected,
      hasKey,
      credentialState,
      remoteConfirmedForCurrentKey,
      validationState,
      validationMessage,
      candidateError,
      candidateErrorState,
      isImportModalOpen,
      openImportModal,
      closeImportModal,
      isKeyEditorOpen,
      keyEditorMode,
      openKeyEditor,
      closeKeyEditor,
      setCurrentApiKey,
      validateAndSaveKey,
      abortActiveValidation,
      handleKeyInputChange,
      clearApiKey,
      confirmRemoteCredential,
      setCredentialAuthError,
    }),
    [
      apiKey,
      maskedKey,
      validatedKeyFingerprint,
      currentKeyFingerprint,
      isFingerprintMatch,
      isConnected,
      hasKey,
      credentialState,
      remoteConfirmedForCurrentKey,
      validationState,
      validationMessage,
      candidateError,
      candidateErrorState,
      isImportModalOpen,
      openImportModal,
      closeImportModal,
      isKeyEditorOpen,
      keyEditorMode,
      openKeyEditor,
      closeKeyEditor,
      setCurrentApiKey,
      validateAndSaveKey,
      abortActiveValidation,
      handleKeyInputChange,
      clearApiKey,
      confirmRemoteCredential,
      setCredentialAuthError,
    ]
  );

  return (
    <GeminiCredentialContext.Provider value={value}>
      {children}
    </GeminiCredentialContext.Provider>
  );
};

export function useGeminiCredential(): GeminiCredentialContextType {
  const context = useContext(GeminiCredentialContext);
  if (!context) {
    throw new Error('useGeminiCredential must be used within a GeminiCredentialProvider');
  }
  return context;
}
