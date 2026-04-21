const STOP_WORDS = new Set(['the', 'a', 'an', 'to', 'is', 'for', 'of', 'in', 'on', 'with', 'and', 'my', 'how', 'me', 'can', 'i', 'please', 'this', 'that', 'want', 'guide']);

const DOMAIN_SYNONYMS = {
  'itr': 'return',
  'submit': 'file',
  'upload': 'add',
  'claim': 'deduction',
  'docs': 'documents',
  'taxpayer': 'user',
  'identity': 'pan'
};

/**
 * Calculates Levenshtein distance for fuzzy matching.
 */
const levenshtein = (a, b) => {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
};

const isFuzzyMatch = (s1, s2) => levenshtein(s1, s2) <= 1;

/**
 * Tokenizes text, removes punctuation and stop words, and applies synonym mapping.
 */
export const tokenize = (text) => {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token))
    .map(token => DOMAIN_SYNONYMS[token] || token);
};

/**
 * Calculates a weighted similarity score between query tokens and target keywords.
 */
export const calculateScore = (queryTokens, targetKeywords, highValueTerms = []) => {
  if (queryTokens.length === 0) return 0;

  const targetTokens = new Set(targetKeywords.flatMap(k => tokenize(k)));
  const hvSet = new Set(highValueTerms.map(t => t.toLowerCase()));
  
  let score = 0;
  queryTokens.forEach(token => {
    if (targetTokens.has(token)) {
      score += hvSet.has(token) ? 8 : 3;
    } else {
      for (const target of targetTokens) {
        if (target.includes(token) || token.includes(target) || isFuzzyMatch(token, target)) {
          score += 1;
          break;
        }
      }
    }
  });

  return score / Math.sqrt(queryTokens.length);
};