export interface ApiErrorPayload {
  error?: string;
  message?: string;
  issues?: unknown;
}

export interface ApiResponseBody {
  response: Response;
  text: string;
}
