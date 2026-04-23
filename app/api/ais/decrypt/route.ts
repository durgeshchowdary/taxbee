import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import zlib from "node:zlib";

const MAX_ENCRYPTED_AIS_CHARS = 2_000_000;

const looksLikeEncryptedAisUtilityJson = (text: string) =>
  /^[a-f0-9]{64}[A-Za-z0-9+/=]+$/i.test(text.replace(/\s/g, ""));

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest();

const uniqueStrings = (values: string[]) => [...new Set(values.filter(Boolean))];
const uniqueBuffers = (values: Buffer[]) =>
  values.filter(
    (value, index, list) =>
      value.length > 0 && list.findIndex((candidate) => bufferKey(candidate) === bufferKey(value)) === index
  );

const buildDateCandidates = (value: string) => {
  const trimmed = value.trim();
  const compact = trimmed.replace(/\D/g, "");
  const candidates = [trimmed, trimmed.toLowerCase(), trimmed.toUpperCase(), compact];

  const delimitedDate = trimmed.match(/^(\d{1,2})\D+(\d{1,2})\D+(\d{4})$/);
  if (delimitedDate) {
    const [, day, month, year] = delimitedDate;
    const dd = day.padStart(2, "0");
    const mm = month.padStart(2, "0");
    candidates.push(`${dd}${mm}${year}`);
    candidates.push(`${dd}-${mm}-${year}`);
    candidates.push(`${dd}/${mm}/${year}`);
    candidates.push(`${year}${mm}${dd}`);
    candidates.push(`${year}-${mm}-${dd}`);
    candidates.push(`${year}/${mm}/${dd}`);
  }

  const isoDate = trimmed.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})$/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    const dd = day.padStart(2, "0");
    const mm = month.padStart(2, "0");
    candidates.push(`${dd}${mm}${year}`);
    candidates.push(`${dd}-${mm}-${year}`);
    candidates.push(`${dd}/${mm}/${year}`);
    candidates.push(`${year}${mm}${dd}`);
    candidates.push(`${year}-${mm}-${dd}`);
    candidates.push(`${year}/${mm}/${dd}`);
  }

  if (compact.length === 8) {
    candidates.push(compact);
    const first = compact.slice(0, 2);
    const second = compact.slice(2, 4);
    const year = compact.slice(4, 8);
    candidates.push(`${first}-${second}-${year}`);
    candidates.push(`${first}/${second}/${year}`);
    candidates.push(`${year}${second}${first}`);
    candidates.push(`${year}-${second}-${first}`);
    candidates.push(`${year}/${second}/${first}`);
  }

  return uniqueStrings(candidates);
};

const buildPasswordCandidates = (password: string, pan?: string) => {
  const trimmed = password.trim();
  const compactPassword = trimmed.replace(/\s/g, "");
  const passwordCandidates = uniqueStrings([
    password,
    trimmed,
    trimmed.toUpperCase(),
    trimmed.toLowerCase(),
    compactPassword,
    compactPassword.toUpperCase(),
    compactPassword.toLowerCase(),
    ...buildDateCandidates(trimmed),
  ]);

  const panCompact = String(pan || "")
    .trim()
    .replace(/\s/g, "");
  if (!panCompact) return passwordCandidates;

  const panCandidates = uniqueStrings([panCompact, panCompact.toUpperCase(), panCompact.toLowerCase()]);
  const dateCandidates = buildDateCandidates(trimmed);
  const combined = [...passwordCandidates];

  for (const panValue of panCandidates) {
    for (const passwordValue of passwordCandidates) {
      combined.push(`${panValue}${passwordValue}`);
      combined.push(`${passwordValue}${panValue}`);
    }

    for (const dateValue of dateCandidates) {
      combined.push(`${panValue}${dateValue}`);
      combined.push(`${panValue}-${dateValue}`);
      combined.push(`${panValue}/${dateValue}`);
      combined.push(`${panValue}_${dateValue}`);
    }
  }

  return uniqueStrings(combined);
};

const bufferKey = (buffer: Buffer) => buffer.toString("hex");

const getPasswordKeyMaterials = (password: string, expectedHash: string, pan?: string) => {
  const candidates = buildPasswordCandidates(password, pan);
  const exactMatches: Buffer[] = [];
  const fallbackKeys: Buffer[] = [];
  const expectedHashBytes = Buffer.from(expectedHash, "hex");
  const pbkdf2Salts = [expectedHashBytes, expectedHashBytes.subarray(0, 16), expectedHashBytes.subarray(16, 32)];

  for (const [index, candidate] of candidates.entries()) {
    const candidateBytes = Buffer.from(candidate, "utf8");
    const hash = sha256(candidate);
    if (hash.toString("hex") === expectedHash) {
      exactMatches.push(hash);
    } else {
      fallbackKeys.push(hash);
    }

    for (const length of [16, 24, 32]) {
      if (candidateBytes.length >= length) {
        fallbackKeys.push(candidateBytes.subarray(0, length));
      }
    }

    if (index < 20) {
      for (const salt of pbkdf2Salts) {
        for (const iterations of [1, 1000, 1024, 10000]) {
          fallbackKeys.push(crypto.pbkdf2Sync(candidate, salt, iterations, 32, "sha256"));
          fallbackKeys.push(crypto.pbkdf2Sync(candidate, salt, iterations, 32, "sha1"));
        }
      }
    }
  }

  return uniqueBuffers([...exactMatches, ...fallbackKeys]);
};

