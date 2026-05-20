import algosdk from "algosdk";

/** Compare two Algorand addresses by public key (case/format safe). */
export function sameAlgorandAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  try {
    const da = algosdk.decodeAddress(a.trim());
    const db = algosdk.decodeAddress(b.trim());
    if (da.publicKey.length !== db.publicKey.length) return false;
    for (let i = 0; i < da.publicKey.length; i++) {
      if (da.publicKey[i] !== db.publicKey[i]) return false;
    }
    return true;
  } catch {
    return a.trim() === b.trim();
  }
}
