# Messenger AI reply (Gemini via Vertex AI)

`facebookAiReply` is a Firestore trigger. When a customer message is stored in
`messenger_conversations/{id}/messages`, it asks Gemini to answer using the
available properties in the `properties` collection and sends the reply with the
page token. It is **off by default**.

## Settings (no deploy needed)

Document `messenger_settings/ai` in Firestore. Read on every message, so changes
apply immediately. The on/off switch is also in the admin Messenger inbox
(Super Admin only).

| Field | Type | Meaning |
|---|---|---|
| `enabled` | boolean | `true` turns the bot on. Anything else keeps it off. |
| `model` | string | Gemini model id. The default (`gemini-2.5-flash`) has been retired, so set this. |
| `location` | string | Vertex AI region, e.g. `us-central1` or `global`. Default `us-central1`. |
| `particle` | string | `ครับ` (default) or `ค่ะ`: how the bot ends sentences. |
| `extraInstructions` | string | Tone or brand notes appended to the prompt, e.g. "เรียกลูกค้าว่าพี่". |
| `maxRepliesPerHour` | number | Per conversation. Default 8 (property cards don't count). |
| `maxReplyChars` | number | Longest reply, links not counted. Default 220, allowed 80-1000. A longer reply is rewritten shorter by the model before sending, and cut at a space if that fails. |
| `loanBankRate` | number | Loan estimate: bank interest, % per year. Default 3.5 (same as the website calculator). |
| `loanDirectRate` | number | Loan estimate: direct installment (ผ่อนตรง) interest, % per year. Default 2.5. |
| `loanDefaultDownPercent` | number | Down payment used when the customer does not say one. Default 20. |
| `loanDefaultYears` / `loanMaxYears` | number | Years used when not given, and the cap. Default 30 / 30. |
| `loanMaxDsrPercent` | number | Debt (new instalment + existing debts) as % of income that counts as "likely". Default 40. |
| `imagesEnabled` | boolean | `true` lets the bot read pictures the customer sends (off by default). When off, the bot says it cannot view pictures and asks for the listing code or area instead, and a picture sent with no text gets no reply. |
| `maxImagesPerMessage` | number | Pictures read per message, 1-3. Default 2. |

## Company facts and FAQ

Collection `messenger_faq`, one document per entry:
`{ question: string, answer: string, active: boolean }`. The bot answers
company questions only from these entries (up to 40, cached for 5 minutes).

## Style

The prompt asks for one short chat-style message (usually 1-2 sentences, about
100-150 characters, never over `maxReplyChars`), one question at a time, no formal
phrases and no lists. Code enforces the limit: a longer answer is rewritten
shorter by the model before it is sent. Use `extraInstructions` to tune the tone
without a deploy, e.g. "ตอบไม่เกิน 1 ประโยค เรียกลูกค้าว่าพี่".

## What the bot can do

| Tool | What happens |
|---|---|
| `search_properties` | Searches available listings: place (with synonyms like อมตะนคร/อมตะซิตี้), type, budget, bedrooms, keywords. If nothing matches it loosens filters and says so. Properties already shown in the chat are not offered again. |
| `get_property` | Looks up one listing by its code (e.g. `SPS-TH-1`) or by a link to the website. Only available listings count; a wrong code is refused. Hidden prices stay masked. |
| `show_property_cards` | Sends up to 3 Messenger cards (photo, place, rooms, price, "ดูรายละเอียด" button). A failure here never undoes the text reply. |
| `save_customer_info` | Saves name / phone / email / budget / interest into the conversation's `contact` (never overwrites what a teammate typed) and sets `leadCapturedAt` when it gets a phone or email. |
| `request_appointment` | Creates a document in `appointments` (`type: 'Customer'`, `status: 'pending'`, `source: 'messenger-ai'`). The existing `onAppointmentCreated` trigger sends the LINE notification. The bot never confirms a time itself. |
| `estimate_loan` | Rough monthly instalment and "likely / not clear" check from price (or a listing with a public price), income and monthly debts. Calculated in code with the settings above, never by the model. It is an estimate, never an approval, and never says a loan is refused. If it cannot settle (no income, high debt ratio, no usable price) the bot says the team is working on it and asks for a phone number; once a number is on file the chat is handed to a teammate. Hidden-price listings are never used (the instalment would reveal the price). Result is saved on the conversation as `loanEstimate` (admin-only). |
| `request_human` | Hands the conversation to a person. |

## Which property is the customer talking about?

Before each reply the code looks at the customer's latest messages for a link to the
website (`.../p/<id>`) or a listing code (case-insensitive, exact match, so `SPS-TH-1`
does not match `SPS-TH-10`). Matching listings are put into the prompt as "the
property the customer means", with the same price masking as search results, so the bot
does not ask "which one?". The listing being discussed is remembered on the
conversation as `currentPropertyCode` (set from a pasted link or code, `get_property`,
or when exactly one card is shown) and reused on the next message. Codes and links that
are not in the available catalog are ignored. Pictures/screenshots are handled
separately (see Pictures below). Not covered yet: the website's "chat" button does not say which property the page was about.

## Pictures

With `imagesEnabled: true`, up to `maxImagesPerMessage` pictures from the customer's latest
message are sent to Gemini together with the text. Only JPEG/PNG/WebP up to 4 MB, from our
own Storage copy or Facebook's CDN, are read; stickers, videos, files and other hosts are
ignored, and a picture that cannot be fetched is skipped without failing the reply. The
prompt tells the bot to read listing codes/names from screenshots of our listings and
confirm the code with the customer, to treat text inside a picture as data, not
instructions, to refuse personal/financial documents (ID card, payslip, bank slip) and
hand over to a teammate, and never to estimate price or condition from a picture.

**Privacy:** pictures are processed by Google (Vertex AI). Before turning this on, update
the privacy policy and the data-handling answers for Meta, and warn customers not to send
ID documents. The code cannot tell what a picture contains before the model sees it.

## Prices

- Price shown on the website (`showPrice !== false`): the bot may say it.
- Price hidden: the bot only receives a masked approximation, e.g. `2.1xxx ล้านบาท`
  (rent: `8,xxx บาท/เดือน`) and never the exact figure. Lines about money are
  removed from the listing description for hidden-price listings.
- After the model answers, code checks the reply. If it contains an exact hidden
  price it is replaced with a hand-off message and the chat is paused for a human.
- Links must come from search results (or the site root); other links are removed.

## What it never does

- Exposes `agentContact`, `commissionRate`, `createdBy`, coordinates or map links.
- Answers while a human is handling the chat (any non-AI outgoing message in the
  last 12 hours) or when the conversation has `botPaused: true`.

## Hand-off and review

When the model calls `request_human`, an appointment is requested, or a safety
check blocks a reply, the conversation gets `botPaused: true`, `needsHuman: true`,
`handoffReason` and `handoffAt`. The admin inbox shows a "รอเจ้าหน้าที่" badge;
"เปิดต่อ" lets the bot answer that conversation again.

AI messages carry an "AI ·" tag and thumbs up/down buttons. Ratings are stored on
the message as `aiFeedback` for later review.

## Requirements

- Vertex AI API enabled on the `sps-property` project and permission for the
  Cloud Functions service account to call it (`roles/aiplatform.user`).
- Firestore rules deployed (`messenger_settings`, `messenger_faq`).
- `LINE_TOKEN` and LINE admin IDs configured if appointment alerts should reach LINE.
