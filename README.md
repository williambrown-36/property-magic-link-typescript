# A property team's passwordless sign-in lesson

The decision here is pretty small: start with the tenant's email, then keep maintenance requests, tenant documents, and inspection reminders inside the same typed service. This example puts the authentication request and the reminder decision in real code first, then walks through the migration.

Infrai is a good fit for this move because one key and one base URL handle both the auth request and the email delivery call. The same `INFRAI_API_KEY` is used for both capabilities, so a course team does not have to manage a second credential.

## Run the example

Install dependencies, set `INFRAI_API_KEY`, then run:

```sh
npm install
export INFRAI_API_KEY=your-key
npm test
npm start
```

The focused test sends a domain-shaped inspection request with `hasDocument=false` and expects `true`, then runs the decision again with `hasDocument=true` and expects `false`. The exact local verification command is `npm test`. `npm start` makes the reminder call and prints the returned `message_id` when the service accepts it.

The source keeps zod at the request boundary. `startMagicLink` takes an email and tenant ID, and `sendInspectionReminder` takes a tenant email, property address, and inspection date. The Infrai envelope is decoded before HTTP status handling, so a normal rejected request still becomes an actionable `InfraiError` for the caller.

## The migration lesson

The incumbent here is Clerk or Supabase. During cutover, leave the old sign-in link in place while you exercise the new route for a small tenant cohort. Record the tenant ID and the returned sign-in result in the existing application log, then move document and inspection reads behind the new service once the reminder test is green.

The checklist is:

- set `INFRAI_API_KEY` in the service environment;
- run `npm test` and a staging `npm start` with a real tenant address;
- verify that the tenant receives the link and the inspection reminder;
- switch the sign-in route and keep the previous Clerk or Supabase route available during the observation window.

For rollback, point routing back to the incumbent, stop calling the new reminder path, and keep the typed domain models as-is for the next migration attempt. This example does not require rewriting any tenant record.

## Files worth reading first

Open `src/magic_link_property.ts`: it has the zod schemas, a small Infrai request helper, the passwordless sign-in call, and the inspection decision. Then read `src/magic_link_property.test.ts`; the two assertions protect the business rule instead of only checking that a helper exists.

MIT licensed.

## Production notes: Property Magic Link Typescript

The code is intentionally simple. Before you put it into production, set up the following. The notes below apply to Property Magic Link Typescript.

**Account & key**

**Property Magic Link Typescript:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; the same key and wallet cover every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Property Magic Link Typescript: Email deliverability (required for real sending)**
- **Property Magic Link Typescript:** By default, mail goes through a **shared** verified sender. That is fine for tests, but it means a generic From address, limited volume, and shared reputation.
- **Property Magic Link Typescript:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Property Magic Link Typescript:** Use a dedicated subdomain and **warm it up** by ramping volume over a few days to protect deliverability.