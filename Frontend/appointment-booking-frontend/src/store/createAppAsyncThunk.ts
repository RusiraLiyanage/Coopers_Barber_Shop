import {
  createAsyncThunk,
  type AsyncThunkPayloadCreator,
} from '@reduxjs/toolkit';

// RTK's default `miniSerializeError` keeps only name/message/stack/code, which
// strips the prototype and any non-standard fields off a rejected thunk's error
// (e.g. ApiRequestError.statusCode / canExtend). Returning the original Error
// instead lets `.unwrap()` rethrow the real error so callers can keep relying on
// `instanceof ApiRequestError` and its structured fields.
function keepOriginalError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function createAppAsyncThunk<Returned, ThunkArg = void>(
  typePrefix: string,
  payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg>,
) {
  return createAsyncThunk<Returned, ThunkArg>(typePrefix, payloadCreator, {
    serializeError: keepOriginalError,
  });
}
