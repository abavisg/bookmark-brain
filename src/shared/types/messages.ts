import type { BookmarkStatus } from '@/shared/types/db'

export type AppMessage =
  | { type: 'PING' }
  | { type: 'GET_STATUS' }
  | {
      type: 'SAVE_BOOKMARK'
      payload: { url: string; title: string; favicon?: string }
    }
  | { type: 'UNSAVE_BOOKMARK'; payload: { url: string } }
  | { type: 'GET_BOOKMARK_STATUS'; payload: { url: string } }
  | { type: 'PROCESSING_STATUS'; payload: { bookmarkId: number } }
  | {
      type: 'SAVE_SETTINGS'
      payload: {
        provider: 'openai' | 'anthropic' | 'ollama'
        apiKey?: string
        ollamaBaseUrl?: string
        action?: 'clear'
      }
    }
  | { type: 'GET_SETTINGS' }
  | {
      type: 'VALIDATE_API_KEY'
      payload: {
        provider: 'openai' | 'anthropic' | 'ollama'
        apiKey?: string
        ollamaBaseUrl?: string
      }
    }

export type AppResponse<T extends AppMessage> = T extends { type: 'PING' }
  ? { alive: boolean }
  : T extends { type: 'GET_STATUS' }
    ? { version: string }
    : T extends { type: 'SAVE_BOOKMARK' }
      ? { bookmarkId: number; alreadyExists: boolean }
      : T extends { type: 'UNSAVE_BOOKMARK' }
        ? { bookmarkId: number; alreadyExists: boolean }
        : T extends { type: 'GET_BOOKMARK_STATUS' }
          ? { bookmarkId: number; alreadyExists: boolean } | undefined
          : T extends { type: 'PROCESSING_STATUS' }
            ? { status: BookmarkStatus }
            : T extends { type: 'SAVE_SETTINGS' }
              ? { success: boolean }
              : T extends { type: 'GET_SETTINGS' }
                ? { provider: string; hasApiKey: boolean; ollamaBaseUrl: string }
                : T extends { type: 'VALIDATE_API_KEY' }
                  ? { valid: boolean; error?: string }
                  : never
