// supabase-config.js — Dónde está el servidor (Supabase). Estos dos datos son PÚBLICOS por diseño: van dentro del
// juego que baja todo el mundo, y es seguro que estén en el repo. La seguridad la dan las reglas del servidor
// (las tablas están cerradas y solo se llega a ellas por las funciones).
//
// ⚠️  NUNCA pegues aquí la "secret key", la "service_role" ni la contraseña de la base de datos.
//
// Mientras `url` o `clave` estén vacías, el juego usa la API falsa local (api-falsa.js).
// También se puede forzar la falsa con  ?api=falsa  (útil para calibrar sin gastar intentos del servidor).
export const SUPABASE = {
  url: 'https://vaphorsfnfuebfjuhmof.supabase.co', // proyecto "cholado-runner" (sin /rest/v1: el juego lo agrega)
  clave: 'sb_publishable_PmO2G7rUo-H1PYdxO0RgwA_AuzvQpBQ', // "publishable key": pública por diseño
};
