/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  TimetableImageInput,
  ImageWorkflowState,
} from '../types/aiImageImport';
import {
  RecognitionState,
  TimetableRecognitionResult,
  RecognitionSummaryCounts,
  CellStatus,
} from '../types/timetableRecognition';
import {
  ReviewMetadata,
  TimetableReviewDraft,
} from '../types/timetableReview';
import {
  createReviewDraft,
  updateReviewCell,
  confirmReviewCell,
  restoreReviewCell,
  updateReviewMetadata,
  restoreAllReview,
} from '../services/timetableReviewService';
import {
  validateTimetableImage,
  rotateLeft as calcRotateLeft,
  rotateRight as calcRotateRight,
} from '../services/imageValidationService';
import { prepareImageForGemini } from '../services/imagePreparationService';
import { executeTimetableRecognition } from '../services/geminiService';
import { calculateRecognitionSummary } from '../services/timetableRecognitionValidator';
import { useGeminiCredential } from './GeminiCredentialContext';
import { useTimetable } from './TimetableContext';
import { useToast } from './ToastContext';
import {
  ApplyCellStrategy,
  ApplyOptions,
  ApplyPlanSummary,
  CellResolutionAction,
  TimetableApplyPlan,
} from '../types/timetableApply';
import {
  applyPlanToDocumentState,
  buildTimetableApplyPlan,
  createDefaultApplyOptions,
} from '../services/timetableApplyService';

export interface AIImageImportContextType {
  /** The currently loaded and validated image input (held strictly in RAM) */
  currentImage: TimetableImageInput | null;
  /** Current image loading workflow state */
  workflowState: ImageWorkflowState;
  /** Current validation or file error message, if any */
  errorMessage: string | null;
  /** Advisory warnings (e.g. resolution recommendation) */
  warningMessage: string | null;

  /** Active recognition lifecycle state */
  recognitionState: RecognitionState;
  /** Validated structured timetable recognition result (in RAM only) */
  recognitionResult: TimetableRecognitionResult | null;
  /** Locally calculated summary counts */
  recognitionSummary: RecognitionSummaryCounts | null;
  /** User-friendly error message for recognition failures */
  recognitionError: string | null;
  /** True if user has ever initiated analysis (used for accurate privacy notice wording) */
  hasAttemptedAnalysis: boolean;
  /** True while an analysis request is in progress */
  isAnalyzing: boolean;

  /** Validate and load a new or replacement image file */
  processImageFile: (file: File) => Promise<boolean>;
  /** Rotate preview 90 degrees counter-clockwise */
  rotateLeft: () => void;
  /** Rotate preview 90 degrees clockwise */
  rotateRight: () => void;
  /** Remove currently selected image and revoke its object URL */
  removeImage: () => void;
  /** Clear active file error message */
  clearError: () => void;

  /** Trigger structured timetable extraction with Gemini */
  startRecognition: () => Promise<void>;
  /** Retry recognition using current image, rotation, and API key */
  retryRecognition: () => Promise<void>;
  /** Cancel active recognition request */
  cancelRecognition: () => void;

  /** Active view inside AI Modal: 'import' (upload/preview/result), 'review' (review & edit), or 'apply_preview' */
  activeView: 'import' | 'review' | 'apply_preview';
  /** Memory-only editable review working copy derived from recognition result */
  reviewDraft: TimetableReviewDraft | null;
  /** Open review workspace, instantiating review draft from recognition result if needed */
  openReviewWorkspace: () => void;
  /** Return to recognition summary view, preserving review edits */
  closeReviewWorkspace: () => void;
  /** Update single cell in the review draft */
  updateCell: (cellId: string, updates: { status: CellStatus; subject: string | null }) => void;
  /** Explicitly confirm a low-confidence recognized cell */
  confirmCell: (cellId: string) => void;
  /** Restore single cell to original Gemini output */
  restoreCell: (cellId: string) => void;
  /** Update metadata field in review draft */
  updateMetadataField: (field: keyof ReviewMetadata, value: string | null) => void;
  /** Restore all cells and metadata to original Gemini output */
  restoreAllReviewEdits: () => void;

