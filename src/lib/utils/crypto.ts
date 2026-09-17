// Generate fake but realistic-looking crypto addresses and transaction hashes

const HEX_CHARS = "0123456789abcdef";

function randomHex(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];
  }
  return result;
}

const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function randomBase58(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += BASE58_CHARS[Math.floor(Math.random() * BASE58_CHARS.length)];
  }
  return result;
}

// ─── Simple deterministic hash from seed string ───
// Produces consistent hex output for the same input
function simpleHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  // Generate a long hex string by chaining multiple rounds
  let hex = "";
  for (let round = 0; round < 8; round++) {
    const v1 = h1 ^ (round * 0x9e3779b9);
    const v2 = h2 ^ (round * 0x517cc1b7);
    const mixed1 = Math.imul(v1 ^ (v1 >>> 16), 2246822507) >>> 0;
    const mixed2 = Math.imul(v2 ^ (v2 >>> 13), 3266489909) >>> 0;
    hex += mixed1.toString(16).padStart(8, "0");
    hex += mixed2.toString(16).padStart(8, "0");
  }

  return hex;
}

// Convert hex to base58 (deterministic)
function hexToBase58(hex: string, length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const charCode = parseInt(hex.substring(i * 2, i * 2 + 2), 16) || 0;
    result += BASE58_CHARS[charCode % BASE58_CHARS.length];
  }
  return result;
}

// ─── Deterministic address generation ───
// Given the same seed + network, always produces the same address
export function generateDeterministicAddress(seed: string, network: string): string {
  const hash = simpleHash(`${seed}:${network}:address`);

  switch (network) {
    case "bitcoin":
      return `bc1q${hash.substring(0, 38)}`;
    case "ethereum":
    case "bsc":
    case "polygon":
    case "arbitrum":
    case "optimism":
    case "avalanche":
      return `0x${hash.substring(0, 40)}`;
    case "solana":
      return hexToBase58(hash, 44);
    case "tron":
      return `T${hexToBase58(hash, 33)}`;
    case "xrp":
      return `r${hexToBase58(hash, 33)}`;
    case "cardano":
      return `addr1q${hash.substring(0, 56)}`;
    case "dogecoin":
      return `D${hexToBase58(hash, 33)}`;
    case "polkadot":
      return `1${hexToBase58(hash, 47)}`;
    case "cosmos":
      return `cosmos1${hash.substring(0, 38)}`;
    case "stellar":
      return `G${hexToBase58(hash, 55).toUpperCase()}`;
    case "near":
      return hash.substring(0, 64);
    case "sui":
      return `0x${hash.substring(0, 64)}`;
    case "aptos":
      return `0x${hash.substring(0, 64)}`;
    case "icp":
      return hash.substring(0, 64);
    case "filecoin":
      return `f1${hash.substring(0, 38)}`;
    case "injective":
      return `inj1${hash.substring(0, 38)}`;
    case "litecoin":
      return `ltc1q${hash.substring(0, 38)}`;
    default:
      return `0x${hash.substring(0, 40)}`;
  }
}

// ─── Random address generation (for external/unknown addresses) ───
export function generateAddress(network: string): string {
  switch (network) {
    case "bitcoin":
      return `bc1q${randomHex(38)}`;
    case "ethereum":
    case "bsc":
    case "polygon":
    case "arbitrum":
    case "optimism":
    case "avalanche":
      return `0x${randomHex(40)}`;
    case "solana":
      return randomBase58(44);
    case "tron":
      return `T${randomBase58(33)}`;
    case "xrp":
      return `r${randomBase58(33)}`;
    case "cardano":
      return `addr1q${randomHex(56)}`;
    case "dogecoin":
      return `D${randomBase58(33)}`;
    case "polkadot":
      return `1${randomBase58(47)}`;
    case "cosmos":
      return `cosmos1${randomHex(38)}`;
    case "stellar":
      return `G${randomBase58(55).toUpperCase()}`;
    case "near":
      return `${randomHex(64)}`;
    case "sui":
      return `0x${randomHex(64)}`;
    case "aptos":
      return `0x${randomHex(64)}`;
    default:
      return `0x${randomHex(40)}`;
  }
}

export function generateTxHash(network: string): string {
  switch (network) {
    case "bitcoin":
      return randomHex(64);
    case "solana":
      return randomBase58(88);
    case "tron":
      return randomHex(64);
    default:
      return `0x${randomHex(64)}`;
  }
}

export function generateSeedPhrase(): string[] {
  const words = [
    "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
    "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
    "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual",
    "adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance",
    "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
    "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album",
    "alcohol", "alert", "alien", "all", "alley", "allow", "almost", "alone",
    "alpha", "already", "also", "alter", "always", "amateur", "amazing", "among",
    "amount", "amused", "analyst", "anchor", "ancient", "anger", "angle", "angry",
    "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique",
    "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april",
    "arch", "arctic", "area", "arena", "argue", "arm", "armed", "armor",
    "army", "around", "arrange", "arrest", "arrive", "arrow", "art", "artefact",
    "artist", "artwork", "ask", "aspect", "assault", "asset", "assist", "assume",
    "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction",
    "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado",
    "avoid", "awake", "aware", "awesome", "awful", "awkward", "axis", "baby",
    "bachelor", "bacon", "badge", "bag", "balance", "balcony", "ball", "bamboo",
    "banana", "banner", "bar", "barely", "bargain", "barrel", "base", "basic",
    "basket", "battle", "beach", "bean", "beauty", "because", "become", "beef",
    "before", "begin", "behave", "behind", "believe", "below", "belt", "bench",
    "benefit", "best", "betray", "better", "between", "beyond", "bicycle", "bid",
    "bike", "bind", "biology", "bird", "birth", "bitter", "black", "blade",
    "blame", "blanket", "blast", "bleak", "bless", "blind", "blood", "blossom",
    "blow", "blue", "blur", "blush", "board", "boat", "body", "boil",
    "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow",
    "boss", "bottom", "bounce", "box", "boy", "bracket", "brain", "brand",
    "brave", "bread", "breeze", "brick", "bridge", "brief", "bright", "bring",
    "brisk", "broccoli", "broken", "bronze", "broom", "brother", "brown", "brush",
    "bubble", "buddy", "budget", "buffalo", "build", "bulb", "bulk", "bullet",
    "bundle", "bunny", "burden", "burger", "burst", "bus", "business", "busy",
    "butter", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus", "cage",
    "cake", "call", "calm", "camera", "camp", "can", "canal", "cancel",
    "candy", "cannon", "canoe", "canvas", "canyon", "capable", "capital", "captain",
    "car", "carbon", "card", "cargo", "carpet", "carry", "cart", "case",
  ];
  
  const phrase: string[] = [];
  const used = new Set<number>();
  while (phrase.length < 12) {
    const idx = Math.floor(Math.random() * words.length);
    if (!used.has(idx)) {
      used.add(idx);
      phrase.push(words[idx]);
    }
  }
  return phrase;
}

export function generateWalletId(): string {
  return `wallet_${Date.now()}_${randomHex(8)}`;
}
