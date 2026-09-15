/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from 'lucide-react';
import { useAIImageImport } from '../../context/AIImageImportContext';

export const ReviewImagePanel: React.FC = () => {
  const { currentImage } = useAIImageImport();
  const [zoom, setZoom] = useState<number>(100);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(true);

  if (!currentImage) return null;

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(250, prev + 25));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(50, prev - 25));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  const isRotated90or270 =
    currentImage.rotation === 90 || currentImage.rotation === 270;

  return (
    <div
      id="review-image-panel"
      className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-inner w-full max-w-full min-w-0"
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-2 bg-slate-950/80 border-b border-slate-800 text-white text-xs w-full min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <ImageIcon className="w-4 h-4 text-violet-400 shrink-0" />
          <span className="font-bold truncate text-[11px] sm:text-xs">
            Ảnh gốc đối chiếu
          </span>
          {currentImage.rotation !== 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-900/60 text-violet-300 border border-violet-700/50 shrink-0">
              {currentImage.rotation}°
            </span>
          )}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <button
            id="btn-review-zoom-out"
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors rounded-lg cursor-pointer"
            title="Thu nhỏ (50% min)"
            aria-label="Thu nhỏ ảnh"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span
            id="review-zoom-level"
            className="font-mono text-[11px] text-slate-300 min-w-[38px] sm:min-w-[42px] text-center font-bold"
          >
            {zoom}%
          </span>

          <button
            id="btn-review-zoom-in"
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 250}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors rounded-lg cursor-pointer"
            title="Phóng to (250% max)"
            aria-label="Phóng to ảnh"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-review-zoom-reset"
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg cursor-pointer ml-0.5"
            title="Đặt lại kích thước 100%"
            aria-label="Đặt lại kích thước gốc"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Toggle for mobile collapsible */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg ml-0.5"
            aria-label={isMobileOpen ? 'Thu gọn ảnh' : 'Mở rộng ảnh'}
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Pannable/Scrollable Image Viewport */}
      {isMobileOpen && (
        <div
          id="review-image-viewport"
          className="relative w-full max-w-full min-w-0 h-64 sm:h-80 lg:h-[calc(100vh-320px)] min-h-[260px] max-h-[640px] overflow-auto flex items-center justify-center p-4 bg-slate-900 select-none cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'pan-x pan-y' }}
        >
          <div
            className="transition-transform duration-100 ease-out origin-center flex items-center justify-center"
            style={{
              transform: `scale(${zoom / 100})`,
            }}
          >
            <img
              id="review-source-img"
              src={currentImage.objectUrl}
              alt="Ảnh thời khóa biểu gốc dùng để đối chiếu"
              className="max-w-none transition-transform duration-200 object-contain shadow-2xl rounded-sm"
              style={{
                transform: `rotate(${currentImage.rotation}deg)`,
                maxHeight: isRotated90or270 ? '420px' : '520px',
                maxWidth: isRotated90or270 ? '520px' : '420px',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
