import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Circle, Clock, Search, X } from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { calculateTimetableStatistics } from '../../utils/statisticsUtils';
import { removeVietnameseTones } from '../../utils/subjectUtils';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { state } = useTimetable();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const stats = useMemo(() => {
    return calculateTimetableStatistics(state);
  }, [state]);

  const filteredStats = useMemo(() => {
    if (!searchQuery.trim()) return stats.subjectStats;
    const cleanQ = removeVietnameseTones(searchQuery.trim().toLowerCase());
    return stats.subjectStats.filter((item) => {
      const name = removeVietnameseTones(
        (item.subject.displayName || item.subject.name).toLowerCase()
      );
      return name.includes(cleanQ);
    });
  }, [searchQuery, stats.subjectStats]);

  if (!isOpen) return null;

  const percentFilled =
    stats.totalPeriods > 0
      ? Math.round((stats.filledPeriods / stats.totalPeriods) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs no-print">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-modal-title"
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="stats-modal-title"
                className="text-base font-bold text-slate-900"
              >
                Thống kê tiết học
              </h3>
              <p className="text-xs text-slate-500">
                Phân bổ môn học trong thời khóa biểu hiện tại
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5 py-4">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col">
            <span className="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" /> Tổng số tiết
            </span>
            <span className="text-xl font-bold text-slate-900">
              {stats.totalPeriods}
            </span>
          </div>

          <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100 flex flex-col">
            <span className="text-[11px] font-medium text-emerald-700 mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã xếp
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-emerald-800">
                {stats.filledPeriods}
              </span>
              <span className="text-xs font-semibold text-emerald-600">
                ({percentFilled}%)
              </span>
            </div>
          </div>

          <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-100 flex flex-col">
            <span className="text-[11px] font-medium text-amber-700 mb-1 flex items-center gap-1">
              <Circle className="w-3 h-3 text-amber-500" /> Còn trống
            </span>
            <span className="text-xl font-bold text-amber-800">
              {stats.emptyPeriods}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                stats.isComplete ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${percentFilled}%` }}
            />
          </div>
          {stats.isComplete ? (
            <p className="text-[11px] font-medium text-emerald-600 mt-1.5 text-center">
              ✓ Đã xếp đủ tất cả các tiết trong tuần!
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 mt-1.5 text-center">
              Còn {stats.emptyPeriods} tiết chưa phân công môn học
            </p>
          )}
        </div>

        {/* Search filter for subjects */}
        {stats.subjectStats.length > 5 && (
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm môn học..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Subject Breakdown List */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-1.5">
          {filteredStats.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              {searchQuery ? 'Không tìm thấy môn học phù hợp' : 'Chưa có môn học nào được xếp'}
            </div>
          ) : (
            filteredStats.map((item) => (
              <div
                key={item.subject.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50/80 transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 shadow-2xs"
                    style={{ backgroundColor: item.subject.color }}
                  />
                  <span className="font-semibold text-slate-800 truncate">
                    {item.subject.displayName || item.subject.name}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <div className="text-[11px] text-slate-400">
                    Sáng: <span className="font-semibold text-slate-600">{item.morning}</span>
                    {state.config.afternoonEnabled && (
                      <>
                        {' • '}
                        Chiều: <span className="font-semibold text-slate-600">{item.afternoon}</span>
                      </>
                    )}
                  </div>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md min-w-[45px] text-center">
                    {item.total} tiết
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {stats.subjectStats.length} môn đã được phân công
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
