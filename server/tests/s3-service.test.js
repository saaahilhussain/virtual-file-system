import { afterEach, expect, it, vi } from "vitest";

const { s3Client } = await import("../config/s3Client.js");
const { createSignedUploadUrl, deleteS3Files } = await vi.importActual(
  "../services/s3Service.js",
);

afterEach(() => vi.restoreAllMocks());

it("binds the presigned PUT to the reserved byte length", async () => {
  const url = new URL(
    await createSignedUploadUrl({
      Key: "test.bin",
      ContentType: "application/octet-stream",
      ContentLength: 80,
    }),
  );
  const headers = url.searchParams.get("X-Amz-SignedHeaders").split(";");
  expect(headers).toContain("content-length");
  expect(url.searchParams.has("x-amz-checksum-crc32")).toBe(false);
  expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
});

it("splits S3 deletion into batches of at most 1000 and preserves per-key failures", async () => {
  const keys = Array.from({ length: 1001 }, (_, index) => ({
    Key: `key-${index}`,
  }));
  const send = vi
    .spyOn(s3Client, "send")
    .mockResolvedValueOnce({ Deleted: keys.slice(0, 1000) })
    .mockResolvedValueOnce({
      Errors: [{ Key: "key-1000", Code: "AccessDenied" }],
    });
  const result = await deleteS3Files(keys);
  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls[0][0].input.Delete.Objects).toHaveLength(1000);
  expect(send.mock.calls[1][0].input.Delete.Objects).toHaveLength(1);
  expect(result.Deleted).toHaveLength(1000);
  expect(result.Errors).toEqual([{ Key: "key-1000", Code: "AccessDenied" }]);
});

it("does not issue an empty S3 delete request", async () => {
  const send = vi.spyOn(s3Client, "send");
  expect(await deleteS3Files([])).toEqual({ Deleted: [], Errors: [] });
  expect(send).not.toHaveBeenCalled();
});
