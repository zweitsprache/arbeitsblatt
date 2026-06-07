function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicShuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type SpellingRowItem = { text: string; isOriginal: boolean };

function getProtectedDigitIndexSet(
  input: string,
  keepLeftCharacters: number,
  keepRightCharacters: number,
): Set<number> {
  const digitIndices = Array.from(input)
    .map((char, index) => (/\d/.test(char) ? index : -1))
    .filter((index) => index >= 0);
  const leftProtectedCount = Math.max(0, Math.min(digitIndices.length, keepLeftCharacters));
  const rightProtectedCount = Math.max(0, Math.min(digitIndices.length - leftProtectedCount, keepRightCharacters));
  const protectedIndices = new Set<number>();

  for (const index of digitIndices.slice(0, leftProtectedCount)) {
    protectedIndices.add(index);
  }

  for (const index of digitIndices.slice(digitIndices.length - rightProtectedCount)) {
    protectedIndices.add(index);
  }

  return protectedIndices;
}

function buildSingleNumberTypo(
  input: string,
  seedKey: string,
  protectedIndices: Set<number>,
): string {
  const chars = Array.from(input);
  const mutableDigitIndices = chars
    .map((char, index) => (/\d/.test(char) && !protectedIndices.has(index) ? index : -1))
    .filter((index) => index >= 0);
  const fallbackDigitIndices = chars
    .map((char, index) => (/\d/.test(char) ? index : -1))
    .filter((index) => index >= 0);
  const candidateIndices = mutableDigitIndices.length > 0 ? mutableDigitIndices : fallbackDigitIndices;

  if (candidateIndices.length === 0) {
    return input;
  }

  const rand = mulberry32(hashString(`${seedKey}:number-typo`));
  const digitIndex = candidateIndices[Math.floor(rand() * candidateIndices.length)];
  const currentDigit = chars[digitIndex] ?? "0";
  chars[digitIndex] = currentDigit === "9" ? "0" : String(Number(currentDigit) + 1);
  return chars.join("");
}

function jumbleNumber(
  input: string,
  keepLeftCharacters: number,
  keepRightCharacters: number,
  seedKey: string,
): string {
  const chars = Array.from(input);
  const protectedIndices = getProtectedDigitIndexSet(input, keepLeftCharacters, keepRightCharacters);
  const mutableDigitIndices = chars
    .map((char, index) => (/\d/.test(char) && !protectedIndices.has(index) ? index : -1))
    .filter((index) => index >= 0);

  if (mutableDigitIndices.length <= 1) {
    return buildSingleNumberTypo(input, seedKey, protectedIndices);
  }

  const digitsToShuffle = mutableDigitIndices.map((index) => chars[index]);
  const rand = mulberry32(hashString(`${seedKey}:number-shuffle`));

  for (let attempt = 0; attempt < 6; attempt++) {
    const shuffledDigits = deterministicShuffle(digitsToShuffle, rand);
    const nextChars = [...chars];
    mutableDigitIndices.forEach((charIndex, index) => {
      nextChars[charIndex] = shuffledDigits[index] ?? nextChars[charIndex];
    });
    const candidate = nextChars.join("");
    if (candidate !== input) {
      return candidate;
    }
  }

  const rotatedDigits = [...digitsToShuffle.slice(1), digitsToShuffle[0]];
  const fallbackChars = [...chars];
  mutableDigitIndices.forEach((charIndex, index) => {
    fallbackChars[charIndex] = rotatedDigits[index] ?? fallbackChars[charIndex];
  });
  const fallback = fallbackChars.join("");
  if (fallback !== input) {
    return fallback;
  }

  return buildSingleNumberTypo(input, seedKey, protectedIndices);
}

function shiftCharacter(char: string): string {
  if (char >= "a" && char <= "y") return String.fromCharCode(char.charCodeAt(0) + 1);
  if (char === "z") return "a";
  if (char >= "A" && char <= "Y") return String.fromCharCode(char.charCodeAt(0) + 1);
  if (char === "Z") return "A";
  return char === "x" ? "y" : "x";
}

