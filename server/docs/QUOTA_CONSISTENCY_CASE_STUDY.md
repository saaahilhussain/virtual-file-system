# Case study: keeping concurrent uploads within quota

File Shelter accepts direct browser uploads to S3 while keeping account quotas
and folder sizes in MongoDB. The consistency problem is deciding whether bytes
may be uploaded when several requests arrive before any upload completes.
This case study describes the implementation already present in the backend,
with executable evidence and its operational limits.

## The race

Suppose an account has 100 bytes of available quota. Two tabs each initiate an
80-byte upload. A check against completed root-folder usage allows both requests
to observe zero used bytes and accept 80. After both complete, the account has
160 bytes of active files despite its 100-byte limit.

Checking pending files alone also leaves a race: both requests can read the
same snapshot before either inserts its pending record. The quota check and
reservation need to commit together, with overlapping account writes forced
to conflict.

## The implemented admission rule

For initiation, the backend enforces:

```text
sum(size of this account's non-trashed files, including pending uploads)
  + requested size
  <= account.maxStorageInBytes
```

Pending `File` records are the reservations. This uses the file records as the
source of truth and accounts for older pending records without a separate
reservation-counter backfill. Folder sizes remain a display total of visible,
completed files; they are not used as the admission authority.

[`withAccountTransaction`](../services/accountTransactionService.js) starts a
MongoDB transaction and increments the user's existing `__v` field before
running the storage callback. Every participating storage writer and billing
quota update touches that same account document. Concurrent writes to one
account conflict; the transaction driver retries against a fresh snapshot.
Different accounts touch different documents.

In [`uploadInitiate`](../controllers/fileController.js), the transaction verifies
live ancestors, invokes [`assertQuota`](../services/storageService.js), and inserts
the pending file. The signed URL is returned only after the reservation commits.
Signing happens outside the transaction and binds the PUT to the reserved
Content-Length. In the example, one request commits 80 reserved bytes. The
other retries, sees those bytes, and returns HTTP 429. No second reservation is
created, although the folder's completed size still reads zero.

## Completion, rollback and recovery

S3 and MongoDB do not share a transaction. Completion first checks the object's
metadata in S3, then enters the account transaction and re-reads the file. It
validates expiry, size, parent visibility and the current quota, and commits
`uploadCompletedAt` with all ancestor increments. If an ancestor update fails,
both the completion flag and earlier increments roll back. An already-completed
file returns success without incrementing again.

S3 verification calls stay outside retryable MongoDB callbacks, preventing a
transaction retry from repeating a remote side effect. HTTP 503 on transient
verification failure preserves the reservation. The browser's **Retry completion**
action resends the same file ID; the file does not need another PUT. It also
recovers when the completion committed but its HTTP response was lost.

Cancellation or expiry removes pending metadata and saves an S3 cleanup record
in one transaction. Quota becomes available when that transaction commits;
physical deletion occurs later through leased jobs and retries. Completed-file
trash and restore also participate in the account transaction. Restore checks
quota including outstanding reservations.

## Evidence to run

From `server/`:

```bash
npm test -- tests/storage-and-sharing.integration.test.js
```

The [integration suite](../tests/storage-and-sharing.integration.test.js) uses
a real in-memory MongoDB replica set with mocked S3 responses. Its scenarios
assert:

| Scenario | Observable result |
| --- | --- |
| Two 80-byte initiations under a 100-byte quota | Statuses `[201, 429]`, one file row, completed folder size zero |
| Cancel the winning reservation twice, then initiate 100 bytes | Cancellation is idempotent; the new reservation succeeds |
| Four concurrent completions of one 80-byte file | All return success; the root size is 80 |
| Two distinct nested files complete concurrently | Both parent and root totals contain both files |
| Failure after an earlier ancestor update | Completion flag and all counters roll back; later retry succeeds |
| Transient S3 metadata failure | HTTP 503, pending file retained, no cleanup queued; another upload cannot consume its reserved bytes |
| Cancellation races completion | Either completion wins, or cancellation wins and completion cannot resurrect the file |

The [browser demonstration](../../docs/upload-recovery.md) and
[frontend tests](../../client/src/tests/directory-flows.test.jsx) exercise the
client acknowledgement/retry behavior separately. Provider mocks make those
failures reproducible; they do not establish live S3/CORS/IAM correctness.

## Tradeoffs and limits

Quota admission scans indexed active/pending file records, making it O(number
of records), rather than maintaining a second mutable byte counter. Account
serialization favors correctness over peak write throughput for one account.
Large-account reconciliation and recursive mutations can approach transaction
limits and need future batching work.

The rule governs admission, restore and completion. A billing downgrade can
leave existing files above the new quota; the backend does not delete completed
files to enforce a new lower limit. Trashed files are outside active quota but
still occupy S3 storage. Cleanup is eventual, and retained tombstones add ongoing
MongoDB space and S3 deletion costs. Versioned buckets need their own historical
version-retention policy.

The implementation requires a MongoDB replica set and all future storage writers
to follow the shared account transaction protocol. The useful guarantee is
precise: competing admitted uploads cannot spend the same remaining quota, and
successful completion retries cannot count the same file twice.
