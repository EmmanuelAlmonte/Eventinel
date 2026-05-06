import {
  BlossomTransportFailure,
  type BlossomUploadCancelledError,
  type BlossomUploadError,
  type BlossomUploadNetworkError,
  type BlossomUploadServerRejectedError,
  type BlossomUploadTimeoutError,
  type BlossomUploadRetryExhaustedError,
} from './blossomUploadTypes';

export function retryExhaustedError(
  attempts: number,
  lastError: BlossomUploadNetworkError | BlossomUploadTimeoutError | BlossomUploadServerRejectedError
): BlossomUploadRetryExhaustedError {
  return {
    type: 'retry-exhausted',
    attempts,
    lastError,
    message: `Blossom upload failed after ${attempts} attempts: ${lastError.message}`,
    retryable: false,
  };
}

export function isRetryableUploadError(
  error: BlossomUploadError
): error is BlossomUploadNetworkError | BlossomUploadTimeoutError | BlossomUploadServerRejectedError {
  return error.retryable === true;
}

export function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

export function transportErrorFromUnknown(error: unknown, signal?: AbortSignal): BlossomUploadError {
  if (signal?.aborted) return cancelledError();
  if (error instanceof BlossomTransportFailure) {
    if (error.failureType === 'cancelled') return cancelledError();
    if (error.failureType === 'timeout') {
      return {
        type: 'timeout',
        message: error.message || 'Blossom upload timed out.',
        retryable: true,
      };
    }
    return networkError(error.message || 'Blossom upload failed due to a network error.');
  }

  return networkError(messageFromUnknown(error, 'Blossom upload failed due to a network error.'));
}

export function networkError(message: string): BlossomUploadNetworkError {
  return {
    type: 'network',
    message,
    retryable: true,
  };
}

export function cancelledError(): BlossomUploadCancelledError {
  return {
    type: 'cancelled',
    message: 'Blossom upload was cancelled.',
    retryable: false,
  };
}

export function messageFromUnknown(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
