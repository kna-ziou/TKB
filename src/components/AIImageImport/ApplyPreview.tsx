/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertOctagon,
  Info,
} from 'lucide-react';
import { useAIImageImport } from '../../context/AIImageImportContext';
import { ApplyStatusBar } from './ApplyStatusBar';
import { ApplyOptionsPanel } from './ApplyOptionsPanel';
import { ApplyGrid } from './ApplyGrid';
import { ApplyConfirmModal } from './ApplyConfirmModal';
import { ApplySuccessView } from './ApplySuccessView';

export const ApplyPreview: React.FC = () => {
  const { applyPlan, appliedSuccessSummary } = useAIImageImport();
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

  // If application was successful, show the success view
  if (appliedSuccessSummary) {
    return <ApplySuccessView summary={appliedSuccessSummary} />;
  }

  if (!applyPlan) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Đang tạo kế hoạch áp dụng...
      </div>
    );
  }

  const { isValid, blockingIssues, warnings } = applyPlan;

  return (
    <div
      id="apply-preview-workspace"
      className="space-y-4 pb-6 w-full max-w-full min-w-0"
      style={{ '--apply-status-bar-height': '54px' } as React.CSSProperties}
    >
      {/* Top Sticky Status Bar */}
      <ApplyStatusBar
        plan={applyPlan}
        onOpenConfirm={() => setIsConfirmOpen(true)}
      />

      {/* Blocking Issues Alert Banner */}
      {!isValid && blockingIssues.length > 0 && (
        <div
          id="apply-blocking-issues-banner"
          className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900 space-y-2 animate-in fade-in duration-150 w-full max-w-full min-w-0 break-words"
        >
          <div className="flex items-center gap-2 font-bold text-red-800 text-sm">
            <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
            <span>Chưa thể áp dụng vào thời khóa biểu</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-red-700">
            {blockingIssues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Advisory Warnings Banner */}
      {warnings.length > 0 && (
        <div
          id="apply-warnings-banner"
          className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-900 space-y-1.5 w-full max-w-full min-w-0 break-words"
        >
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Lưu ý:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px]">
            {warnings.map((warn, idx) => (
              <li key={idx}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Merge Strategy and Options */}
      <ApplyOptionsPanel plan={applyPlan} />

      {/* Interactive Grid Preview */}
      <ApplyGrid plan={applyPlan} />

      {/* Confirmation Modal */}
      <ApplyConfirmModal
        plan={applyPlan}
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};
