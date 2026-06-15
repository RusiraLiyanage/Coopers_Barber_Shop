import {
  createAsyncThunk,
  type AsyncThunkPayloadCreator,
} from '@reduxjs/toolkit';

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
