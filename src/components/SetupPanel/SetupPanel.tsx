import React from 'react';
import {
  BookOpen,
  CalendarDays,
  Layers,
  Palette,
  ScanLine,
  Settings2,
  Sun,
  Sunset,
  Table,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { useGeminiCredential } from '../../context/GeminiCredentialContext';
import { ALL_DAYS, DEFAULT_5_DAYS } from '../../utils/timetableFactory';
import { ThemePicker } from '../ThemePicker/ThemePicker';

export const SetupPanel: React.FC = () => {
  const {
    state,
    updateMeta,
    updateConfig,
    generateTimetable,
    openSubjectManager,
  } = useTimetable();
  const { openImportModal } = useGeminiCredential();
  const { meta, config } = state;

  const is6Days = config.activeDays.length === 6;

  const handleMetaChange = (
    field: keyof typeof meta,
    value: string
  ) => {
    updateMeta({ [field]: value });
  };

  const handleDaysChange = (daysCount: 5 | 6) => {
    const activeDays = daysCount === 6 ? ALL_DAYS : DEFAULT_5_DAYS;
    updateConfig({ activeDays });
  };

  const handleMorningPeriodsChange = (periods: number) => {
    updateConfig({ morningPeriods: periods });
  };

  const handleAfternoonPeriodsChange = (periods: number) => {
    updateConfig({ afternoonPeriods: periods });
  };

  const handleAfternoonToggle = (enabled: boolean) => {
    updateConfig({ afternoonEnabled: enabled });
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    generateTimetable();
  };

  return (
    <aside
      id="setup-panel"
      className="w-full lg:w-[320px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden"
    >
      <div className="p-5 border-b border-slate-100 bg-sky-50">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-sky-600 rounded flex items-center justify-center text-white font-bold text-sm shadow-xs">
            TKB
          </div>
          <h2 className="text-lg font-bold text-sky-900">Thiết lập thời khóa biểu</h2>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-bold text-sky-600 opacity-80">
          Cấu hình nhanh & Dễ dàng
        </span>
      </div>

      <form onSubmit={handleGenerate} className="flex-1 flex flex-col">
        <div className="p-5 space-y-6 flex-1 overflow-y-auto">
          {/* Section 1: Thông tin */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Thông tin</span>
            </h3>

            <div className="space-y-3">
              {/* Tiêu đề */}
              <div>
                <label
                  htmlFor="field-title"
                  className="block text-xs font-semibold mb-1 text-slate-700"
                >
                  Tiêu đề <span className="text-rose-500">*</span>
                </label>
                <input
                  id="field-title"
                  type="text"
                  required
                  value={meta.title}
                  onChange={(e) => handleMetaChange('title', e.target.value)}
                  placeholder="THỜI KHÓA BIỂU"
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white transition-all font-medium text-slate-900"
                />
              </div>

              {/* Tên trường */}
              <div>
                <label
                  htmlFor="field-school"
                  className="block text-xs font-semibold mb-1 text-slate-700"
                >
                  Tên trường
                </label>
                <input
                  id="field-school"
                  type="text"
                  value={meta.schoolName}
                  onChange={(e) => handleMetaChange('schoolName', e.target.value)}
                  placeholder="Trường Tiểu học Nguyễn Du"
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-slate-800"
                />
              </div>

              {/* Grid Lớp và Học sinh */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="field-class"
                    className="block text-xs font-semibold mb-1 text-slate-700"
                  >
                    Lớp
                  </label>
                  <input
                    id="field-class"
                    type="text"
                    value={meta.className}
                    onChange={(e) => handleMetaChange('className', e.target.value)}
                    placeholder="4A1"
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label
                    htmlFor="field-student"
                    className="block text-xs font-semibold mb-1 text-slate-700"
                  >
                    Học sinh
                  </label>
                  <input
                    id="field-student"
                    type="text"
                    value={meta.studentName}
                    onChange={(e) => handleMetaChange('studentName', e.target.value)}
                    placeholder="Lê Minh Anh"
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Năm học */}
              <div>
                <label
                  htmlFor="field-year"
                  className="block text-xs font-semibold mb-1 text-slate-700"
                >
                  Năm học
                </label>
                <input
                  id="field-year"
                  type="text"
                  value={meta.schoolYear}
                  onChange={(e) => handleMetaChange('schoolYear', e.target.value)}
                  placeholder="2026–2027"
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-slate-800"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Cấu hình */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Cấu hình</span>
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Số ngày học</label>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                  <button
                    id="btn-days-5"
                    type="button"
                    onClick={() => handleDaysChange(5)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      !is6Days
                        ? 'bg-white text-sky-800 font-bold shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Thứ 2 → 6
                  </button>
                  <button
                    id="btn-days-6"
                    type="button"
                    onClick={() => handleDaysChange(6)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      is6Days
                        ? 'bg-white text-sky-800 font-bold shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Thứ 2 → 7
                  </button>
                </div>
              </div>

              {/* Buổi sáng */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Buổi sáng</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5, 6].map((p) => (
                    <button
                      key={`morning-${p}`}
                      id={`btn-morning-periods-${p}`}
                      type="button"
                      onClick={() => handleMorningPeriodsChange(p)}
                      className={`w-6 h-6 text-xs font-medium rounded border transition-all text-center ${
                        config.morningPeriods === p
                          ? 'bg-sky-600 border-sky-600 text-white font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      title={`${p} tiết`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buổi chiều Toggle */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <Sunset className="w-3.5 h-3.5 text-orange-500" />
                    <span>Học buổi chiều</span>
                  </div>
                  <label
                    htmlFor="toggle-afternoon"
                    className="relative inline-flex items-center cursor-pointer"
                  >
                    <input
                      id="toggle-afternoon"
                      type="checkbox"
                      checked={config.afternoonEnabled}
                      onChange={(e) => handleAfternoonToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                {/* Số tiết chiều */}
                {config.afternoonEnabled && (
                  <div className="flex items-center justify-between pl-4 pt-1">
                    <span className="text-xs text-slate-500">Số tiết chiều:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5, 6].map((p) => (
                        <button
                          key={`afternoon-${p}`}
                          id={`btn-afternoon-periods-${p}`}
                          type="button"
                          onClick={() => handleAfternoonPeriodsChange(p)}
                          className={`w-6 h-6 text-xs font-medium rounded border transition-all text-center ${
                            config.afternoonPeriods === p
                              ? 'bg-sky-600 border-sky-600 text-white font-bold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action button: Tạo bảng biểu & Quét TKB từ ảnh */}
              <div className="pt-2 space-y-2">
                <button
                  id="btn-generate-timetable"
                  type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm shadow-sky-200 transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm"
                >
                  <Table className="w-4 h-4" />
                  <span>Tạo bảng biểu</span>
                </button>

                <button
                  id="btn-ai-image-import"
                  type="button"
                  onClick={openImportModal}
                  className="w-full py-2 px-3 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-800 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                  title="Nhận dạng thời khóa biểu từ ảnh bằng Gemini AI"
                >
                  <ScanLine className="w-4 h-4 text-violet-600" />
                  <span>Quét TKB từ ảnh</span>
                </button>
              </div>
            </div>
          </section>

          {/* Section 3: Phong cách */}
          <ThemePicker />

          {/* Section 4: Quản lý Môn học & Màu sắc */}
          <section id="setup-section-subjects" className="space-y-2.5 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-600" />
              <span>Môn học & Màu sắc</span>
            </h3>

            <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-medium">
                  {state.subjects.filter((s) => !s.custom).length} môn mặc định
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-amber-700">
                  {state.subjects.filter((s) => s.custom).length} môn tùy chỉnh
                </span>
              </div>

              <button
                id="btn-open-subject-manager"
                type="button"
                onClick={openSubjectManager}
                className="w-full py-2 px-3 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-sky-700 hover:text-sky-800 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-sky-600" />
                <span>Quản lý môn học</span>
              </button>
            </div>
          </section>
        </div>
      </form>
    </aside>
  );
};
