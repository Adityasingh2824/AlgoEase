import algosdk from "algosdk";

const BOX_PREFIX = new TextEncoder().encode("esc");
const stringCodec = new algosdk.ABIStringType();

/**
 * Box name for BoxMap escrows — must match contract `key_prefix + task_id.bytes`.
 * ARC4 strings include a 2-byte length prefix; raw UTF-8 alone causes "invalid Box reference".
 */
export function escrowBoxNameBytes(taskId: string): Uint8Array {
  const encodedKey = stringCodec.encode(taskId);
  const name = new Uint8Array(BOX_PREFIX.length + encodedKey.length);
  name.set(BOX_PREFIX);
  name.set(encodedKey, BOX_PREFIX.length);
  return name;
}
