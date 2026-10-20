// textos-legales.mjs — Escribe documentos/textos-legales.md: TODO lo que el juego le dice a la gente sobre el premio, los datos
// y el local, tal como lo va a leer, para que lo revise una persona (la dueña, su mamá, un abogado si quieren) sin abrir el código.
//
//   Uso:  npm run textos-legales     (se vuelve a escribir cada vez que cambies web/js/textos.js)
//
// Los números (días, premios, compra mínima, regalos…) salen de los VALORES DE FÁBRICA de web/js/config.js; en el juego real salen
// del servidor (panel → Configuración), así que ese texto cambia solo si cambias una regla.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../web/js/config.js';
import { LOCAL, T, listaRegalos, pesos } from '../web/js/textos.js';

const md = (s) => String(s)
  .replace(/<b>(.*?)<\/b>/g, '**$1**')
  .replace(/<i>(.*?)<\/i>/g, '_$1_')
  .replace(/<br\s*\/?>/g, '  \n')
  .replace(/ /g, ' ');

const r = { ...CONFIG.reglas, cupoDiario: 0, campana: null };
const dia = (ms) => new Date(ms).toISOString().slice(0, 10);
const condiciones = T.condiciones.lista(r, dia, r.intentosPorSemana, r.premiosPorSemana, CONFIG.partida.frutasMinimas);

const texto = `# Textos legales y del premio — para revisar

> Generado con \`npm run textos-legales\` a partir de \`web/js/textos.js\` (**no lo edites a mano**: si quieres cambiar algo, dile a Claude qué frase, o edita \`web/js/textos.js\` y vuelve a correr el comando). Los números salen de los valores de fábrica; en el juego real los manda el servidor (panel → Configuración).
>
> **Para quien revisa (la dueña, su mamá, un abogado si quieren):** lee cada bloque tal como lo verá la gente y marca lo que cambiarías. Esto es un texto razonable para un juego promocional pequeño, **no es asesoría legal**: si el negocio crece, vale la pena que un abogado lo mire una vez. Marco de referencia: Ley 1581 de 2012 (protección de datos personales, Colombia).

## 1. Datos del local (salen en el código del cliente)

- Dirección: **${LOCAL.direccion}**
- ${LOCAL.dias}, ${md(LOCAL.horas)}
- Responsable de los datos: **${LOCAL.responsableDatos}**
- Correo para consultar, corregir o borrar datos: **${LOCAL.correoContacto}**

## 2. «Condiciones de la promoción» (botón «Condiciones», en el inicio, en el formulario y en el ticket)

${condiciones.map((c, i) => `${i + 1}. ${md(c)}`).join('\n')}

## 3. Al ganar: el formulario

- Texto de arriba: ${md(T.ganaste.ventana())}
- Casilla (sin premarcar, obligatoria): «${md(T.ganaste.consentimiento)}»
- Resumen bajo la casilla: ${md(T.ganaste.resumen(r))}
- Botón: «${T.ganaste.boton}»

### Política de datos (botón «${T.ganaste.verPolitica}»)

${md(T.ganaste.politica.texto(LOCAL.responsableDatos, LOCAL.correoContacto))}

## 4. «¿Cómo se juega?» — la parte del premio

${md(T.ayuda.premio(r.compraMinima, r.regalos))}

## 5. El ticket del código

${T.codigo.pasos(r.compraMinima, r.regalos).map((p, i) => `${i + 1}. ${md(p)}`).join('\n')}

Cuadro «${T.codigo.canjeaAqui}»: **${LOCAL.direccion.toUpperCase()}** · ${LOCAL.dias} · **${md(LOCAL.horas)}**

## 6. Lo que debe cumplirse en la práctica (no está en el texto del juego)

- **Los datos se guardan hasta 6 meses después de que termine la campaña** y luego se borran. Cómo: \`documentos/operacion-corta.md\` («Borrar los datos personales»). **Anótalo en el calendario** el día que cierres la campaña.
- Si alguien escribe a **${LOCAL.correoContacto}** pidiendo consultar, corregir o borrar sus datos, hay que responderle y hacerlo (receta en \`documentos/guia-del-administrador.md\`, sección 7). La Ley 1581 (arts. 14 y 15) da **10 días hábiles** para atender una consulta y **15 días hábiles** para un reclamo.
- Los datos viven en Supabase (servidores fuera de Colombia): la política lo dice.
- El nombre y el celular **solo** se piden al ganar, con casilla de autorización sin premarcar; sin autorización no hay código.
- La caja **no ve** el nombre ni el celular del cliente; solo el administrador los ve.
`;

await writeFile(fileURLToPath(new URL('../documentos/textos-legales.md', import.meta.url)), texto, 'utf8');
console.log('Listo: documentos/textos-legales.md');
void listaRegalos;
void pesos;