function buildSingleWordTypo(
  word: string,
  startIndex: number,
  endIndex: number,
  seedKey: string,
): string {
  const chars = word.split("");
  const rand = mulberry32(hashString(`${seedKey}:typo`));
  const mutableIndices = Array.from(
    { length: Math.max(0, endIndex - startIndex) },
    (_, index) => startIndex + index,
  );
  const eligibleIndices = mutableIndices.length > 0
    ? mutableIndices
    : Array.from({ length: chars.length }, (_, index) => index);

  if (eligibleIndices.length === 0) {
    return word;
  }

  const typoIndex = eligibleIndices[Math.floor(rand() * eligibleIndices.length)];
  const originalChar = chars[typoIndex] ?? "";
  const neighborChars = [chars[typoIndex - 1], chars[typoIndex + 1]].filter(
    (char): char is string => typeof char === "string" && char.length > 0 && char !== originalChar,
  );
  const replacement = neighborChars[0] ?? shiftCharacter(originalChar);
  chars[typoIndex] = replacement;
  const candidate = chars.join("");

  return candidate === word ? `${word}${replacement}` : candidate;
}

function jumbleSingleWord(
  word: string,
  keepLeftCharacters: number,
  keepRightCharacters: number,
  seedKey: string,
): string {
  if (word.length <= 1) return word;

  const chars = word.split("");
  const startIndex = Math.max(0, Math.min(chars.length, keepLeftCharacters));
  const endIndex = Math.max(startIndex, chars.length - Math.max(0, Math.min(chars.length - startIndex, keepRightCharacters)));
  const middle = chars.slice(startIndex, endIndex);

  if (middle.length <= 1) {
    return word;
  }

  const rand = mulberry32(hashString(seedKey));
  for (let attempt = 0; attempt < 6; attempt++) {
    const shuffled = deterministicShuffle(middle, rand);
    const candidate = [
      ...chars.slice(0, startIndex),
      ...shuffled,
      ...chars.slice(endIndex),
    ].join("");
    if (candidate !== word) return candidate;
  }

  const rotated = [...middle.slice(1), middle[0]];
  const fallback = [
    ...chars.slice(0, startIndex),
    ...rotated,
    ...chars.slice(endIndex),
  ].join("");
  if (fallback !== word) return fallback;

  return word;
}

function applyWordOrder(
  segments: string[],
  orderedWords: string[],
): string {
  let wordIndex = 0;

  return segments
    .map((segment) => {
      if (/^\s+$/.test(segment)) {
        return segment;
      }

      const nextWord = orderedWords[wordIndex];
      wordIndex += 1;
      return nextWord ?? segment;
    })
    .join("");
}

function jumbleWord(
  word: string,
  keepLeftCharacters: number,
  keepRightCharacters: number,
  seedKey: string,
): string {
  if (!/\s/.test(word)) {
    return jumbleSingleWord(word, keepLeftCharacters, keepRightCharacters, seedKey);
  }

  const segments = word.split(/(\s+)/).filter((segment) => segment.length > 0);
  const wordSegments = segments.filter((segment) => !/^\s+$/.test(segment));

  if (wordSegments.length <= 1) {
    return jumbleSingleWord(word, keepLeftCharacters, keepRightCharacters, seedKey);
  }

  const jumbledWords = wordSegments.map((segment, index) =>
    jumbleSingleWord(segment, keepLeftCharacters, keepRightCharacters, `${seedKey}:word:${index}`),
  );

  const originalOrderCandidate = applyWordOrder(segments, jumbledWords);

  if (originalOrderCandidate !== word) {
    return originalOrderCandidate;
  }

  // If no change from shuffling letters, try rotating word order as last resort
  const rotatedWords = [...wordSegments.slice(1), wordSegments[0]];
  const rotatedCandidate = applyWordOrder(
    segments,
    rotatedWords.map((w, i) => jumbledWords[wordSegments.indexOf(w)]),
  );

  return rotatedCandidate !== word ? rotatedCandidate : word;
}

