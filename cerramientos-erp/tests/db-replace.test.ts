import { test } from "node:test";
import assert from "node:assert/strict";
import { replaceFile } from "../src/lib/db";

function fsError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(code), { code });
}

const noSleep = async () => {};

test("replaceFile retries a rename that Windows blocks for a moment", async () => {
  const calls: string[] = [];
  let failures = 2;
  const ops = {
    rename: async () => {
      calls.push("rename");
      if (failures-- > 0) throw fsError("EPERM");
    },
    copyFile: async () => {
      calls.push("copy");
    },
    unlink: async () => {
      calls.push("unlink");
    },
  };
  await replaceFile("a.tmp", "a", ops as never, noSleep);
  assert.deepEqual(calls, ["rename", "rename", "rename"]);
});

test("replaceFile falls back to copying when the rename never succeeds", async () => {
  const calls: string[] = [];
  const ops = {
    rename: async () => {
      calls.push("rename");
      throw fsError("EBUSY");
    },
    copyFile: async () => {
      calls.push("copy");
    },
    unlink: async () => {
      calls.push("unlink");
    },
  };
  await replaceFile("a.tmp", "a", ops as never, noSleep);
  assert.equal(calls.filter((c) => c === "rename").length, 9);
  assert.deepEqual(calls.slice(-2), ["copy", "unlink"]);
});

test("replaceFile does not hide real errors", async () => {
  const ops = {
    rename: async () => {
      throw fsError("ENOSPC");
    },
    copyFile: async () => {},
    unlink: async () => {},
  };
  await assert.rejects(replaceFile("a.tmp", "a", ops as never, noSleep), /ENOSPC/);
});
