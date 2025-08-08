import { useEffect, useMemo, useState } from 'react';
import {
  solveSimplex,
  type SimplexPayload,
  type RestrictionSign,
  type Iteration,
  type SimplexResult,
  examplePayload,
} from './services/simplexApi';
import { motion } from 'framer-motion';

const MAX_VARS = 4;
const MAX_CONS = 6;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export default function SimplexForm() {
  // Estado del problema
  const [tipo, setTipo] = useState<'maximizar' | 'minimizar'>('maximizar');
  const [nVars, setNVars] = useState<number>(examplePayload.objetivo.length);
  const [nCons, setNCons] = useState<number>(examplePayload.restricciones.A.length);

  const [objetivo, setObjetivo] = useState<number[]>(examplePayload.objetivo);
  const [A, setA] = useState<number[][]>(examplePayload.restricciones.A);
  const [b, setB] = useState<number[]>(examplePayload.restricciones.b);
  const [signos, setSignos] = useState<RestrictionSign[]>(examplePayload.restricciones.signos);

  // Resultado / UI
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SimplexResult | null>(null);

  // Etiquetas x1..xn
  const headers = useMemo(() => Array.from({ length: nVars }, (_, i) => `x${i + 1}`), [nVars]);

  // Ajustar tamaños de matrices/vectores cuando cambien nVars / nCons
  useEffect(() => {
    const vars = clamp(nVars, 1, MAX_VARS);
    const cons = clamp(nCons, 1, MAX_CONS);

    setObjetivo(prev => Array.from({ length: vars }, (_, i) => prev[i] ?? 0));

    setA(prev => {
      return Array.from({ length: cons }, (_, r) => {
        const row = prev[r] ?? [];
        return Array.from({ length: vars }, (_, c) => row[c] ?? 0);
      });
    });

    setB(prev => Array.from({ length: cons }, (_, i) => prev[i] ?? 0));

    setSignos(prev => Array.from({ length: cons }, (_, i) => prev[i] ?? '<='));
  }, [nVars, nCons]);

  // Handlers numéricos
  function onChangeObjetivo(idx: number, val: string): void {
    const num = Number(val);
    setObjetivo(prev => prev.map((x, i) => (i === idx ? (Number.isFinite(num) ? num : 0) : x)));
  }

  function onChangeA(r: number, c: number, val: string): void {
    const num = Number(val);
    setA(prev =>
      prev.map((row, i) =>
        i === r ? row.map((x, j) => (j === c ? (Number.isFinite(num) ? num : 0) : x)) : row,
      ),
    );
  }

  function onChangeB(r: number, val: string): void {
    const num = Number(val);
    setB(prev => prev.map((x, i) => (i === r ? (Number.isFinite(num) ? num : 0) : x)));
  }

  async function onSubmit(): Promise<void> {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const payload: SimplexPayload = {
        tipo,
        objetivo,
        restricciones: { A, b, signos },
      };
      const res = await solveSimplex(payload);
      setData(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error inesperado';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function reset(): void {
    setTipo('maximizar');
    setNVars(2);
    setNCons(2);
    setObjetivo([0, 0]);
    setA([
      [0, 0],
      [0, 0],
    ]);
    setB([0, 0]);
    setSignos(['<=', '<=']);
    setData(null);
    setError(null);
  }

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Simplex Solver</h1>
          <div className="flex items-center gap-2 text-sm text-neutral-300">
            <span className="hidden sm:inline">Variables</span>
            <input
              type="number"
              min={1}
              max={MAX_VARS}
              value={nVars}
              onChange={(e) => setNVars(clamp(Number(e.target.value), 1, MAX_VARS))}
              className="w-16 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1"
              title={`1 a ${MAX_VARS}`}
            />
            <span className="hidden sm:inline">Restricciones</span>
            <input
              type="number"
              min={1}
              max={MAX_CONS}
              value={nCons}
              onChange={(e) => setNCons(clamp(Number(e.target.value), 1, MAX_CONS))}
              className="w-16 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1"
              title={`1 a ${MAX_CONS}`}
            />
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'maximizar' | 'minimizar')}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1"
            >
              <option value="maximizar">Maximizar</option>
              <option value="minimizar">Minimizar</option>
            </select>
            <button
              onClick={reset}
              className="rounded-xl border border-neutral-700 px-3 py-1 hover:bg-neutral-800"
            >
              Reset
            </button>
          </div>
        </header>

        {/* Objetivo */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <h2 className="mb-3 text-lg font-medium">Función objetivo</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-neutral-300">Z =</span>
            {headers.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  value={objetivo[i] ?? 0}
                  onChange={(e) => onChangeObjetivo(i, e.target.value)}
                  className="w-24 rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1"
                  aria-label={`Coeficiente de ${label}`}
                />
                <span className="text-neutral-300">
                  {label}
                  {i < headers.length - 1 ? ' +' : ''}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Restricciones */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <h2 className="mb-3 text-lg font-medium">Restricciones</h2>
          <div className="space-y-3">
            {Array.from({ length: nCons }, (_, r) => (
              <div key={r} className="flex flex-wrap items-center gap-2">
                {Array.from({ length: nVars }, (_, c) => (
                  <div key={`${r}-${c}`} className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      value={A[r]?.[c] ?? 0}
                      onChange={(e) => onChangeA(r, c, e.target.value)}
                      className="w-24 rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1"
                      aria-label={`Coeficiente de x${c + 1} en restricción ${r + 1}`}
                    />
                    <span className="text-neutral-300">
                      x{c + 1}
                      {c < nVars - 1 ? ' +' : ''}
                    </span>
                  </div>
                ))}

                <select
                  value={signos[r] ?? '<='}
                  onChange={(e) =>
                    setSignos((prev) =>
                      prev.map((s, i) => (i === r ? (e.target.value as RestrictionSign) : s)),
                    )
                  }
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1"
                  aria-label={`Signo de la restricción ${r + 1}`}
                >
                  <option value="<=">{'<='}</option>
                  <option value=">=">{'>='}</option>
                  <option value="=">{'='}</option>
                </select>

                <input
                  type="number"
                  step="any"
                  value={b[r] ?? 0}
                  onChange={(e) => onChangeB(r, e.target.value)}
                  className="w-28 rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1"
                  aria-label={`Lado derecho (b) de la restricción ${r + 1}`}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Acciones */}
        <div className="flex items-center gap-3">
          <button
            onClick={onSubmit}
            disabled={loading}
            className="rounded-2xl bg-white px-4 py-2 font-medium text-neutral-900 hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Resolviendo…' : 'Resolver'}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {/* Resultado */}
        {data && (
          <motion.section
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4"
          >
            <h2 className="mb-3 text-lg font-medium">Resultado</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-neutral-800 p-3">
                <p className="text-neutral-300">Valor óptimo Z</p>
                <p className="text-2xl font-semibold">
                  {Number(data.resultado.z).toFixed(4)}
                </p>
              </div>
              <div className="rounded-xl border border-neutral-800 p-3">
                <p className="text-neutral-300">Variables</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {(Object.entries(data.resultado.valores) as Array<[string, number]>).map(
                    ([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between rounded-lg bg-neutral-950 px-3 py-2"
                      >
                        <span className="text-neutral-400">{k}</span>
                        <span className="font-medium">{Number(v).toFixed(4)}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* Iteraciones */}
            <div className="mt-6 space-y-6">
              <h3 className="text-base font-semibold">Iteraciones</h3>
              {data.iteraciones.map((it: Iteration) => (
                <div key={it.iteracion} className="overflow-auto rounded-xl border border-neutral-800">
                  <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm">
                    <span className="text-neutral-300">Iteración {it.iteracion}</span>
                    <span className="text-neutral-500">
                      entrante: {it.entrante ?? '—'} · saliente: {it.saliente ?? '—'}
                    </span>
                  </div>
                  <table className="min-w-full text-left text-sm">
                    <tbody>
                      {it.tabla.map((row: number[], rIdx: number) => (
                        <tr key={rIdx} className="border-b border-neutral-900/60">
                          {row.map((val: number, cIdx: number) => (
                            <td key={cIdx} className="px-3 py-2 font-mono text-[12px] text-neutral-200">
                              {Number.isFinite(val) ? Number(val).toFixed(4) : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
