// juntar-sql.mjs — Arma UN solo archivo con todo el SQL del servidor, listo para pegar de una vez en Supabase.
//
//   Uso:  npm run sql        →  escribe  supabase/todo-junto.sql
//
// Contiene, en orden: 0001_tablas + 0002_funciones + 0003_staff_admin + 0004_canales + la auditoría de permisos.
// Es seguro volver a pegarlo cuantas veces quieras: no borra datos (usa "if not exists" y "create or replace").
// Úsalo cuando se actualice algo del servidor (así no hay que pegar archivo por archivo).
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ARCHIVOS = ['migrations/0001_tablas.sql', 'migrations/0002_funciones.sql', 'migrations/0003_staff_admin.sql', 'migrations/0004_canales.sql', 'sql/auditoria_permisos.sql'];
const RUTA = fileURLToPath(new URL('../supabase/todo-junto.sql', import.meta.url));

export async function armar() {
  let t = `-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- todo-junto.sql — TODO el SQL del servidor de Cholado Runner en un solo archivo (GENERADO: no lo edites a mano)
--
-- CÓMO USARLO: Supabase → SQL Editor → «+» → Create a new snippet → pega TODO este archivo → Run.
-- Es seguro volver a pegarlo (no borra datos). Al final aparece una tabla: debe decir «✅ Todo en orden».
-- Si Supabase muestra un aviso amarillo («Potential issue», RLS…), elige «Run this query»: las tablas sí quedan protegidas.
-- Para regenerarlo después de cambiar algo en supabase/migrations/:  npm run sql
-- ════════════════════════════════════════════════════════════════════════════════════════════════
`;
  for (const a of ARCHIVOS) {
    const contenido = await readFile(new URL(`../supabase/${a}`, import.meta.url), 'utf8');
    t += `\n\n-- ┌───────────────────────────── ${a} ─────────────────────────────\n${contenido.replace(/\r\n/g, '\n').replace(/\s*$/, '')}\n`;
  }
  return t;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const t = await armar();
  await writeFile(RUTA, t, 'utf8');
  console.log(`Listo: supabase/todo-junto.sql (${Math.round(t.length / 1024)} KB, ${t.split('\n').length} líneas).`);
  console.log('Pégalo en Supabase → SQL Editor → «+» → Create a new snippet → Run. Al final debe decir «✅ Todo en orden».');
}
