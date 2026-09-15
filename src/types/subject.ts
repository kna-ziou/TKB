export interface Subject {
  id: string;
  name: string;
  displayName?: string;
  shortName?: string;
  custom?: boolean;
  defaultColor: string;
  color: string;
  colorLocked?: boolean;
}
