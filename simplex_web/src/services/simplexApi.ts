// src/services/simplexApi.ts

// ====== Config ======
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, ''); // quitar slash final
const SIMPLEX_URL = `${BASE_URL}/api/simplex/resolver/`;
const DEFAULT_TIMEOUT_MS = 20_000;

// ====== Tipos ======
export type RestrictionSign = '<=' | '>=' | '=';

export interface SimplexPayload {
  tipo: 'maximizar' | 'minimizar';
  objetivo: number[]; // hasta 4
  restricciones: {
    A: number[][];     // matriz m x n
    b: number[];       // tamaño m
    signos: RestrictionSign[]; // tamaño m
  };
}

export interface Iteration {
  iteracion: number;
  tabla: number[][];
  entrante: string | null;
  saliente: string | null;
}

export interface SimplexResult {
  iteraciones: Iteration[];
  resultado: {
    z: number;
    valores: Record<string, number>;
  };
}

export class SimplexApiError extends Error {
  status?: number;
  raw?: string;
  constructor(message: string, status?: number, raw?: string) {
    super(message);
    this.name = 'SimplexApiError';
    this.status = status;
    this.raw = raw;
  }
}

// ====== Helpers ======

function assertEnv(): void {
  if (!BASE_URL) {
    throw new SimplexApiError(
      'VITE_API_BASE_URL no está definida. Crea un .env con VITE_API_BASE_URL=http://127.0.0.1:8000'
    );
  }
}

function validatePayload(p: SimplexPayload): void {
  if (!p || !p.tipo || !p.objetivo || !p.restricciones) {
    throw new SimplexApiError('Payload inválido: faltan campos obligatorios.');
  }
  const n = p.objetivo.length;
  if (n === 0 || n > 4) {
    throw new SimplexApiError('Sólo se permiten entre 1 y 4 variables.');
  }
  const { A, b, signos } = p.restricciones;
  if (!Array.isArray(A) || !Array.isArray(b) || !Array.isArray(signos)) {
    throw new SimplexApiError('Restricciones mal formadas.');
  }
  if (!(A.length === b.length && b.length === signos.length)) {
    throw new SimplexApiError('A, b y signos deben tener el mismo número de filas.');
  }
  if (A.some((row) => row.length !== n)) {
    throw new SimplexApiError('Cada fila de A debe tener el mismo número de columnas que la función objetivo.');
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// ====== API ======

export async function apiHealth(): Promise<boolean> {
  assertEnv();
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/`, { method: 'GET' }, 5_000);
    return res.ok;
  } catch {
    return false;
  }
}

export async function solveSimplex(payload: SimplexPayload): Promise<SimplexResult> {
  assertEnv();
  validatePayload(payload);

  const res = await fetchWithTimeout(SIMPLEX_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new SimplexApiError(
      `Error HTTP ${res.status} al resolver simplex.`,
      res.status,
      raw
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new SimplexApiError('Respuesta no es JSON válido.', res.status, raw);
  }

  // Validación superficial de la respuesta
  const resp = data as SimplexResult;
  if (
    typeof resp?.resultado?.z !== 'number' ||
    typeof resp?.resultado?.valores !== 'object' ||
    !Array.isArray(resp?.iteraciones)
  ) {
    throw new SimplexApiError('Estructura de respuesta inesperada.', res.status, raw);
  }

  return resp;
}

// ====== Ejemplo de payload ======
export const examplePayload: SimplexPayload = {
  tipo: 'maximizar',
  objetivo: [3, 2],
  restricciones: {
    A: [
      [1, 2],
      [2, 1],
    ],
    b: [8, 6],
    signos: ['<=', '<='],
  },
};
