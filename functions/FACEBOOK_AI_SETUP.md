# Messenger AI reply (Gemini via Vertex AI)

`facebookAiReply` is a Firestore trigger. When a customer message is stored in
`messenger_conversations/{id}/messages`, it asks Gemini to answer using the
available properties in the `properties` collection and sends the reply with the
page token. It is **off by default**.

## Turn it on / off (no deploy needed)

Create or edit the document `messenger_settings/ai` in Firestore:

| Field | Type | Meaning |
|---|---|---|
| `enabled` | boolean | `true` turns the bot on. Anything else keeps it off. |
| `model` | string | Gemini model id. Defaults to `gemini-2.5-flash`; change it if that model is retired. |
| `maxRepliesPerHour` | number | Per conversation. Default 8. |
| `location` | string | Vertex AI region. Default `us-central1`. |

## What it never does

- Reveals a price when `showPrice === false` (same rule as the website).
- Exposes `agentContact`, `commissionRate`, `createdBy`, coordinates or map links.
- Answers while a human is handling the chat (any non-AI outgoing message in the
  last 12 hours) or when the conversation has `botPaused: true`.

## Hand-off

When the model calls `request_human`, the conversation gets `botPaused: true`,
`needsHuman: true`, `handoffReason` and `handoffAt`. Set `botPaused` back to
`false` to let the bot answer that conversation again.

## Requirements

- Vertex AI API enabled on the `sps-property` project and permission for the
  Cloud Functions service account to call it (`roles/aiplatform.user`).
- Firestore rules deployed (`messenger_settings` is read for admins, written by
  super admins only).
- AI-sent messages are stored with `sentBy: 'ai'`.
