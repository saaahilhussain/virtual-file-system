# Billing event and quota consistency

Implemented September 2026. The webhook still verifies the exact raw request
bytes before parsing JSON. Supported subscription notifications require
`x-razorpay-event-id`, a subscription ID and the top-level event `created_at`.
Unrelated event types are acknowledged without changing billing state.

## Delivery and ordering

Razorpay can deliver an event more than once and can deliver events out of order.
The event timestamp has second precision; it is not a unique ordering key.
The subscription's own `created_at` is its creation time, not a state version.

The handler treats each supported event as a notification to fetch current
subscription state from Razorpay. It does not apply the potentially stale
subscription object embedded in the webhook. `lastEventCreatedAt` retains the
largest observed event timestamp for diagnosis, not for deciding state ordering.

Before fetching, it captures the subscription's local `billingRevision`. Inside
the transaction it checks that revision again. If another request has committed
since the fetch began, it aborts and refetches, up to four attempts. Retrying only
the MongoDB writes would incorrectly reuse the old external response.
Terminal subscriptions are never revived by a contradictory provider read.

## Atomic updates and replay

Billing and storage share `withAccountTransaction`, which writes the account's
existing `__v` field and uses a MongoDB snapshot transaction with majority write
concern. Storage keeps the `withStorageTransaction` export as an alias.

The following either all commit or all roll back:

- Subscription status, plan, billing revision and entitlement history.
- The user's storage quota.
- The processed event record in `BillingEvent`.

The event ID is the ledger document's unique primary key. Replays return success
without reapplying state, and completed replays skip the provider call. Concurrent
duplicates are checked again inside the transaction. A SHA-256 payload hash
detects reuse of an event ID with different content; that returns 409. The ledger
stores no raw payment payload and has no TTL.

Provider failures and unknown local subscriptions return 503 without recording
the event as processed. This lets Razorpay retry if an event beats local
registration or a dependency temporarily fails. Malformed requests return 400.
Unknown paid plans fail closed instead of silently assigning an incorrect quota.
The SDK's Axios transport has a four-second timeout; no remote mutation is
automatically retried by this change.

## Which subscription owns quota

Plans are not additive. The newest locally registered subscription that
established access controls quota, ordered by `createdAt` with `_id` as a stable
tiebreaker. Its `hasEntitlement` marker remains set after termination. That stops
an old subscription from changing quota after a replacement begins or ends.

`active` establishes access. Paused/pending/halted states retain previously
established access; paid-cycle history from the provider can recover missed
activation. Created or merely authenticated checkouts do not displace a paid
plan. An unpaid pending checkout does not gain paid quota. Cancellation,
completion and expiry of the controlling subscription reduce quota to the free
tier. Scheduled cancellation retains access while the provider still reports an
active subscription.

Existing records without `hasEntitlement` are fetched from the provider during
the account's first synchronization, in batches of up to four requests. Their
state and entitlement history are initialized in the same transaction. Provider
`paid_count` distinguishes a previously paid terminal subscription from a never-
paid cancelled checkout. This avoids guessing precedence from old terminal
status alone. The first synchronization can therefore make extra API calls.

Pause, resume and cancel endpoints also synchronize current provider state
through this service. A delayed action response cannot directly overwrite a
newer webhook update. Immediate cancellation updates status and quota together
without waiting for its webhook. Scheduled plan changes continue to leave the
current plan in place until Razorpay reports the change taking effect.

## Deployment and limits

- Startup initializes the new ledger collection/index before listening. New
  subscription fields have defaults; existing strict user validators need no
  change. MongoDB must support transactions, as required by the storage service.
- Enable the relevant subscription events in Razorpay, including
  `subscription.activated`, charged, updated and terminal events. No live dashboard
  configuration was changed by this implementation.
- Processing depends on the provider's current-state API. Sustained outages,
  missing local subscription registrations or an unconfigured plan require
  operational attention. Razorpay retries failed deliveries for a limited period
  and can disable a persistently failing webhook. Fix the cause and request a
  replay/re-enable delivery when necessary; there is no autonomous billing inbox
  worker or periodic provider reconciliation in this change.
- A fresh provider read is not a distributed transaction with Razorpay. A later
  remote change converges through the next notification/action synchronization.
  The local revision protects against overlapping local synchronizations; it is
  not a provider-issued state version.
- Subscription creation's remote API call and local registration remain separate
  operations. Exactly-once checkout creation, concurrent creation admission and
  recovery of orphaned remote checkouts are separate work. No such guarantee is
  claimed by the webhook deduplication ledger.
- Test coverage uses a real in-memory MongoDB replica set and mocked Razorpay
  responses, including gated concurrent responses and injected transaction
  failures. No real subscription was charged, changed or cancelled during tests.

## References

- [Razorpay webhook delivery and ordering](https://razorpay.com/docs/webhooks/best-practices/)
- [Razorpay signature validation and event IDs](https://razorpay.com/docs/webhooks/validate-test/)
- [Subscription event payloads](https://razorpay.com/docs/webhooks/subscriptions/)
