/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Loader2, X } from 'lucide-react';
import { useAIImageImport } from '../../context/AIImageImportContext';
import { RECOGNITION_STATE_MESSAGES } from '../../config/geminiConfig';

export const RecognitionProgress: React.FC = () => {
  const { recognitionState, cancelRecognition } = useAIImageImport();

  const message =
    RECOGNITION_STATE_MESSAGES[recognitionState] || 'Đang xử lý thời khóa biểu...';

  return (
    <div
      id="recognition-progress-container"
      role="status"
      aria-live="polite"
      className="p-5 bg-violet-50/80 border border-violet-200/90 rounded-2xl flex flex-col items-center justify-center gap-3 text-center shadow-xs animate-in fade-in duration-200"
    >
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600 shadow-inner">
          <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
        </div>
      </div>

      <div className="space-y-1 max-w-sm">
        <p className="text-sm font-bold text-violet-950">{message}</p>
        <p className="text-xs text-violet-700/80">
          Vui lòng đợi trong giây lát. Quá trình có thể mất từ 5 đến 20 giây.
        </p>
      </div>

      {/* Cancel button */}
      <button
        id="btn-cancel-recognition"
        type="button"
        onClick={cancelRecognition}
        className="mt-1 py-1.5 px-3.5 text-xs font-semibold text-slate-600 bg-white/90 hover:bg-white hover:text-slate-900 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-2xs"
        title="Dừng quá trình phân tích ảnh hiện tại"
      >
        <X className="w-3.5 h-3.5 text-slate-500" />
        <span>Hủy phân tích</span>
      </button>
    </div>
  );
};