  /** Calculated preview plan for applying reviewed timetable into active document */
  applyPlan: TimetableApplyPlan | null;
  /** Active apply options configuration */
  applyOptions: ApplyOptions | null;
  /** Per-cell manual override decisions */
  applyOverrides: Record<string, CellResolutionAction>;
  /** True while applying plan transaction to document */
  isApplying: boolean;
  /** Summary of successful application for completion feedback */
  appliedSuccessSummary: ApplyPlanSummary | null;
  /** Navigate from review to apply preview, building apply plan */
  openApplyPreview: () => void;
  /** Return from apply preview back to review */
  backToReviewWorkspace: () => void;
  /** Update apply options and rebuild apply plan */
  updateApplyOptions: (updates: Partial<ApplyOptions>) => void;
  /** Set per-cell override and rebuild apply plan */
  updateApplyOverride: (cellId: string, resolution: CellResolutionAction) => void;
  /** Reset all per-cell overrides back to 'auto' */
  resetApplyOverrides: () => void;
  /** Atomically apply plan into active timetable state */
  executeApplyToTimetable: () => boolean;
  /** Reset entire workflow and clear temporary state */
  resetWorkflow: () => void;
}

export const AIImageImportContext = createContext<AIImageImportContextType | null>(null);

export const AIImageImportProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    apiKey,
    hasKey,
    credentialState,
    currentKeyFingerprint,
    validatedKeyFingerprint,
    isFingerprintMatch,
    isImportModalOpen,
    confirmRemoteCredential,
    setCredentialAuthError,
  } = useGeminiCredential();
  const { state: currentTimetableState, applyTimetableImport } = useTimetable();
  const { showToast } = useToast();

  const [currentImage, setCurrentImage] = useState<TimetableImageInput | null>(null);
  const [workflowState, setWorkflowState] = useState<ImageWorkflowState>('empty');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Recognition state (strictly volatile RAM)
  const [recognitionState, setRecognitionState] = useState<RecognitionState>('idle');
  const [recognitionResult, setRecognitionResult] =
    useState<TimetableRecognitionResult | null>(null);
  const [recognitionSummary, setRecognitionSummary] =
    useState<RecognitionSummaryCounts | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [hasAttemptedAnalysis, setHasAttemptedAnalysis] = useState<boolean>(false);

  // Active view inside AI modal: 'import', 'review', or 'apply_preview'
  const [activeView, setActiveView] = useState<'import' | 'review' | 'apply_preview'>('import');
  // Memory-only review working copy derived from recognition result
  const [reviewDraft, setReviewDraft] = useState<TimetableReviewDraft | null>(null);

  // Apply Plan state (strictly volatile RAM)
  const [applyPlan, setApplyPlan] = useState<TimetableApplyPlan | null>(null);
  const [applyOptions, setApplyOptions] = useState<ApplyOptions | null>(null);
  const [applyOverrides, setApplyOverrides] = useState<Record<string, CellResolutionAction>>({});
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [appliedSuccessSummary, setAppliedSuccessSummary] = useState<ApplyPlanSummary | null>(null);

  // Keep a ref to the active object URL to ensure cleanup
  const activeObjectUrlRef = useRef<string | null>(null);
  // Keep ref to active AbortController for cancellation
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  // Monotonically increasing request ID to protect against stale/out-of-order response commits
  const activeRequestIdRef = useRef<number>(0);

  const isAnalyzing =
    recognitionState === 'preparing_image' ||
    recognitionState === 'analyzing' ||
    recognitionState === 'validating_response';

  // Sync ref with currentImage objectUrl
  useEffect(() => {
    activeObjectUrlRef.current = currentImage?.objectUrl ?? null;
  }, [currentImage]);

  // Clean up object URL and in-flight request when component unmounts
  useEffect(() => {
    return () => {
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort('cancelled');
        activeAbortControllerRef.current = null;
      }
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
        activeObjectUrlRef.current = null;
      }
    };
  }, []);

  // When API key is completely cleared (user clicked "Xóa Key"), reset workflow
  useEffect(() => {
    if (!apiKey) {
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort('cancelled');
        activeAbortControllerRef.current = null;
      }
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
        activeObjectUrlRef.current = null;
      }
      setCurrentImage(null);
      setWorkflowState('empty');
      setErrorMessage(null);
      setWarningMessage(null);
      setRecognitionState('idle');
      setRecognitionResult(null);
      setRecognitionSummary(null);
      setRecognitionError(null);
      setHasAttemptedAnalysis(false);
      setReviewDraft(null);
      setActiveView('import');
    }
  }, [apiKey]);

  /**
   * Clears all recognition artifacts. Called whenever image orientation or source changes.
   */
  const clearRecognitionData = useCallback(() => {
    activeRequestIdRef.current++;
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort('cancelled');
      activeAbortControllerRef.current = null;
    }
    setRecognitionState('idle');
    setRecognitionResult(null);
    setRecognitionSummary(null);
    setRecognitionError(null);
    setReviewDraft(null);
    setApplyPlan(null);
    setApplyOptions(null);
    setApplyOverrides({});
    setAppliedSuccessSummary(null);
    setActiveView('import');
  }, []);

  /**
   * Remove current image from workflow and revoke object URL.
   */
  const removeImage = useCallback(() => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort('cancelled');
      activeAbortControllerRef.current = null;
    }
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
    clearRecognitionData();
    setCurrentImage(null);
    setWorkflowState('empty');
    setErrorMessage(null);
    setWarningMessage(null);
  }, [clearRecognitionData]);

  /**
   * Reset entire workflow and clear all temporary state.
   */
  const resetWorkflow = useCallback(() => {
    removeImage();
    setRecognitionState('idle');
    setRecognitionResult(null);
    setRecognitionSummary(null);
    setRecognitionError(null);
    setReviewDraft(null);
    setApplyPlan(null);
    setApplyOptions(null);
    setApplyOverrides({});
    setAppliedSuccessSummary(null);
    setActiveView('import');
  }, [removeImage]);

  // When modal closes while analyzing or cancelled, abort request and reset state to ready for next open
  useEffect(() => {
    if (!isImportModalOpen) {
      activeRequestIdRef.current++;
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort('cancelled');
        activeAbortControllerRef.current = null;
      }
      if (appliedSuccessSummary) {
        resetWorkflow();
      } else {
        setRecognitionState((prev) => {
          if (
            prev === 'preparing_image' ||
            prev === 'analyzing' ||
            prev === 'validating_response' ||
            prev === 'cancelled'
          ) {
            return 'idle';
          }
          return prev;
        });
      }
    }
  }, [isImportModalOpen, appliedSuccessSummary, resetWorkflow]);

  /**
   * Process and validate a candidate image file.
   * If an image is already loaded, keeps it visible until the replacement passes validation.
   */
  const processImageFile = useCallback(
    async (file: File): Promise<boolean> => {
      setWorkflowState('validating');
      setErrorMessage(null);

      try {
        const validation = await validateTimetableImage(file);

        if (!validation.valid) {
          setErrorMessage(validation.error || 'Ảnh không hợp lệ.');
          setWorkflowState(currentImage ? 'ready' : 'error');
          return false;
        }

        // Validation passed: create fresh object URL
        const newObjectUrl = URL.createObjectURL(file);

        if (activeObjectUrlRef.current) {
          URL.revokeObjectURL(activeObjectUrlRef.current);
        }
        activeObjectUrlRef.current = newObjectUrl;

        const advisoryWarning =
          validation.warnings && validation.warnings.length > 0
            ? validation.warnings[0]
            : null;

        const newImageInput: TimetableImageInput = {
          file,
          objectUrl: newObjectUrl,
          fileName: file.name,
          mimeType: file.type || 'image/jpeg',
          sizeBytes: file.size,
          width: validation.width || 0,
          height: validation.height || 0,
          rotation: 0,
          validationWarnings: validation.warnings,
        };

        // When changing image, clear any previous recognition result
        clearRecognitionData();

        setCurrentImage(newImageInput);
        setWorkflowState('ready');
        setErrorMessage(null);
        setWarningMessage(advisoryWarning);
        return true;
      } catch {
        setErrorMessage('Không thể xử lý ảnh. Vui lòng thử lại.');
        setWorkflowState(currentImage ? 'ready' : 'error');
        return false;
      }
    },
    [currentImage, clearRecognitionData]
  );

  /**
   * Rotate preview 90 degrees counter-clockwise.
   * Immediately invalidates any previous recognition result since visual orientation changed.
   */
  const rotateLeft = useCallback(() => {
    if (isAnalyzing) return;
    clearRecognitionData();
    setCurrentImage((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        rotation: calcRotateLeft(prev.rotation),
      };
    });
  }, [isAnalyzing, clearRecognitionData]);

  /**
   * Rotate preview 90 degrees clockwise.
   * Immediately invalidates any previous recognition result since visual orientation changed.
   */
  const rotateRight = useCallback(() => {
    if (isAnalyzing) return;
    clearRecognitionData();
    setCurrentImage((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        rotation: calcRotateRight(prev.rotation),
      };
    });
  }, [isAnalyzing, clearRecognitionData]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  /**
   * Execute timetable recognition with Gemini using normalized image orientation.
   */
  const startRecognition = useCallback(async () => {
    // Assert gate strictly per Requirement 10:
    // - imageReady === true
    // - credentialState === "verified"
    // - currentKeyFingerprint === verifiedKeyFingerprint
    // - not currently recognizing
    const isImageReady = Boolean(currentImage && (workflowState === 'ready' || workflowState === 'validating'));
    const isKeyVerified =
      credentialState === 'verified' &&
      isFingerprintMatch &&
      currentKeyFingerprint !== null &&
      validatedKeyFingerprint !== null &&
      currentKeyFingerprint === validatedKeyFingerprint &&
      Boolean(apiKey && apiKey.trim().length >= 10);

    if (!isImageReady || !isKeyVerified || isAnalyzing) {
      if (!isKeyVerified) {
        setRecognitionError('Vui lòng xác thực API Key trước khi phân tích thời khóa biểu.');
      }
      return;
    }

    // Clear previous errors and reset review working copy
    setRecognitionError(null);
    setHasAttemptedAnalysis(true);
    setReviewDraft(null);
    setActiveView('import');

    const requestId = ++activeRequestIdRef.current;
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    try {
      // Step 1: Normalize image according to user's visual rotation
      setRecognitionState('preparing_image');
      const preparedImage = await prepareImageForGemini(currentImage);

      if (controller.signal.aborted || activeRequestIdRef.current !== requestId) {
        setRecognitionState('cancelled');
        return;
      }

      // Step 2: Send structured recognition request to Gemini
      // Requirement 11: Exact canonical verified currentApiKey
      const canonicalKey = apiKey.trim();
      setRecognitionState('analyzing');
      const executionResult = await executeTimetableRecognition(
        canonicalKey,
        preparedImage,
        controller.signal
      );

      if (controller.signal.aborted || activeRequestIdRef.current !== requestId) {
        setRecognitionState('cancelled');
        return;
      }

      // Step 3: Handle result
      if (executionResult.state === 'success' && executionResult.data) {
        if (activeRequestIdRef.current !== requestId) return;
        confirmRemoteCredential();
        setRecognitionState('validating_response');
        const summary = calculateRecognitionSummary(executionResult.data);
        setRecognitionResult(executionResult.data);
        setRecognitionSummary(summary);
        setRecognitionState('success');
      } else {
        if (activeRequestIdRef.current !== requestId) return;
        if (executionResult.isAuthError) {
          setCredentialAuthError(
            executionResult.errorMessage ||
              'API Key không hợp lệ hoặc không có quyền truy cập Gemini.',
            true
          );
        }
        setRecognitionState(executionResult.state);
        setRecognitionError(
          executionResult.errorMessage ||
            'Không thể nhận dạng thời khóa biểu. Vui lòng thử lại.'
        );
      }
    } catch {
      if (activeRequestIdRef.current !== requestId) return;
      if (controller.signal.aborted) {
        setRecognitionState('cancelled');
      } else {
        setRecognitionState('network_error');
        setRecognitionError('Đã xảy ra lỗi trong quá trình xử lý ảnh.');
      }
    } finally {
      if (activeAbortControllerRef.current === controller) {
        activeAbortControllerRef.current = null;
      }
    }
  }, [
    currentImage,
    apiKey,
    credentialState,
    currentKeyFingerprint,
    validatedKeyFingerprint,
    isFingerprintMatch,
    workflowState,
    isAnalyzing,
    confirmRemoteCredential,
    setCredentialAuthError,
  ]);

  const retryRecognition = useCallback(async () => {
    await startRecognition();
  }, [startRecognition]);

  const cancelRecognition = useCallback(() => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort('cancelled');
      activeAbortControllerRef.current = null;
    }
    setRecognitionState('cancelled');
  }, []);

  /**
   * Open the review workspace, creating a review draft from recognition result if needed.
   */
  const openReviewWorkspace = useCallback(() => {
    if (!recognitionResult) return;
    setReviewDraft((currentDraft) => {
      if (currentDraft) return currentDraft;
      return createReviewDraft(recognitionResult);
    });
    setActiveView('review');
  }, [recognitionResult]);

  /**
   * Return to recognition summary, preserving review draft in RAM.
   */
  const closeReviewWorkspace = useCallback(() => {
    setActiveView('import');
  }, []);

  /**
   * Update a cell in the review draft locally.
   */
  const updateCell = useCallback(
    (cellId: string, updates: { status: CellStatus; subject: string | null }) => {
      setReviewDraft((prev) => {
        if (!prev) return null;
        return updateReviewCell(prev, cellId, updates);
      });
    },
    []
  );

  /**
   * Explicitly confirm a low-confidence recognized cell.
   */
  const confirmCell = useCallback((cellId: string) => {
    setReviewDraft((prev) => {
      if (!prev) return null;
      return confirmReviewCell(prev, cellId);
    });
  }, []);

  /**
   * Restore a single cell to original Gemini recognition values.
   */
  const restoreCell = useCallback((cellId: string) => {
    setReviewDraft((prev) => {
      if (!prev) return null;
      return restoreReviewCell(prev, cellId);
    });
  }, []);

  /**
   * Update a metadata field in review draft locally.
   */
  const updateMetadataField = useCallback(
    (field: keyof ReviewMetadata, value: string | null) => {
      setReviewDraft((prev) => {
        if (!prev) return null;
        return updateReviewMetadata(prev, field, value);
      });
    },
    []
  );

  /**
   * Restore all review edits back to original Gemini recognition result.
   */
  const restoreAllReviewEdits = useCallback(() => {
    if (!recognitionResult) return;
    const freshDraft = restoreAllReview(recognitionResult);
    setReviewDraft(freshDraft);
  }, [recognitionResult]);

  /**
   * Open the Apply Preview view, computing the initial Apply Plan.
   */
  const openApplyPreview = useCallback(() => {
    if (!reviewDraft) return;
    if (reviewDraft.reviewMeta.unresolvedCellCount > 0) return;
    const opts = applyOptions || createDefaultApplyOptions(reviewDraft);
    if (!applyOptions) {
      setApplyOptions(opts);
    }
    const plan = buildTimetableApplyPlan(
      currentTimetableState,
      reviewDraft,
      opts,
      applyOverrides
    );
    setApplyPlan(plan);
    setAppliedSuccessSummary(null);
    setActiveView('apply_preview');
  }, [reviewDraft, applyOptions, applyOverrides, currentTimetableState]);

  /**
   * Return from apply preview back to review workspace.
   */
  const backToReviewWorkspace = useCallback(() => {
    setActiveView('review');
  }, []);

  /**
   * Update apply options and recalculate apply plan.
   */
  const updateApplyOptions = useCallback(
    (updates: Partial<ApplyOptions>) => {
      if (!reviewDraft) return;
      setApplyOptions((prev) => {
        const base = prev || createDefaultApplyOptions(reviewDraft);
        const next: ApplyOptions = {
          ...base,
          ...updates,
          metadata: {
            ...base.metadata,
            ...(updates.metadata || {}),
          },
          structure: {
            ...base.structure,
            ...(updates.structure || {}),
          },
        };
        const plan = buildTimetableApplyPlan(
          currentTimetableState,
          reviewDraft,
          next,
          applyOverrides
        );
        setApplyPlan(plan);
        return next;
      });
    },
    [reviewDraft, currentTimetableState, applyOverrides]
  );

  /**
   * Update per-cell resolution override and recalculate apply plan.
   */
  const updateApplyOverride = useCallback(
    (cellId: string, resolution: CellResolutionAction) => {
      if (!reviewDraft) return;
      setApplyOverrides((prev) => {
        const nextOverrides = { ...prev, [cellId]: resolution };
        const currentOpts = applyOptions || createDefaultApplyOptions(reviewDraft);
        const plan = buildTimetableApplyPlan(
          currentTimetableState,
          reviewDraft,
          currentOpts,
          nextOverrides
        );
        setApplyPlan(plan);
        return nextOverrides;
      });
    },
    [reviewDraft, applyOptions, currentTimetableState]
  );

  /**
   * Reset all cell overrides back to 'auto'.
   */
  const resetApplyOverrides = useCallback(() => {
    if (!reviewDraft) return;
    setApplyOverrides({});
    const currentOpts = applyOptions || createDefaultApplyOptions(reviewDraft);
    const plan = buildTimetableApplyPlan(
      currentTimetableState,
      reviewDraft,
      currentOpts,
      {}
    );
    setApplyPlan(plan);
  }, [reviewDraft, applyOptions, currentTimetableState]);

  /**
   * Atomically apply plan into active timetable state.
   */
  const executeApplyToTimetable = useCallback((): boolean => {
    if (!applyPlan || !applyPlan.isValid || isApplying) {
      return false;
    }

    try {
      setIsApplying(true);
      const nextState = applyPlanToDocumentState(currentTimetableState, applyPlan);
      applyTimetableImport(nextState);
      const successSummary = applyPlan.summary;
      setAppliedSuccessSummary(successSummary);
      setApplyPlan(null); // Prevent accidental double apply
      showToast('Đã nhập dữ liệu vào thời khóa biểu thành công!', 'success');
      return true;
    } catch (err) {
      console.error('Failed to apply timetable plan:', err);
      showToast('Không thể áp dụng kết quả. Thời khóa biểu hiện tại chưa bị thay đổi.', 'error');
      return false;
    } finally {
      setIsApplying(false);
    }
  }, [applyPlan, isApplying, currentTimetableState, applyTimetableImport, showToast]);

  const value = useMemo(
    () => ({
      currentImage,
      workflowState,
      errorMessage,
      warningMessage,
      recognitionState,
      recognitionResult,
      recognitionSummary,
      recognitionError,
      hasAttemptedAnalysis,
      isAnalyzing,
      processImageFile,
      rotateLeft,
      rotateRight,
      removeImage,
      clearError,
      startRecognition,
      retryRecognition,
      cancelRecognition,
      activeView,
      reviewDraft,
      openReviewWorkspace,
      closeReviewWorkspace,
      updateCell,
      confirmCell,
      restoreCell,
      updateMetadataField,
      restoreAllReviewEdits,
      applyPlan,
      applyOptions,
      applyOverrides,
      isApplying,
      appliedSuccessSummary,
      openApplyPreview,
      backToReviewWorkspace,
      updateApplyOptions,
      updateApplyOverride,
      resetApplyOverrides,
      executeApplyToTimetable,
      resetWorkflow,
    }),
    [
      currentImage,
      workflowState,
      errorMessage,
      warningMessage,
      recognitionState,
      recognitionResult,
      recognitionSummary,
      recognitionError,
      hasAttemptedAnalysis,
      isAnalyzing,
      processImageFile,
      rotateLeft,
      rotateRight,
      removeImage,
      clearError,
      startRecognition,
      retryRecognition,
      cancelRecognition,
      activeView,
      reviewDraft,
      openReviewWorkspace,
      closeReviewWorkspace,
      updateCell,
      confirmCell,
      restoreCell,
      updateMetadataField,
      restoreAllReviewEdits,
      applyPlan,
      applyOptions,
      applyOverrides,
      isApplying,
      appliedSuccessSummary,
      openApplyPreview,
      backToReviewWorkspace,
      updateApplyOptions,
      updateApplyOverride,
      resetApplyOverrides,
      executeApplyToTimetable,
      resetWorkflow,
    ]
  );

  return (
    <AIImageImportContext.Provider value={value}>
      {children}
    </AIImageImportContext.Provider>
  );
};

export function useAIImageImport(): AIImageImportContextType {
  const context = useContext(AIImageImportContext);
  if (!context) {
    throw new Error('useAIImageImport must be used within an AIImageImportProvider');
  }
  return context;
}
