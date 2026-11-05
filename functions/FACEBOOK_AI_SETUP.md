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
| `creditChecklist` | string | What the AI asks for a credit pre-check and which documents customers should prepare. Empty = the company's standard list (`DEFAULT_CREDIT_CHECKLIST`). Edited in the inbox: **คำแนะนำ AI** (Super Admin). |
| `requirePropertyForBot` | boolean | `true` = "property first": the AI answers a chat only when it has a property (set by the team in the inbox, named by the customer with a link or listing code) or house details written by the team. Otherwise it stays silent and the chat gets a "รอเลือกทรัพย์" badge. Switch in the inbox (Super Admin). Default off. |
| `calendarEnabled` | boolean | `true` lets the bot book appointments in Google Calendar (needs `calendarId`). Default off: appointments stay "pending requests" for the team. |
| `calendarId` | string | The Google Calendar to read free/busy from and add events to. |
| `calendarWorkDays` | number[] | Days the team takes appointments, 0 = Sunday. Default `[1,2,3,4,5,6]` (Mon-Sat). |
| `calendarWorkStart` / `calendarWorkEnd` | string | Opening hours, Thai time, `HH:MM`. Default `09:00` / `18:00`. |
| `calendarSlotMinutes` | number | Length of one appointment, 15-240. Default 90. |
| `calendarLeadHours` | number | Minimum notice before an appointment, 0-72. Default 2. |
| `calendarServiceAccount` | string | Service account the function impersonates. Default `<project>@appspot.gserviceaccount.com`. |
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

## Property per chat and "property first"

In the inbox each chat has a **ทรัพย์ที่ลูกค้าสนใจ** bar: pick an available listing by code
(saved as `currentPropertyCode`, with `currentPropertyId`/`currentPropertyTitle`) or clear it.
The AI uses it exactly like a property the customer named. Each chat also has its own
AI on/off button (`botPaused`), and Super Admins have the global AI switch plus the
**ต้องเลือกทรัพย์ก่อน** switch (`requirePropertyForBot`).

Each chat also has a free-text box, **รายละเอียดบ้านให้ AI ใช้ตอบในแชทนี้** (`staffNote`, up to
1500 characters): anything the team wants the AI to know in that chat, such as house details,
offers or a listing that is not in the data. It is put in the prompt as facts from the team
(it overrides the listing data when they disagree). A note counts as having house details
for "property first". The exact hidden price of a listing is still blocked by the reply check.

With "property first" on: a chat without a property gets no AI reply (the model is not
called) and shows **รอเลือกทรัพย์**; the AI cannot be switched on for that chat (the server
refuses with 409) until a property is set. If the customer sends a link or listing code
of an available property, that counts too. A property that is no longer available does not
count. Customer-named properties replace the team's choice (the saved title is dropped).

## Credit pre-check, house pictures, nearby zones

**Credit pre-check.** When a customer asks whether they can get a loan, the AI follows the
checklist (`creditChecklist`, default: the company's own list of questions and the documents to
prepare for a credit-limit check, including spouse documents). It asks one question at a time,
tells the customer which documents to prepare when asked, and never takes documents or ID
numbers in the chat (they go to the team directly). What the customer says is saved with
`save_credit_profile` on the conversation as `creditProfile` (age, occupation, years of work,
income, monthly debts, down payment, wanted loan, past late payments, co-borrower) and shown
read-only in the customer panel. It is what the customer said, not a verified fact, and the AI
never says a loan is approved.

**House pictures.** In each chat the team can attach up to 6 pictures (house plans) in the
details box. When the customer asks to see the plan or more pictures the AI calls
`send_house_images` and up to 4 are sent after its text reply (stored as outgoing messages with
`kind: 'images'`; they do not count against `maxRepliesPerHour`). They are never sent unasked.

**Nearby zones.** If nothing matches the zone the customer asked for, the AI says so and asks
whether nearby zones are fine. Listings from other zones are only searched, and only then shown,
after the customer asks for or agrees to nearby zones (`allowNearbyZones`). The search result
tells the AI whether other zones have matches, but never lists them.

