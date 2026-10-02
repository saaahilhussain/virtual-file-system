# Storage reliability

Implemented September 2026. Webhook ordering and observability are separate work.

## What was wrong before this change

- Account creation used MongoDB transactions, but upload completion did not.
  It saved `uploadCompletedAt` before updating each ancestor. If a later update
  failed, retrying completion returned success without repairing the totals.
  Concurrent read-modify-save operations could also lose size increments.
- Initiation checked the root directory's size without reserving space. Two
  80-byte requests could both pass with only 100 bytes available.
- Cancellation and size-mismatch handling swallowed S3 deletion errors. Once
  metadata was removed, the application had no durable record of the object key.
- Permanent file deletion removed metadata before S3 deletion; directory
  deletion reduced ancestor usage before S3 deletion. Failures could leave
  orphaned objects or incorrect counters. Bulk S3 responses were not checked for
  per-object errors and requests were not split at the 1,000-object limit.
- Pending uploads had no expiry sweep. A browser closing after initiation could
  leave metadata, and possibly an S3 object, indefinitely.
- No reconciliation task could rebuild directory totals from file records.

## Transaction and quota model

`withStorageTransaction` starts a MongoDB transaction and increments the user's
existing `__v` field before reading storage state. All storage writers use this
same account-level write. Concurrent operations conflict and the driver retries
the entire transaction against a fresh snapshot. Accounts remain independent.
This needs a MongoDB replica set, already required by account creation.

Pending, non-trashed file records are the quota reservations. Initiation sums
non-trashed file sizes, including pending uploads, and inserts a new reservation
in the same transaction. This also accounts for legacy pending records without
a backfill. The presigned PUT signs Content-Length, binding uploads to the
reserved size. Browser uploads supply that header automatically from the File.
The S3 client uses `requestChecksumCalculation: "WHEN_REQUIRED"` so presigning
does not attach a checksum computed from an absent/empty server-side body.
Required checksums for operations such as bulk deletion remain enabled.

Completion verifies S3 metadata outside the database transaction, then re-reads
the file under the account write fence. It commits the completion flag and all
ancestor increments together. Duplicate completion returns success without an
additional increment. Cancellation, trash, restore, permanent deletion, directory
creation and recursive mutations participate in the same transaction protocol.
Restores check quota, including outstanding reservations. A billing downgrade
is checked again at completion.

The existing product policy is preserved: trashed files do not consume the
active quota, even though their S3 objects still occupy physical storage.
Folder restoration retains the existing behavior of restoring the whole subtree.
Directory sizes now describe active, visible completed files; trashed subtrees
have zero active size and their totals are rebuilt when restored.

## Cleanup and recovery

Metadata deletion and insertion of a `StorageCleanup` record commit together.
The record's primary key is the S3 object key. Deletion endpoints report
`cleanupPending: true`: metadata is gone, but physical deletion is asynchronous.
No S3 operation runs inside a retryable MongoDB transaction.

The maintenance loop starts with the server and runs another pass 60 seconds
after the previous pass finishes. Each pass:

1. Expires up to 100 pending uploads older than 24 hours, transactionally releasing
   reservations and saving cleanup records. It rechecks state so a completion
   that won the race is not deleted.
2. Claims up to 100 due deletion records with five-minute leases and unique lease
   tokens. Another worker cannot acknowledge a job it no longer owns. Process
   crashes recover through lease expiry.
3. Deletes S3 keys in batches, checks each key's acknowledgement, and retries
   request failures, per-object errors and missing acknowledgements. Retry delay
   grows exponentially to a one-hour cap; failure records are never discarded.
4. Reconciles up to ten accounts in key order, continuing from a cursor on the
   next pass. It rebuilds directory sizes from completed, non-trashed files under
   the same account transaction used by uploads. Cycles and orphaned file parents
   cause an explicit error instead of silently dropping usage.

Successful cleanup records remain as tombstones and are scheduled for another
delete after 24 hours. Issued PUT URLs cannot be recalled, and a PUT begun before
expiry can finish later. Retaining the key allows a later sweep to remove those
late writes too. Shutdown waits for the active maintenance pass before closing
MongoDB. S3 failures no longer turn an already-committed metadata deletion into
an ambiguous failed HTTP response.

A transient S3 HEAD failure now returns 503 and preserves the reservation; an
object not uploaded yet returns 409. Clients can retry completion or cancel.
Size mismatches and expired completion remove metadata and queue cleanup.

## Operational limits and follow-up work

- Quota admission scans the user's indexed non-trashed file sizes. This avoids
  duplicated counters but is O(number of active/pending files), not O(1).
  Account-level serialization favors correctness over maximum per-account write
  throughput. Reconciliation and recursive changes scan account metadata; very
  large accounts may need bounded background workflows to avoid transaction limits.
- Tombstones are intentionally retained indefinitely. They consume MongoDB space
  and ongoing S3 delete requests; no bounded-retention guarantee is claimed.
  The worker's per-pass budget means a large backlog increases cleanup latency.
- These deletes target object keys. On a versioned S3 bucket they do not purge
  historical versions; version retention needs a separate bucket policy or
  version-aware cleanup. No bucket configuration was changed.
- Objects whose keys were already lost before this implementation cannot be
  recovered from MongoDB. Finding those requires an S3 inventory comparison.
- Reconciliation repairs cached sizes, not missing metadata or directory cycles.
  It does not delete completed files after a plan downgrade.
- The browser offers completion retry while the Drive page stays mounted,
  reusing the existing file ID. Reloads and navigation lose the attempt;
  abandoned uploads eventually expire. See the
  [recorded recovery demo](../../docs/upload-recovery.md).
- Tests use a real in-memory MongoDB replica set and mocked S3. Signing and batch
  construction are tested with the real AWS SDK, but production S3/CORS/IAM and
  bucket versioning still need environment-specific verification.

## References

- [MongoDB atomicity and transactions](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/)
- [S3 multi-object deletion](https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html)
- [S3 presigned upload behavior](https://aws.amazon.com/blogs/compute/uploading-to-amazon-s3-directly-from-a-web-or-mobile-application/)