export function buildCorrectSpellingRow(
  word: string,
  keepLeftCharacters: number,
  keepRightCharacters: number,
  seedKey: string,
  slotCount = 10,
): SpellingRowItem[] {
  const safeSlotCount = Math.max(1, slotCount);
  const rand = mulberry32(hashString(`${seedKey}:originals`));
  const additionalOriginalCount = Math.max(1, Math.round(Math.max(0, safeSlotCount - 1) / 3));
  const originalPositions = new Set<number>([0]);

  if (safeSlotCount > 1) {
    const shuffledPositions = deterministicShuffle(
      Array.from({ length: safeSlotCount - 1 }, (_, index) => index + 1),
      rand,
    );

    for (const position of shuffledPositions.slice(0, additionalOriginalCount)) {
      originalPositions.add(position);
    }
  }

  // Check if word can be shuffled meaningfully
  const chars = word.split("");
  const startIndex = Math.max(0, Math.min(chars.length, keepLeftCharacters));
  const endIndex = Math.max(startIndex, chars.length - Math.max(0, Math.min(chars.length - startIndex, keepRightCharacters)));
  const canShuffle = (endIndex - startIndex) > 1;

  return Array.from({ length: safeSlotCount }, (_, index) => {
    if (originalPositions.has(index) || !canShuffle) {
      return { text: word, isOriginal: true };
    }

    return {
      text: jumbleWord(word, keepLeftCharacters, keepRightCharacters, `${seedKey}:${index}`),
      isOriginal: false,
    };
  });
}

export function buildCorrectNumbersRow(
  value: string,
  keepLeftCharacters: number,
  keepRightCharacters: number,
  seedKey: string,
  slotCount = 10,
): SpellingRowItem[] {
  const safeSlotCount = Math.max(1, slotCount);
  const rand = mulberry32(hashString(`${seedKey}:originals`));
  const additionalOriginalCount = Math.max(1, Math.round(Math.max(0, safeSlotCount - 1) / 3));
  const originalPositions = new Set<number>([0]);

  if (safeSlotCount > 1) {
    const shuffledPositions = deterministicShuffle(
      Array.from({ length: safeSlotCount - 1 }, (_, index) => index + 1),
      rand,
    );

    for (const position of shuffledPositions.slice(0, additionalOriginalCount)) {
      originalPositions.add(position);
    }
  }

  return Array.from({ length: safeSlotCount }, (_, index) => {
    if (originalPositions.has(index)) {
      return { text: value, isOriginal: true };
    }

    return {
      text: jumbleNumber(value, keepLeftCharacters, keepRightCharacters, `${seedKey}:${index}`),
      isOriginal: false,
    };
  });
}

function getMissingLetterIndices(
  word: string,
  keepLeftCharacters: number,
  keepRightCharacters: number,
): number[] {
  const chars = Array.from(word);
  const candidateIndices = chars
    .map((char, index) => (/\s/.test(char) ? -1 : index))
    .filter((index) => index >= 0);

  if (candidateIndices.length <= 1) {
    return candidateIndices;
  }

  let eligibleIndices = [...candidateIndices];

  const leftProtectedCount = Math.max(0, Math.min(eligibleIndices.length, keepLeftCharacters));
  const rightProtectedCount = Math.max(0, Math.min(eligibleIndices.length - leftProtectedCount, keepRightCharacters));

  if (leftProtectedCount > 0 && eligibleIndices.length > 0) {
    eligibleIndices = eligibleIndices.slice(leftProtectedCount);
  }

  if (rightProtectedCount > 0 && eligibleIndices.length > 0) {
    eligibleIndices = eligibleIndices.slice(0, Math.max(0, eligibleIndices.length - rightProtectedCount));
  }

  return eligibleIndices.length > 0 ? eligibleIndices : candidateIndices;
}

function buildMissingLetterVariant(word: string, index: number): string {
  const chars = Array.from(word);
  const answer = chars[index] ?? "";
  chars[index] = `{{blank:${answer},1ch}}`;
  return chars.join("");
}

export function buildMissingLettersRow(
  word: string,
  keepLeftCharacters: number,
  keepRightCharacters: number,
  seedKey: string,
  slotCount = 10,
): SpellingRowItem[] {
  const safeSlotCount = Math.max(1, slotCount);
  const eligibleIndices = getMissingLetterIndices(word, keepLeftCharacters, keepRightCharacters);

  if (eligibleIndices.length === 0) {
    return Array.from({ length: safeSlotCount }, (_, index) => ({
      text: word,
      isOriginal: index === 0,
    }));
  }

  const rand = mulberry32(hashString(seedKey));
  const shuffledVariants = deterministicShuffle(
    eligibleIndices.map((index) => ({
      text: buildMissingLetterVariant(word, index),
      isOriginal: false,
    })),
    rand,
  );

  const row: SpellingRowItem[] = [{ text: word, isOriginal: true }];
  while (row.length < safeSlotCount) {
    const variant = shuffledVariants[(row.length - 1) % shuffledVariants.length];
    row.push({ ...variant });
  }

  return row;
}
