# Operación corta — lo de todos los días en una hoja

Cinco tareas. Todas se hacen desde el **panel de administrador** (`https://cholados-la-india.github.io/admin/`); el SQL (Supabase → SQL Editor) es solo para lo que el panel no hace. Si algo no sale como aquí, mira `03-guia-del-administrador.md` («¿qué hago si pasa esto?»).

Última actualización: 2026-10-20, noche (Etapa 7).

## 1. Cambiar la configuración
Panel → **Configuración** → cambia lo que quieras → **Guardar cambios** (si un valor está mal, no se guarda nada y te dice cuál). Se aplica **al instante** a todo el mundo. Lo más usado:

| Quiero… | Dónde |
|---|---|
| Más o menos premios por semana | «Premios por semana» |
| Repartir premios por día (cupo diario) | «Cupo diario (opcional)» → activar y poner cuántos |
| Más intentos | «Intentos por semana» |
| Cambiar los regalos o la compra mínima | «Regalos que se pueden elegir en caja» y «Compra mínima» |
| Que el juego sea más fácil o difícil | «Partida y dificultad» (empieza por «frutas mínimas») |
| Poner fechas a la campaña | «Campaña (temporada)» |

## 2. Cambiar el PIN de la caja
Panel → **Cuenta** → «PIN nuevo» y «Repite el PIN» → **Cambiar PIN**. 4 a 8 números (mejor 6; no `1234` ni repetidos). El PIN anterior deja de servir al instante. Díselo **solo** a quien atiende; **nunca** lo escribas en el chat con Claude ni en un archivo. Si la caja se bloqueó por PIN malos: Cuenta → **Desbloquear ahora**.

## 3. Ver los canjes
- **Resumen:** «Canjes en caja esta semana» y el embudo («Del juego a la caja»).
- **Códigos:** filtro **Canjeados** (con fecha, hora y regalo elegido) y buscador por código, nombre o celular.
- **De dónde vienen:** Resumen → «¿De dónde vienen los jugadores?» (mostrador, vasos, instagram, facebook).
- **A una hoja de cálculo:** Códigos → **Exportar CSV** (o Cuenta → «Descargar todos los códigos»). Trae nombres y celulares: guárdalo en un lugar privado.

## 4. Cerrar la temporada
1. **Cerrar el juego:** panel → Configuración → «Campaña (temporada)» → pon la **fecha y hora de fin** → Guardar. Desde ese momento **nadie puede empezar partidas nuevas**. (O en SQL, para cerrar ya mismo:)

```sql
update app.configuracion set campana_inicio = null, campana_fin = now() where id = 1;
```

2. **Los códigos que ya existen siguen valiendo** hasta su vencimiento (7 días) y la caja los sigue canjeando. Si quieres que no se canjee ninguno más desde hoy, desactívalos (Códigos → filtro Activos → Desactivar uno por uno, o en SQL):

```sql
update app.codigos set estado = 'desactivado' where estado = 'activo';
```

3. **Guarda el resultado:** Resumen (captura de pantalla de los números y de «¿De dónde vienen los jugadores?», con «Todo») y **Exportar CSV** (Cuenta). Guárdalos en un lugar privado.
4. **Pon una alarma en el calendario para 6 meses después de la fecha de cierre:** ese día se borran los datos personales (siguiente punto). La política de datos que ve la gente promete exactamente eso.
5. **Una temporada nueva:** vuelve a abrir poniendo nuevas fechas en «Campaña» (o déjalas vacías = siempre abierta). Si cambias la campaña de los QR: `npm run qr -- --campana=nombre-nuevo` (`05-publicacion.md` §D).

## 5. Borrar los datos personales al terminar
La política dice: **los datos se conservan hasta 6 meses después de que termine la campaña y luego se borran.** El día de la alarma:

1. **Primero haz el respaldo** si lo quieres (Cuenta → «Descargar todos los códigos»), porque después no se puede recuperar el nombre ni el celular.
2. En Supabase → SQL Editor, pega esto **cambiando la fecha por el día en que terminó la campaña** (hora de Bogotá, `-05`). Deja los códigos y las estadísticas, y **borra el nombre y el celular** de todos los códigos expedidos hasta esa fecha:

```sql
update app.codigos set nombre = '(borrado)', celular = '3000000000'
where emitido_en <= '2027-06-30 23:59:59-05' and nombre <> '(borrado)';
```

3. **Comprueba** que ya no queda ningún dato personal de esa campaña (debe decir 0):

```sql
select count(*) as con_datos_personales from app.codigos where emitido_en <= '2027-06-30 23:59:59-05' and nombre <> '(borrado)';
```

4. Si prefieres **borrar todo** (códigos, partidas y contadores) y empezar de cero: `04-guia-rapida.md` 5.1. **Nunca** con clientes reales que aún tengan un código vigente.
5. **Si una persona te escribe pidiendo que borres sus datos antes de ese plazo:** `03-guia-del-administrador.md` §7 (hay una receta para una sola persona). Respóndele por correo cuando esté hecho.
