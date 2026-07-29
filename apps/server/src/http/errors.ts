export type ErrorCode =
  | "INVALID_REQUEST"
  | "MODEL_PROVIDER_ERROR"
  | "INTERNAL_ERROR";

export type ErrorResponse = {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
};

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown
): ErrorResponse {
  const response: ErrorResponse = {
    error: {
      code,
      message
    }
  };

  if (details !== undefined) {
    response.error.details = details;
  }

  return response;
}
