type AiLikeError = {
  statusCode?: number;
  message?: string;
  responseBody?: unknown;
};

export function buildAiErrorResponse(error: unknown, fallback: string) {
  const defaultResponse = { status: 500, message: fallback };

  if (!error || typeof error !== 'object') {
    return defaultResponse;
  }

  const { statusCode, message, responseBody } = error as AiLikeError;
  const parsedBody = parseResponseBody(responseBody);

  if (parsedBody?.error && typeof parsedBody.error === 'string') {
    if (parsedBody.error.includes('model') && parsedBody.error.includes('not found')) {
      return {
        status: 400,
        message:
          'Selected AI model is unavailable on the provider. Choose another model or ensure it is installed.',
      };
    }

    return {
      status: statusCode ?? 500,
      message: parsedBody.error,
    };
  }

  if (typeof message === 'string' && message.length) {
    return { status: statusCode ?? 500, message };
  }

  return defaultResponse;
}

function parseResponseBody(body: unknown) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  if (body && typeof body === 'object') {
    return body;
  }
  return null;
}