const decodePayload = (encryptedText: string) => {
  const normalized = encryptedText.replace(/\s/g, "");
  return {
    expectedHash: normalized.slice(0, 64).toLowerCase(),
    expectedHashBytes: Buffer.from(normalized.slice(0, 64), "hex"),
    payload: Buffer.from(normalized.slice(64), "base64"),
  };
};

const maybeInflate = (buffer: Buffer) => {
  const candidates = [buffer];

  for (const inflate of [zlib.gunzipSync, zlib.inflateSync, zlib.inflateRawSync, zlib.brotliDecompressSync]) {
    try {
      candidates.push(inflate(buffer));
    } catch {
      // Try the next compression layout.
    }
  }

  return candidates;
};

const parseJsonFromText = (text: string): unknown | null => {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  const candidates = [trimmed];
  const firstObject = trimmed.indexOf("{");
  const firstArray = trimmed.indexOf("[");
  const firstJson =
    firstObject === -1 ? firstArray : firstArray === -1 ? firstObject : Math.min(firstObject, firstArray);

  if (firstJson > 0) {
    candidates.push(trimmed.slice(firstJson));
  }

  for (const candidate of candidates) {
    if (!candidate.startsWith("{") && !candidate.startsWith("[")) continue;

    try {
      return JSON.parse(candidate);
    } catch {
      const endObject = candidate.lastIndexOf("}");
      const endArray = candidate.lastIndexOf("]");
      const endJson = Math.max(endObject, endArray);
      if (endJson > 0) {
        try {
          return JSON.parse(candidate.slice(0, endJson + 1));
        } catch {
          // Keep searching other encodings/wrappers.
        }
      }
    }
  }

  return null;
};

const parseJsonFromBuffer = (buffer: Buffer): unknown | null => {
  for (const candidate of maybeInflate(buffer)) {
    for (const encoding of ["utf8", "utf16le", "latin1"] as const) {
      const parsed = parseJsonFromText(candidate.toString(encoding));
      if (parsed) return parsed;
    }

    try {
      const nestedBase64 = candidate.toString("utf8").trim();
      if (/^[A-Za-z0-9+/=]+$/.test(nestedBase64) && nestedBase64.length % 4 === 0) {
        const parsed: unknown | null = parseJsonFromBuffer(Buffer.from(nestedBase64, "base64"));
        if (parsed) return parsed;
      }
    } catch {
      // Keep searching.
    }
  }

  return null;
};

const decryptCandidate = ({
  algorithm,
  key,
  iv,
  payload,
  autoPadding = true,
}: {
  algorithm: string;
  key: Buffer;
  iv: Buffer | null;
  payload: Buffer;
  autoPadding?: boolean;
}) => {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAutoPadding(autoPadding);
  return Buffer.concat([decipher.update(payload), decipher.final()]);
};

const decryptGcmCandidate = ({
  key,
  nonce,
  payload,
  tag,
}: {
  key: Buffer;
  nonce: Buffer;
  payload: Buffer;
  tag: Buffer;
}) => {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(payload), decipher.final()]);
};

