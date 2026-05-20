import algosdk from "algosdk";

const BOX_PREFIX = new TextEncoder().encode("esc");
const stringCodec = new algosdk.ABIStringType();

/** Box name for BoxMap escrows — `key_prefix` + ARC4-encoded task_id. */
export function escrowBoxNameBytes(taskId: string): Uint8Array {
  const encodedKey = stringCodec.encode(taskId);
  const name = new Uint8Array(BOX_PREFIX.length + encodedKey.length);
  name.set(BOX_PREFIX);
  name.set(encodedKey, BOX_PREFIX.length);
  return name;
}
