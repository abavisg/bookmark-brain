export type AppMessage = { type: 'PING' } | { type: 'GET_STATUS' }

export type AppResponse<T extends AppMessage> = T extends { type: 'PING' }
  ? { alive: boolean }
  : T extends { type: 'GET_STATUS' }
    ? { version: string }
    : never
