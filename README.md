
<body>
<main>
  <h1>🚀 Cómo correr el proyecto: API (Django) + Web (Vite)</h1>
  <p class="tip">Esta guía asume Windows, pero los comandos funcionan igual en macOS/Linux (cambia <code>py</code> por <code>python3</code> si hace falta).</p>

  <div class="card">
    <h2>📦 Prerrequisitos</h2>
    <ul>
      <li><strong>Python 3.11+</strong> y <code>pip</code> disponibles.</li>
      <li><strong>Node 18+</strong> y <strong>pnpm</strong> instalado (<code>npm i -g pnpm</code>).</li>
      <li><strong>Git</strong> para clonar el repo.</li>
    </ul>
  </div>

  <div class="card">
    <h2>🧭 Estructura esperada del repo</h2>
    <pre>root/
├─ simplex_api/           ← backend Django (proyecto + app)
│  ├─ manage.py
│  └─ requirements.txt    ← dependencias del backend
└─ simplex_web/           ← frontend Vite + React + TS
   ├─ index.html
   ├─ package.json
   └─ src/</pre>
    <p class="tip">Si tus carpetas se llaman distinto, adapta los comandos.</p>
  </div>

  <div class="card">
    <h2>⚙️ 1) Preparar y correr la API (Django)</h2>
    <div class="steps">
      <ol>
        <li>Abre una terminal en la carpeta del repo raíz.</li>
        <li>Entra al backend:
<pre>cd simplex_api</pre></li>
        <li>(Recomendado) Crea y activa un entorno virtual:
<pre>py -m venv .venv
.venv\Scripts\activate</pre>
<p class="tip">En macOS/Linux: <code>python3 -m venv .venv && source .venv/bin/activate</code></p></li>
        <li>Instala dependencias:
<pre>pip install -r requirements.txt</pre></li>
        <li>Aplica migraciones (si corresponde):
<pre>py manage.py migrate</pre></li>
        <li>(Opcional) Crea un superusuario para admin:
<pre>py manage.py createsuperuser</pre></li>
        <li>Habilita CORS si el frontend corre en otro origen (dev):
<pre># settings.py
INSTALLED_APPS += ["corsheaders"]
MIDDLEWARE = ["corsheaders.middleware.CorsMiddleware", *MIDDLEWARE]
CORS_ALLOW_ALL_ORIGINS = True  # solo para desarrollo</pre></li>
        <li>Corre el servidor de desarrollo:
<pre>py manage.py runserver</pre>
        <p>La API quedará en <code class="ok">http://127.0.0.1:8000</code>.</p>
        </li>
      </ol>
    </div>
  </div>

  <div class="card">
    <h2>🌐 2) Preparar y correr la Web (Vite + React)</h2>
    <div class="steps">
      <ol>
        <li>Abre <em>otra</em> terminal (segunda ventana) en el repo y entra al frontend:
<pre>cd simplex_web</pre></li>
        <li>Crea un archivo <code>.env</code> en <code>simplex_web/</code> con la URL de la API:
<pre>VITE_API_BASE_URL=http://127.0.0.1:8000</pre></li>
        <li>Instala dependencias del frontend:
<pre>pnpm install</pre></li>
        <li>Arranca Vite:
<pre>pnpm dev</pre>
        <p>Abre <code class="ok">http://localhost:5173</code> en el navegador.</p>
        </li>
      </ol>
    </div>
  </div>

  <div class="card two-col">
    <div>
      <h2>🔌 3) Probar conexión API ↔ Front</h2>
      <ol>
        <li>Con ambos servidores activos, ve a la página principal.</li>
        <li>Abre DevTools (F12) → pestaña <strong>Network</strong>.</li>
        <li>Ejecuta una acción que llame a la API (por ejemplo, enviar el formulario).</li>
        <li>Deberías ver peticiones a <code>/api/...</code> con estado <span class="ok">200</span>.</li>
      </ol>
      <p class="tip">Si ves <span class="err">CORS</span> o <span class="err">Network Error</span>, revisa <strong>CORS</strong> en Django y el valor de <code>VITE_API_BASE_URL</code>.</p>
    </div>
    <div>
      <h2>🧪 4) Comandos útiles</h2>
      <pre># Backend (en ./simplex_api)
py manage.py runserver
py manage.py test

# Frontend (en ./simplex_web)
pnpm dev
pnpm build
pnpm preview  # sirve /dist en http://localhost:4173</pre>
    </div>
  </div>

  <div class="card">
    <h2>🛠️ Solución de problemas comunes</h2>
    <ul>
      <li><span class="warn">La web queda en blanco</span>: abre la Consola (F12 → Console) y corrige los errores rojos. Revisa bucles en <code>useEffect</code> o <code>setState</code> durante el render.</li>
      <li><span class="warn">API responde pero el front marca 404</span>: confirma que las rutas de la API existen (visítalas directo en <code>http://127.0.0.1:8000/tu-endpoint/</code>) y que el cliente usa <code>VITE_API_BASE_URL</code> correcto.</li>
      <li><span class="warn">“VITE_API_BASE_URL no está definida”</span>: crea el archivo <code>.env</code> en la carpeta del frontend y reinicia Vite.</li>
      <li><span class="warn">CORS bloquea</span>: en dev usa <code>CORS_ALLOW_ALL_ORIGINS = True</code> o <code>CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]</code>.</li>
      <li><span class="warn">Puerto ocupado</span>: corre <code>pnpm dev -- --port 5174</code> o <code>py manage.py runserver 8001</code>.</li>
    </ul>
  </div>
</main>
</body>
</html>
