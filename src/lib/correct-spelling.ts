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

function jumbleSingleWord(
  word: string,
  keepFirstLetter: boolean,
  keepLastLetter: boolean,
  seedKey: string,
): string {
  if (word.length <= 1) return word;

  const chars = word.split("");
  const startIndex = keepFirstLetter ? 1 : 0;
  const endIndex = keepLastLetter ? chars.length - 1 : chars.length;
  const middle = chars.slice(startIndex, endIndex);

  if (middle.length <= 1) return word;

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
  return fallback === word ? word : fallback;
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
  keepFirstLetter: boolean,
  keepLastLetter: boolean,
  seedKey: string,
): string {
  if (!/\s/.test(word)) {
    return jumbleSingleWord(word, keepFirstLetter, keepLastLetter, seedKey);
  }

  const segments = word.split(/(\s+)/).filter((segment) => segment.length > 0);
  const wordSegments = segments.filter((segment) => !/^\s+$/.test(segment));

  if (wordSegments.length <= 1) {
    return jumbleSingleWord(word, keepFirstLetter, keepLastLetter, seedKey);
  }

  const jumbledWords = wordSegments.map((segment, index) =>
    jumbleSingleWord(segment, keepFirstLetter, keepLastLetter, `${seedKey}:word:${index}`),
  );

  const originalOrderCandidate = applyWordOrder(segments, jumbledWords);
  const rand = mulberry32(hashString(`${seedKey}:order`));
  const shuffledOrder = deterministicShuffle(
    Array.from({ length: jumbledWords.length }, (_, index) => index),
    rand,
  );
  const reorderedCandidate = applyWordOrder(
    segments,
    shuffledOrder.map((index) => jumbledWords[index]),
  );

  if (reorderedCandidate !== word && reorderedCandidate !== originalOrderCandidate) {
    return reorderedCandidate;
  }

  if (originalOrderCandidate !== word) {
    return originalOrderCandidate;
  }

  const rotatedCandidate = applyWordOrder(segments, [...jumbledWords.slice(1), jumbledWords[0]]);
  return rotatedCandidate === word ? word : rotatedCandidate;
}

export function buildCorrectSpellingRow(
  word: string,
  keepFirstLetter: boolean,
  keepLastLetter: boolean,
  seedKey: string,
  slotCount = 10,
): SpellingRowItem[] {
  const safeSlotCount = Math.max(1, slotCount);
  const rand = mulberry32(hashString(seedKey));
  const minOriginals = Math.max(1, Math.ceil(safeSlotCount * 0.3));
  const maxOriginals = Math.max(minOriginals, Math.floor(safeSlotCount * 0.5));
  const originalCount = minOriginals + Math.floor(rand() * (maxOriginals - minOriginals + 1));
  const originalPositions = new Set(
    deterministicShuffle(
      Array.from({ length: Math.max(0, safeSlotCount - 1) }, (_, index) => index + 1),
      rand,
    ).slice(0, Math.max(0, originalCount - 1)),
  );
  originalPositions.add(0);

  return Array.from({ length: safeSlotCount }, (_, index) => {
    if (originalPositions.has(index)) {
      return { text: word, isOriginal: true };
    }

    return {
      text: jumbleWord(word, keepFirstLetter, keepLastLetter, `${seedKey}:${index}`),
      isOriginal: false,
    };
  });
}

function getMissingLetterIndices(
  word: string,
  keepFirstLetter: boolean,
  keepLastLetter: boolean,
): number[] {
  const chars = Array.from(word);
  const candidateIndices = chars
    .map((char, index) => (/\s/.test(char) ? -1 : index))
    .filter((index) => index >= 0);

  if (candidateIndices.length <= 1) {
    return candidateIndices;
  }

  let eligibleIndices = [...candidateIndices];

  if (keepFirstLetter && eligibleIndices.length > 0) {
    eligibleIndices = eligibleIndices.slice(1);
  }

  if (keepLastLetter && eligibleIndices.length > 0) {
    eligibleIndices = eligibleIndices.slice(0, -1);
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
  keepFirstLetter: boolean,
  keepLastLetter: boolean,
  seedKey: string,
  slotCount = 10,
): SpellingRowItem[] {
  const safeSlotCount = Math.max(1, slotCount);
  const eligibleIndices = getMissingLetterIndices(word, keepFirstLetter, keepLastLetter);

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
