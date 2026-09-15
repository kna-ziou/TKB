/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ReviewFilterType } from '../../types/timetableReview';
import { ReviewStatusBar } from './ReviewStatusBar';
import { ReviewImagePanel } from './ReviewImagePanel';
import { ReviewMetadata } from './ReviewMetadata';
import { ReviewFilters } from './ReviewFilters';
import { ReviewGrid } from './ReviewGrid';
import { ReviewSummary } from './ReviewSummary';

export const RecognitionReview: React.FC = () => {
  const [filter, setFilter] = useState<ReviewFilterType>('all');

  return (
    <div
      id="recognition-review-workspace"
      className="space-y-4 w-full max-w-full min-w-0"
    >
      {/* Sticky Top Status Bar */}
      <ReviewStatusBar />

      {/* Workspace Sub-header */}
      <div className="pt-1 pb-1 w-full min-w-0">
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
          Kiểm tra kết quả nhận dạng
        </h3>
        <p className="text-xs text-slate-600 font-medium mt-0.5 leading-relaxed">
          Đối chiếu kết quả Gemini với ảnh gốc trước khi chuẩn bị nhập vào thời khóa biểu.
        </p>
      </div>

      {/* Main Responsive Layout: Two-panel on desktop, stacked on tablet/mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start w-full max-w-full min-w-0">
        {/* LEFT PANEL: Source Image with Zoom Controls */}
        <div className="lg:col-span-5 lg:sticky lg:top-14 w-full max-w-full min-w-0">
          <ReviewImagePanel />
        </div>

        {/* RIGHT PANEL: Metadata, Filters, Grid, and Summary */}
        <div className="lg:col-span-7 space-y-4 w-full max-w-full min-w-0">
          {/* Metadata Section */}
          <ReviewMetadata />

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap w-full min-w-0">
            <ReviewFilters
              currentFilter={filter}
              onFilterChange={(f) => setFilter(f)}
            />
          </div>

          {/* Timetable Review Grid */}
          <ReviewGrid filter={filter} />

          {/* Progress Summary & Apply/Reset Controls */}
          <ReviewSummary />
        </div>
      </div>
    </div>
  );
};
