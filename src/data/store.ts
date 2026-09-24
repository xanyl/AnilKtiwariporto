import { useSyncExternalStore } from "react";
import * as defaults from "./resume";
import type {
  CertificateRecord,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  Publication,
  SkillGroup,
} from "./resume";

export interface ResumeData {
  profile: typeof defaults.profile;
  summary: string;
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skillGroups: SkillGroup[];
  education: EducationEntry[];
  certificates: CertificateRecord[];
  publications: Publication[];
}

export type ResumeField = keyof ResumeData;

export const RESUME_FIELDS: ResumeField[] = [
  "profile",
  "summary",
  "experience",
  "projects",
  "skillGroups",
  "education",
  "certificates",
  "publications",
];

const DEFAULTS: ResumeData = {
  profile: defaults.profile,
  summary: defaults.summary,
  experience: defaults.experience,
  projects: defaults.projects,
  skillGroups: defaults.skillGroups,
  education: defaults.education,
  certificates: defaults.certificates,
  publications: defaults.publications,
};

let state: ResumeData = { ...DEFAULTS };
let overridden = new Set<ResumeField>();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): ResumeData {
  return state;
}

export function getField<K extends ResumeField>(key: K): ResumeData[K] {
  return state[key];
}

export function isOverridden(key: ResumeField): boolean {
  return overridden.has(key);
}

export function setField<K extends ResumeField>(key: K, value: ResumeData[K]) {
  state = { ...state, [key]: value };
  overridden.add(key);
  emit();
}

export function resetField(key: ResumeField) {
  state = { ...state, [key]: DEFAULTS[key] };
  overridden.delete(key);
  emit();
}

/** Applies a patch fetched from the backend (e.g. on boot). Never marks fields dirty for save-diffing. */
export function applyOverrides(patch: Partial<ResumeData>) {
  state = { ...state, ...patch };
  overridden = new Set([...overridden, ...(Object.keys(patch) as ResumeField[])]);
  emit();
}

export function useResumeField<K extends ResumeField>(key: K): ResumeData[K] {
  return useSyncExternalStore(subscribe, () => getField(key));
}

export function useResumeData(): ResumeData {
  return useSyncExternalStore(subscribe, getSnapshot);
}
