/**
 * Fuzzy matching subsequence-based, sin dependencias externas.
 * Devuelve null si `query` no es subsecuencia de `target` (case-insensitive),
 * o un score numérico (mayor = mejor match) si sí lo es.
 *
 * Usa programación dinámica para encontrar el MEJOR alineamiento posible
 * (no solo la primera ocurrencia de cada carácter, que puede ser subóptima:
 * p.ej. buscar "comp" en "src/components/x" no debe anclarse a la "c" de
 * "src"). Premia rachas contiguas de forma superlineal (para que un match
 * contiguo siempre gane a varios matches dispersos de igual longitud total)
 * y añade un bono por coincidir justo tras un separador ("inicio de palabra").
 */

const SEPARATOR_RE = /[/\-_.\s]/;

function isSeparatorChar(ch: string | undefined): boolean {
  return ch !== undefined && SEPARATOR_RE.test(ch);
}

/** Puntaje aportado por un carácter que extiende una racha contigua de longitud `run`. */
function charContribution(run: number, isWordStart: boolean): number {
  return 1 + 2 * run * run + (isWordStart ? 3 : 0);
}

export function fuzzyScore(query: string, target: string): number | null {
  if (query.length === 0) {
    return 0;
  }
  if (target.length === 0) {
    return null;
  }

  const q = query.toLowerCase();
  const t = target.toLowerCase();
  const n = q.length;
  const m = t.length;

  // Chequeo barato de subsecuencia antes de pagar el costo de la DP completa.
  {
    let qi = 0;
    for (let ti = 0; ti < m && qi < n; ti++) {
      if (t[ti] === q[qi]) {
        qi++;
      }
    }
    if (qi < n) {
      return null;
    }
  }

  const NONE = Number.NEGATIVE_INFINITY;

  // dp[j] = mejor score matcheando los primeros i chars de la query,
  // donde el i-ésimo char quedó matcheado en la posición (j - 1) de target.
  // run[j] = longitud de la racha contigua que termina ahí, para ese mejor score.
  let prevDp = new Float64Array(m + 1).fill(NONE);
  let prevRun = new Int32Array(m + 1);

  for (let i = 1; i <= n; i++) {
    const dp = new Float64Array(m + 1).fill(NONE);
    const run = new Int32Array(m + 1);

    // Prefix-max de la fila anterior: prevPrefixMax[j] = max(prevDp[1..j]).
    // Se usa para "empezar una racha nueva" en cualquier posición posterior
    // a la mejor coincidencia parcial ya encontrada para los primeros i-1 chars.
    let prevPrefixMax: Float64Array | undefined;
    if (i > 1) {
      prevPrefixMax = new Float64Array(m + 1).fill(NONE);
      let running = NONE;
      for (let k = 1; k <= m; k++) {
        if (prevDp[k] > running) {
          running = prevDp[k];
        }
        prevPrefixMax[k] = running;
      }
    }

    for (let j = 1; j <= m; j++) {
      if (t[j - 1] !== q[i - 1]) {
        continue;
      }
      const isWordStart = j - 1 === 0 || isSeparatorChar(t[j - 2]);

      let best = NONE;
      let bestRun = 1;

      if (i === 1) {
        best = charContribution(1, isWordStart);
        bestRun = 1;
      } else {
        // Opción A: extender una racha contigua (el char i-1 matcheó justo en j-2).
        if (prevDp[j - 1] !== NONE) {
          const r = prevRun[j - 1] + 1;
          const extended = prevDp[j - 1] + charContribution(r, isWordStart);
          if (extended > best) {
            best = extended;
            bestRun = r;
          }
        }
        // Opción B: empezar una racha nueva, tras la mejor coincidencia parcial anterior.
        const prefixMax = j - 2 >= 1 ? prevPrefixMax![j - 2] : NONE;
        if (prefixMax !== NONE) {
          const fresh = prefixMax + charContribution(1, isWordStart);
          if (fresh > best) {
            best = fresh;
            bestRun = 1;
          }
        }
      }

      if (best !== NONE) {
        dp[j] = best;
        run[j] = bestRun;
      }
    }

    prevDp = dp;
    prevRun = run;
  }

  let result = NONE;
  for (let j = 1; j <= m; j++) {
    if (prevDp[j] > result) {
      result = prevDp[j];
    }
  }

  if (result === NONE) {
    // No debería ocurrir dado que ya pasó el chequeo de subsecuencia,
    // pero por robustez devolvemos null en vez de -Infinity.
    return null;
  }

  // Penaliza ligeramente strings muy largos respecto a la query, para que
  // coincidencias más "ajustadas" (target corto) suban en el ranking.
  const lengthPenalty = (target.length - query.length) * 0.01;
  return result - lengthPenalty;
}

/**
 * Posiciones (índices en `target`) que matchean `query`, para resaltar en la UI.
 * Usa un greedy leftmost simple (no la DP de fuzzyScore): no siempre coincide con
 * el alineamiento de mejor puntaje, pero es suficiente para pintar qué letras
 * "activaron" el match — el ranking real lo sigue decidiendo fuzzyScore.
 */
export function matchPositions(query: string, target: string): number[] {
  if (query.length === 0) {
    return [];
  }
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  const positions: number[] = [];
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      positions.push(ti);
      qi++;
    }
  }
  return qi === q.length ? positions : [];
}

export interface Scored<T> {
  item: T;
  score: number;
}

/**
 * Filtra y ordena una lista de items según fuzzyScore aplicado a `getText(item)`.
 */
export function fuzzyFilterSort<T>(
  query: string,
  items: readonly T[],
  getText: (item: T) => string,
  maxResults: number
): T[] {
  const scored: Scored<T>[] = [];
  for (const item of items) {
    const score = fuzzyScore(query, getText(item));
    if (score !== null) {
      scored.push({ item, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map((s) => s.item);
}
