# Gestión para empresa de cerramientos de aluminio

App web para llevar las cuentas de un negocio de cerramientos: obras,
cobros a clientes, gastos, sueldos de empleados y, sobre todo, **cuánto
gana el negocio y cuánto le queda limpio al dueño**.

Es independiente de la app de turnos que está en la raíz de este repo
(tiene su propio `package.json`); se puede mover a su propio repositorio
cuando se quiera.

## Qué hace

- **Resumen**: por mes o por año completo muestra
  - Cobrado a clientes
  - Gastos del negocio (materiales, alquiler, combustible…)
  - Gastos de empleados (sueldos, adelantos, aguinaldo, cargas sociales)
  - **Ganancia neta** = cobrado − gastos − empleados
  - Lo que el dueño ya retiró y **lo que queda en el negocio**
  - Cuánto deben los clientes y cuánta plata debería haber en caja
  - Tabla mes a mes del año
- **Obras**: cada trabajo con precio pactado, señas y pagos, materiales
  usados y mano de obra. Calcula cuánto falta cobrar y cuánto dejó la obra
  (ganancia y margen %).
- **Gastos**: carga y listado por mes y categoría. Un gasto se puede
  asociar a una obra (para saber cuánto costó esa obra) o dejar como gasto
  general. Las categorías se editan en Configuración.
- **Empleados**: alta de empleados y registro de cada pago (sueldo, jornal,
  adelanto, aguinaldo, cargas sociales…), con historial por empleado.
- **Mis retiros**: la plata que el dueño saca para él. No se cuenta como
  gasto: se resta de la ganancia para ver cuánto queda en el negocio.

- **Importar Excel**: trae los datos de planillas viejas (.xlsx o .csv)
  para no cargar todo a mano. Se elige qué tiene la planilla (obras, cobros,
  gastos, pagos a empleados o retiros), la app adivina qué columna es cada
  dato (se puede corregir), muestra una vista previa con los errores fila
  por fila y recién ahí importa. Cada importación se puede **deshacer**.
  Conviene importar primero las obras y después cobros y gastos, para que
  se asocien a su obra por el nombre del cliente. Los `.xls` viejos hay que
  guardarlos antes como `.xlsx`.

Todo se cuenta "a caja": un ingreso cuenta el día que se cobró y un gasto
el día que se pagó.

## Stack

- Next.js (App Router, Server Actions) + TypeScript + Tailwind CSS
- NextAuth (usuario y contraseña) — toda la app es privada
- Los datos se guardan en un archivo JSON (`data/db.json`), sin base de
  datos externa. **Hacé copias de ese archivo seguido**: es toda la
  información del negocio.

## Primeros pasos

```bash
cd cerramientos-erp
npm install
cp .env.example .env.local   # y poné un AUTH_SECRET propio
npm run seed                 # crea el usuario para entrar
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). El seed imprime el
email y la contraseña (por defecto `admin@cerramientos.com` /
`cambiar123`); cambiala desde Configuración. Para elegir credenciales
propias:

```bash
ADMIN_EMAIL=tio@ejemplo.com ADMIN_PASSWORD=algoSeguro123 ADMIN_NAME="Carlos" npm run seed
```

Para ver la app con datos de ejemplo antes de cargar los reales:

```bash
rm -f data/db.json && npm run seed -- --demo
```

## Producción (Railway u otro hosting)

1. Crear el servicio apuntando a la carpeta `cerramientos-erp` como raíz.
2. Agregar un Volume (disco persistente) y poner `DATA_DIR` con su ruta de
   montaje; sin eso los datos se borran en cada deploy.
3. Definir `AUTH_SECRET` (por ejemplo `openssl rand -base64 32`) y, para el
   primer arranque, `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`.

## Desarrollo

```bash
npm test       # cálculos de ganancias, saldos y montos
npm run lint
npm run build
```

- `src/lib/finance.ts` — todos los cálculos de plata (resúmenes por
  período, rentabilidad por obra, saldos pendientes).
- `src/lib/actions.ts` — Server Actions de alta/edición/baja.
- `src/lib/import.ts` / `src/lib/import-apply.ts` — lectura de planillas
  (fechas, montos, columnas) y cómo se guardan/deshacen las importaciones.
- `src/lib/db.ts` — acceso al archivo JSON (lecturas/escrituras serializadas).

## Ideas para más adelante

- Presupuestos imprimibles / PDF para mandar al cliente.
- Cálculo de materiales por medidas de abertura (m² de vidrio, metros de
  perfil).
- Exportar a Excel para el contador.
- Varios usuarios (por ejemplo, alguien que solo carga gastos).
