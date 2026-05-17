declare module "hypher" {
  export default class Hypher {
    constructor(language: unknown);
    hyphenate(word: string): string[];
  }
}

declare module "hyphenation.de" {
  const patterns: unknown;
  export default patterns;
}