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

export function generateAddress(network: string): string {
  switch (network) {
    case "bitcoin":
      // bc1 bech32 address
      return `bc1q${randomHex(38)}`;
    case "ethereum":
    case "bsc":
    case "polygon":
    case "arbitrum":
    case "optimism":
    case "avalanche":
      // 0x EVM address
      return `0x${randomHex(40)}`;
    case "solana":
      // Base58 Solana address
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
