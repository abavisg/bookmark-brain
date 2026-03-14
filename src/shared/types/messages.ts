import type { BookmarkStatus } from '@/shared/types/db'

export type AppMessage =
  | { type: 'PING' }
  | { type: 'GET_STATUS' }
  | {
      type: 'SAVE_BOOKMARK'
      payload: { url: string; title: string; favicon?: string }
    }
  | { type: 'PROCESSING_STATUS'; payload: { bookmarkId: number } }

export type AppResponse<T extends AppMessage> = T extends { type: 'PING' }
  ? { alive: boolean }
  : T extends { type: 'GET_STATUS' }
    ? { version: string }
    : T extends { type: 'SAVE_BOOKMARK' }
      ? { bookmarkId: number; alreadyExists: boolean }
      : T extends { type: 'PROCESSING_STATUS' }
        ? { status: BookmarkStatus }
        : never
