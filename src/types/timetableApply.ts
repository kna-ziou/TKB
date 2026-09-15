/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DayKey, SessionType, TimetableState } from './timetable';
import { DayKey as RecognitionDayKey, SessionKey as RecognitionSessionKey } from './timetableRecognition';

export type ApplyCellStrategy =
  | 'fill_empty_only' // OPTION 1: Chỉ điền ô trống (Mặc định an toàn nhất)
  | 'prefer_image'    // OPTION 2: Ưu tiên dữ liệu ảnh
  | 'replace_all';    // OPTION 3: Thay thế toàn bộ phạm vi nhập

export interface ApplyMetadataOptions {
  title: boolean;
  schoolName: boolean;
  className: boolean;
  studentName: boolean;
  schoolYear: boolean;
}

export interface ApplyStructureOptions {
  adjustDays: boolean;
  adjustPeriods: boolean;
}

export interface ApplyOptions {
  metadata: ApplyMetadataOptions;
  structure: ApplyStructureOptions;
  cellStrategy: ApplyCellStrategy;
  allowDestructiveClear: boolean;
}

export type CellChangeType =
  | 'add'             // Ô hiện tại trống, ảnh có môn -> Thêm (+)
  | 'unchanged'       // Ô hiện tại và ảnh trùng môn -> Không đổi (=)
  | 'replace'         // Ô hiện tại có môn khác ảnh -> Thay thế (↔)
  | 'clear_conflict'  // Ô hiện tại có môn, ảnh báo trống -> Xóa/Xung đột (−)
  | 'skip'            // Bỏ qua do chiến lược hoặc người dùng chọn giữ (⊘)
  | 'empty_unchanged' // Cả hai đều trống -> Trống không đổi
  | 'unmappable';     // Nằm ngoài cấu trúc khi tắt điều chỉnh cấu trúc (⚠)

export type CellResolutionAction =
  | 'auto'            // Theo chiến lược toàn cục
  | 'keep_current'    // Giữ nguyên ô hiện tại
  | 'use_image'       // Dùng dữ liệu từ ảnh
  | 'clear_cell';     // Xóa ô (chỉ khả dụng khi bật cho phép xóa)

export interface CellApplyChange {
  cellId: string;
  dayKey: DayKey;
  session: SessionType;
  periodNumber: number; // 1-based
  periodIndex: number;  // 0-based
  currentSubject: string | null;
  aiSubject: string | null;
  finalSubject: string | null;
  // Strictly separated semantic properties
  currentValue: string | null;
  reviewValue: string | null;
  resultValue: string | null;
  classification: CellChangeType;
  resolution: CellResolutionAction;
  isConflict: boolean;
  warning?: string;
}

export interface MetadataApplyChange {
  field: 'title' | 'schoolName' | 'className' | 'studentName' | 'schoolYear';
  label: string;
  currentValue: string;
  aiValue: string | null;
  finalValue: string;
  enabled: boolean;
  isChanged: boolean;
  hasAiValue: boolean;
}

export interface StructureApplyChange {
  type: 'days' | 'morningPeriods' | 'afternoonPeriods';
  label: string;
  currentDescription: string;
  proposedDescription: string;
  isChanged: boolean;
  enabled: boolean;
  warning?: string;
  blocking?: string;
  targetDays?: DayKey[];
}

export interface ApplyPlanSummary {
  metadataChanged: number;
  structureChanged: number;
  cellsAdded: number;
  cellsReplaced: number;
  cellsSkipped: number;
  cellsUnchanged: number;
  cellsCleared: number;
  conflicts: number;
}

export interface TimetableApplyPlan {
  id: string;
  draftVersion: string;
  createdAt: string;
  source: {
    recognitionModel?: string;
    imageFileName?: string;
  };
  options: ApplyOptions;
  overrides: Record<string, CellResolutionAction>;
  metadataChanges: MetadataApplyChange[];
  structureChanges: StructureApplyChange[];
  cellChanges: CellApplyChange[];
  summary: ApplyPlanSummary;
  warnings: string[];
  blockingIssues: string[];
  isValid: boolean;
}

export type ApplyPreviewFilter =
  | 'all'
  | 'conflicts'
  | 'add'
  | 'replace'
  | 'skip';
