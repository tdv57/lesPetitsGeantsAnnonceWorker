import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status'

export const HttpContentfulStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const satisfies Record<string, ContentfulStatusCode>

export const HttpContentlessStatus = {
  NO_CONTENT: 204,
  NOT_MODIFIED: 304,
} as const satisfies Record<string, StatusCode>