## Houses the team types in (not in the database)

A post can show several houses that are not in the property database. In each chat the team can
add up to 10 houses by hand (**บ้านที่แอดมินกรอกเอง**): type (detached / twin / townhome / condo /
land / other), name, sale or rent, area, bedrooms, bathrooms, price, a price note (e.g. "starting
from"), details, and up to 6 pictures per house (drag several in at once, paste, or click). They are
saved on the conversation as `staffListings` (`images` are managed by the server only).

- The AI is given them as team facts with an `id`; it answers about any of them, never invents
  a web link for them, and calls `send_house_images` with that `id` when the customer asks for the
  plan of that house (one house with pictures needs no id; several do).
- "Allow the AI to tell this price" off: the AI gets only the masked approximation (like a hidden
  catalog price), and an exact number in its reply is blocked and the chat handed to the team.
- They count as house details for "property first".

## Appointments in Google Calendar

With `calendarEnabled: true` and a `calendarId`, the bot checks the calendar before it
offers or confirms a time:

- `check_availability(date)` returns the free start times of that day (Thai time).
- `request_appointment` books only a time that is free, inside opening hours, on a working
  day, on a 30-minute mark, with the minimum notice. It creates the Google event (title,
  customer name and phone, listing code and link; never a price) and an `appointments`
  document with `status: 'confirmed'`, `calendarEventId`, `calendarEventLink`, so the
  existing LINE alert still goes out. The chat is not handed over for a confirmed booking.
- A busy or closed time is refused with other free times to offer; the bot is told never to
  say "booked" unless the result has `confirmed: true`.
- If Google cannot be reached or the event cannot be created, nothing is confirmed: the
  request is saved as a pending appointment for the team (hand-over, as when the calendar is off).
- Two customers asking for the same time at once: a short Firestore hold
  (`appointment_locks/<date>`, 2 minutes) lets only one proceed, and the calendar is checked
  again once the hold is taken. The same booking asked twice returns the same event.
- Only free/busy is read; event details of other appointments are never read.

Not done yet: events moved or deleted in the calendar are not synced back to
`appointments`; no cancelling or rescheduling by the customer; one calendar only; the
website's own appointment form does not use the calendar.

### One-time setup (Google side)

The function has no key file. It impersonates its own service account with the Calendar scope:

1. Enable the **Google Calendar API** and the **IAM Service Account Credentials API** in the project.
2. Give the service account (`<project>@appspot.gserviceaccount.com`, check IAM) the role
   **Service Account Token Creator** on itself:
   `gcloud iam service-accounts add-iam-policy-binding SA --member="serviceAccount:SA" --role="roles/iam.serviceAccountTokenCreator"`
3. In Google Calendar, share the calendar with that service account email with
   **Make changes to events**, and copy the **Calendar ID** (Settings and sharing > Integrate calendar).
4. Set `calendarId` and `calendarEnabled: true` in `messenger_settings/ai`.

A personal Gmail calendar works, but a service account cannot invite attendees or add Meet
links to it (that needs Google Workspace domain-wide delegation).

## Seeing what the AI knew, and testing a chat again

- Every AI text message stores `aiContext` (properties it had, number of typed-in houses, whether
  a team note existed, pictures, tools it called). The inbox shows it under the AI message
  ("AI รู้: ทรัพย์ ... · บ้านที่กรอก 2 หลัง"), or "AI ไม่มีข้อมูลบ้านของแชทนี้ตอนตอบ" when it had
  none. A message without the line was answered by an older deployment of `facebookAiReply`.
- **เริ่มทดสอบใหม่** (Super Admin, per chat) sets `contextResetAt`: the AI no longer sees earlier
  messages (they stay visible in the inbox), shown cards, current property, loan/credit notes and
  hand-over are cleared, and the AI is switched back on for that chat. Houses, notes, pictures
  and contact details entered by the team are kept. Use it on test chats, not real customers.

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
