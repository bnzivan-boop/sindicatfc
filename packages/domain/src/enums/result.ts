/** Жизненный цикл результата (handoff, 7.3). */
export const ResultStatus = {
  DRAFT: 'DRAFT',
  UPLOADING: 'UPLOADING',
  SUBMITTED: 'SUBMITTED',
  AUTO_CHECKED: 'AUTO_CHECKED',
  PENDING_JUDGE: 'PENDING_JUDGE',
  ACCEPTED: 'ACCEPTED',
  NEEDS_RESUBMISSION: 'NEEDS_RESUBMISSION',
  REJECTED: 'REJECTED',
  UNDER_PROTEST: 'UNDER_PROTEST',
  CORRECTED: 'CORRECTED',
} as const;
export type ResultStatus = (typeof ResultStatus)[keyof typeof ResultStatus];

export const JudgeDecision = {
  ACCEPT: 'ACCEPT',
  REJECT: 'REJECT',
  REQUEST_RESUBMISSION: 'REQUEST_RESUBMISSION',
} as const;
export type JudgeDecision = (typeof JudgeDecision)[keyof typeof JudgeDecision];

export const ProtestStatus = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  UPHELD: 'UPHELD',
  DISMISSED: 'DISMISSED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type ProtestStatus = (typeof ProtestStatus)[keyof typeof ProtestStatus];

/** Состояние загрузки на устройстве (handoff, 13 — offline). */
export const UploadState = {
  ON_DEVICE: 'ON_DEVICE',
  UPLOADING: 'UPLOADING',
  SENT: 'SENT',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
} as const;
export type UploadState = (typeof UploadState)[keyof typeof UploadState];
