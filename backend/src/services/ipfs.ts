/**
 * IPFS upload via NFT.Storage (or compatible pinning service).
 */

const NFT_STORAGE_API_KEY = process.env.NFT_STORAGE_API_KEY ?? "";
const NFT_STORAGE_URL = "https://api.nft.storage/upload";

/**
 * Upload a file/blob to IPFS and return its CID.
 */
export async function uploadToIPFS(data: Buffer | Uint8Array, _filename?: string): Promise<string> {
  if (!NFT_STORAGE_API_KEY) {
    throw new Error("NFT_STORAGE_API_KEY is not configured");
  }

  const response = await fetch(NFT_STORAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NFT_STORAGE_API_KEY}`,
      "Content-Type": "application/octet-stream",
    },
    body: data as unknown as BodyInit,
  });

  if (!response.ok) {
    throw new Error(`IPFS upload failed: ${response.status} ${await response.text()}`);
  }

  const result = (await response.json()) as { ok: boolean; value: { cid: string } };
  if (!result.ok) {
    throw new Error("IPFS upload response not ok");
  }

  return result.value.cid;
}

/**
 * Build a gateway URL from a CID.
 */
export function ipfsGatewayUrl(cid: string): string {
  const base = (process.env.IPFS_GATEWAY ?? "https://ipfs.io/ipfs").replace(/\/$/, "");
  return `${base}/${cid.replace(/^\/+/, "")}`;
}
