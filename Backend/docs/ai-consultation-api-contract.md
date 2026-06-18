# AI Consultation API Contract

## Submit Consultation

Use the same payload for:

- `POST /consultation/submit`
- `POST /consultation/submit/stream`

```json
{
  "serviceId": "0f70d4ad-29ab-45a4-b0d5-914dd4559777",
  "answers": [
    {
      "questionId": "desired-look",
      "answer": "Natural brown colour with a soft finish."
    },
    {
      "questionId": "additional-comments",
      "answer": "I used box dye about 6 months ago."
    }
  ],
  "hairPhoto": {
    "mediaType": "image/jpeg",
    "data": "base64-without-data-url-prefix"
  }
}
```

`hairPhoto` is optional. Additional customer comments should be sent as another `answers` item, not as a separate top-level field.

Supported photo media types:

- `image/jpeg`
- `image/png`
- `image/webp`

For streaming submit, the final `result` event contains the same response shape as the non-streaming endpoint.

## Result Generation Metadata

Consultation submit responses include generation metadata so QA and operations can tell whether the recommendation came from Claude or the deterministic fallback:

```json
{
  "generation": {
    "source": "claude",
    "model": "claude-opus-4-8"
  }
}
```

Fallback responses use:

```json
{
  "generation": {
    "source": "fallback",
    "model": null
  }
}
```

When the customer books an appointment, the booking frontend sends this metadata with the appointment payload. `booking-api` stores it on the generated appointment brief so the admin platform can show whether the barber prep brief was Claude-generated or fallback-generated.

The appointment create payload fields are:

```json
{
  "consultationGenerationSource": "claude",
  "consultationGenerationModel": "claude-haiku-4-5"
}
```

`consultationGenerationModel` should be omitted or `null` for fallback-generated results.

## Live Claude Environment

`ANTHROPIC_API_KEY` must be supplied server-side to `booking-api`; never expose it to either frontend. `ANTHROPIC_MODEL` is optional and defaults to `claude-haiku-4-5`.

For local live-Claude QA:

```sh
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_MODEL="claude-haiku-4-5"
pnpm --dir Backend --filter @coopers/booking.api dev
```

If `ANTHROPIC_API_KEY` is missing or Claude returns an invalid tool result, the service logs the failure and uses the deterministic fallback so booking can continue.
