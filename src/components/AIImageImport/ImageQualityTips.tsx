/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

export const ImageQualityTips: React.FC<{ defaultOpen?: boolean }> = ({
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      id="image-quality-guidance"
      className="border border-slate-200/90 rounded-xl overflow-hidden bg-slate-50/70"
    >
      <button
        type="button"
        id="btn-toggle-quality-tips"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 text-left flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100/70 transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span>Để nhận dạng tốt hơn</span>
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div
          id="image-quality-tips-content"
          className="p-3.5 pt-0 text-xs text-slate-600 space-y-1.5 border-t border-slate-100 animate-in fade-in duration-150"
        >
          <ul className="space-y-1.5 list-disc list-inside text-slate-600">
            <li>Chụp thẳng thời khóa biểu, hạn chế nghiêng.</li>
            <li>Đảm bảo chữ và đường kẻ rõ nét.</li>
            <li>Tránh phản sáng hoặc bóng che nội dung.</li>
            <li>Chụp đầy đủ toàn bộ bảng thời khóa biểu.</li>
            <li>Nếu ảnh bị xoay, hãy xoay đúng chiều trước khi phân tích.</li>
          </ul>
        </div>
      )}
    </div>
  );
};
