# simplex/solver.py
from copy import deepcopy

class SimplexError(Exception):
    pass

def to_standard_form(tipo, c, A, b, signos):
    """
    Convierte a forma estándar para simplex (max, <=, b>=0).
    - Minimización: multiplicamos la función objetivo por -1.
    - Si algún b < 0, multiplicamos la fila completa por -1 y volteamos el signo.
    - Solo aceptamos <= en V1 (si hay otro signo, lanzamos error).
    Retorna:
      c_std (list), A_std (list[list]), b_std (list), n_vars, n_slacks
    """
    if tipo.lower() not in ("maximizar", "minimizar"):
        raise SimplexError("El campo 'tipo' debe ser 'maximizar' o 'minimizar'.")

    # Convertir minimización a maximización
    c_std = c[:] if tipo.lower() == "maximizar" else [-ci for ci in c]

    A_std = []
    b_std = []
    s_std = []

    m = len(A)
    n = len(c_std)

    if any(len(row) != n for row in A):
        raise SimplexError("Cada restricción debe tener el mismo número de variables que la función objetivo.")

    for i in range(m):
        bi = b[i]
        row = A[i][:]
        sign = signos[i]

        # Normalizar para b >= 0
        if bi < 0:
            bi = -bi
            row = [-x for x in row]
            if sign == "<=":
                sign = ">="
            elif sign == ">=":
                sign = "<="
            # '=' se mantiene '='

        if sign != "<=":
            # Para V1 solo <= (luego añadimos dos-fases para >= y =)
            raise SimplexError("En esta versión solo se aceptan restricciones '<='. Pronto agregamos >= y = (dos fases).")

        A_std.append(row)
        b_std.append(bi)
        s_std.append(sign)

    # Agregar variables de holgura (slacks)
    # Aumenta la matriz con identidad m x m
    n_slacks = len(A_std)
    for i in range(len(A_std)):
        for j in range(n_slacks):
            A_std[i].append(1.0 if i == j else 0.0)

    # c para holguras = 0
    c_std += [0.0] * n_slacks

    return c_std, A_std, b_std, n, n_slacks

def build_initial_tableau(c, A, b):
    """
    Construye el tableau:
    - Columnas: variables originales + slacks + RHS
    - Filas: m restricciones + fila de (Cj - Zj)
    Guardamos además la base inicial (slacks).
    """
    m = len(A)
    n_total = len(c)  # incluye slacks
    # Tabla numérica
    tableau = []
    basis = []  # índices de columnas básicas (slacks al inicio)
    for i in range(m):
        row = A[i][:] + [b[i]]
        tableau.append([float(x) for x in row])
        # La variable básica inicial es la slack correspondiente
        basis.append((n_total - m) + i)

    # Fila de Cj - Zj (inicialmente Zj = 0)
    cj = c[:]
    zj = [0.0] * n_total
    cj_zj = [cj[j] - zj[j] for j in range(n_total)]
    tableau.append(cj_zj + [0.0])  # última col para RHS en fila de Cj-Zj también

    return tableau, basis, cj

def choose_pivot(tableau):
    """
    Escoge pivote:
    - Columna entrante: la de mayor (Cj - Zj) positiva.
    - Fila saliente: prueba de razón mínima.
    Retorna (row, col). Si no hay col > 0 -> óptimo.
    """
    m = len(tableau) - 1  # última es fila Cj-Zj
    n = len(tableau[0]) - 1  # última col es RHS

    # Columna entrante
    last = tableau[-1]
    # mayor positivo
    max_val = 0.0
    pivot_col = -1
    for j in range(n):
        if last[j] > max_val + 1e-12:
            max_val = last[j]
            pivot_col = j
    if pivot_col == -1:
        return None  # óptimo

    # Fila saliente (razón mínima RHS / a_ij > 0)
    pivot_row = -1
    min_ratio = float("inf")
    for i in range(m):
        a_ij = tableau[i][pivot_col]
        if a_ij > 1e-12:
            ratio = tableau[i][-1] / a_ij
            if ratio < min_ratio - 1e-12:
                min_ratio = ratio
                pivot_row = i

    if pivot_row == -1:
        raise SimplexError("Solución no acotada (unbounded).")

    return (pivot_row, pivot_col)

def pivot_operation(tableau, pivot_row, pivot_col):
    """
    Realiza la operación de pivoteo: normaliza la fila pivote y anula la columna pivote en las demás filas.
    """
    m = len(tableau)
    n = len(tableau[0])

    # Normalizar fila pivote
    piv = tableau[pivot_row][pivot_col]
    for j in range(n):
        tableau[pivot_row][j] /= piv

    # Hacer ceros en la columna pivote
    for i in range(m):
        if i == pivot_row:
            continue
        factor = tableau[i][pivot_col]
        if abs(factor) > 1e-12:
            for j in range(n):
                tableau[i][j] -= factor * tableau[pivot_row][j]

def current_solution(tableau, basis, n_original_vars):
    """
    Devuelve valores de x1..xn y Z actual.
    """
    m = len(tableau) - 1
    n_total = len(tableau[0]) - 1
    x = [0.0] * n_original_vars
    for i in range(m):
        col = basis[i]
        if col < n_original_vars:  # solo reportamos variables originales, no slacks
            x[col] = tableau[i][-1]
    z = tableau[-1][-1]
    return x, z

def simplex_solve(payload):
    """
    payload esperado:
    {
      "tipo": "maximizar" | "minimizar",
      "objetivo": [c1, c2, ...],
      "restricciones": {
        "A": [[...], [...], ...],
        "b": [...],
        "signos": ["<=", "<=", ...]
      }
    }
    """
    tipo = payload.get("tipo", "").strip().lower()
    c = payload["objetivo"]
    A = payload["restricciones"]["A"]
    b = payload["restricciones"]["b"]
    signos = payload["restricciones"]["signos"]

    if len(c) > 4:
        raise SimplexError("Esta API soporta hasta 4 variables en V1.")

    # 1) Estandarización (convierte min a max, asegura <= y b>=0, agrega slacks)
    c_std, A_std, b_std, n_vars, n_slacks = to_standard_form(tipo, c, A, b, signos)

    # 2) Construir tableau y base inicial
    tableau, basis, cj = build_initial_tableau(c_std, A_std, b_std)

    # 3) Iteraciones
    iterations = []
    iter_count = 0
    while True:
        iter_count += 1
        # Guardar snapshot legible
        snap_table = [row[:] for row in tableau]
        entering = None
        leaving = None

        # Elegir pivote
        choice = choose_pivot(tableau)
        if choice is None:
            # Óptimo
            x_opt, z_opt = current_solution(tableau, basis, n_vars)
            iterations.append({
                "iteracion": iter_count,
                "tabla": snap_table,
                "entrante": entering,
                "saliente": leaving
            })
            # Si el problema original era minimización, recuerda que max(Z') = -min(Z)
            if tipo == "minimizar":
                z_opt = -z_opt
            return {
                "iteraciones": iterations,
                "resultado": {
                    "z": z_opt,
                    "valores": {f"x{i+1}": x_opt[i] if i < len(x_opt) else 0.0 for i in range(n_vars)}
                }
            }

        pr, pc = choice
        entering = pc
        leaving = basis[pr]

        # Pivoteo
        pivot_operation(tableau, pr, pc)
        basis[pr] = pc

        # Guardar snapshot post-pivote
        snap_after = [row[:] for row in tableau]
        iterations.append({
            "iteracion": iter_count,
            "tabla": snap_after,
            "entrante": f"x{pc+1}",
            "saliente": f"x{leaving+1}"
        })