const decryptEncryptedAis = (encryptedText: string, password: string, pan?: string) => {
  const { expectedHash, expectedHashBytes, payload } = decodePayload(encryptedText);
  const passwordKeyMaterials = getPasswordKeyMaterials(password, expectedHash, pan);

  const payloadCandidates = [
    {
      payload,
      ivs: uniqueBuffers([
        Buffer.alloc(16),
        expectedHashBytes.subarray(0, 16),
        expectedHashBytes.subarray(16, 32),
      ]),
    },
    {
      payload: payload.subarray(16),
      ivs: uniqueBuffers([
        payload.subarray(0, 16),
        Buffer.alloc(16),
        expectedHashBytes.subarray(0, 16),
        expectedHashBytes.subarray(16, 32),
      ]),
    },
  ];
  const payloadCandidates8ByteIv = [
    {
      payload,
      ivs: uniqueBuffers([
        Buffer.alloc(8),
        expectedHashBytes.subarray(0, 8),
        expectedHashBytes.subarray(8, 16),
      ]),
    },
    {
      payload: payload.subarray(8),
      ivs: uniqueBuffers([
        payload.subarray(0, 8),
        Buffer.alloc(8),
        expectedHashBytes.subarray(0, 8),
        expectedHashBytes.subarray(8, 16),
      ]),
    },
  ];

  const algorithmCandidates = [
    "aes-256-cbc",
    "aes-256-ecb",
    "aes-256-cfb",
    "aes-256-ofb",
    "aes-256-ctr",
    "aes-192-cbc",
    "aes-192-ecb",
    "aes-192-cfb",
    "aes-192-ofb",
    "aes-192-ctr",
    "aes-128-cbc",
    "aes-128-ecb",
    "aes-128-cfb",
    "aes-128-ofb",
    "aes-128-ctr",
  ];
  const legacyAlgorithmCandidates = ["des-ede3-cbc", "des-ede3", "des-ede-cbc", "des-ede", "des-cbc"];

  for (const passwordKeyMaterial of passwordKeyMaterials) {
    const keyCandidates = [
      passwordKeyMaterial,
      passwordKeyMaterial.subarray(0, 16),
      passwordKeyMaterial.subarray(0, 24),
    ];

    if (payload.length > 28 && passwordKeyMaterial.length === 32) {
      for (const nonceLength of [12, 16]) {
        try {
          const decrypted = decryptGcmCandidate({
            key: passwordKeyMaterial,
            nonce: payload.subarray(0, nonceLength),
            payload: payload.subarray(nonceLength, -16),
            tag: payload.subarray(-16),
          });
          const parsed = parseJsonFromBuffer(decrypted);
          if (parsed) return parsed;
        } catch {
          // Try the block/stream layouts below.
        }
      }
    }

    for (const algorithm of algorithmCandidates) {
      const requiredKeyLength = Number(algorithm.split("-")[1]) / 8;
      const key = keyCandidates.find((candidate) => candidate.length === requiredKeyLength);
      if (!key) continue;

      for (const candidate of payloadCandidates) {
        for (const iv of candidate.ivs) {
          if (algorithm.endsWith("-ecb") && iv.length !== 0) {
            try {
              const decrypted = decryptCandidate({
                algorithm,
                key,
                iv: null,
                payload: candidate.payload,
              });
              const parsed = parseJsonFromBuffer(decrypted);
              if (parsed) return parsed;
            } catch {
              // Try next candidate.
            }
            continue;
          }

          if (algorithm.endsWith("-cbc") && iv.length === 16) {
            try {
              const decrypted = decryptCandidate({
                algorithm,
                key,
                iv,
                payload: candidate.payload,
                autoPadding: algorithm.endsWith("-cbc") || algorithm.endsWith("-ecb"),
              });
              const parsed = parseJsonFromBuffer(decrypted);
              if (parsed) return parsed;
            } catch {
              // Try next candidate.
            }
          }

          if (!algorithm.endsWith("-cbc") && !algorithm.endsWith("-ecb") && iv.length === 16) {
            try {
              const decrypted = decryptCandidate({
                algorithm,
                key,
                iv,
                payload: candidate.payload,
                autoPadding: false,
              });
              const parsed = parseJsonFromBuffer(decrypted);
              if (parsed) return parsed;
            } catch {
              // Try next candidate.
            }
          }
        }
      }
    }

    for (const algorithm of legacyAlgorithmCandidates) {
      const requiredKeyLength = algorithm.startsWith("des-ede3")
        ? 24
        : algorithm.startsWith("des-ede")
          ? 16
          : 8;
      const key = keyCandidates.find((candidate) => candidate.length >= requiredKeyLength)?.subarray(0, requiredKeyLength);
      if (!key) continue;

      for (const candidate of payloadCandidates8ByteIv) {
        for (const iv of candidate.ivs) {
          const isEcbLike = algorithm === "des-ede3" || algorithm === "des-ede";

          try {
            const decrypted = decryptCandidate({
              algorithm,
              key,
              iv: isEcbLike ? null : iv,
              payload: candidate.payload,
              autoPadding: true,
            });
            const parsed = parseJsonFromBuffer(decrypted);
            if (parsed) return parsed;
          } catch {
            // Try next candidate.
          }
        }
      }
    }
  }

  throw new Error("UNSUPPORTED_AIS_ENCRYPTION");
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      encryptedText?: string;
      password?: string;
      pan?: string;
    };

    const encryptedText = String(body.encryptedText || "").trim();
    const password = String(body.password || "");
    const pan = String(body.pan || "");

    if (!encryptedText || !password) {
      return NextResponse.json(
        { message: "Encrypted AIS JSON and password are required." },
        { status: 400 }
      );
    }

    if (encryptedText.length > MAX_ENCRYPTED_AIS_CHARS) {
      return NextResponse.json({ message: "AIS file is too large." }, { status: 413 });
    }

    if (!looksLikeEncryptedAisUtilityJson(encryptedText)) {
      return NextResponse.json(
        { message: "This does not look like an encrypted AIS Utility JSON file." },
        { status: 400 }
      );
    }

    const data = decryptEncryptedAis(encryptedText, password, pan);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AIS decrypt failed.";

    if (message === "PASSWORD_MISMATCH") {
      return NextResponse.json(
        { message: "The AIS password did not match this file." },
        { status: 401 }
      );
    }

    if (message === "UNSUPPORTED_AIS_ENCRYPTION") {
      return NextResponse.json(
        {
          message:
            "TaxBee recognized the encrypted AIS file, but this exact encryption layout is not supported yet.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ message }, { status: 500 });
  }
}
