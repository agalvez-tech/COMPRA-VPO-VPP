# Calculadora VPP/VPO — RK Palanca Fontestad

Herramienta interna para que los agentes comprueben si un comprador es apto para vivienda de protección pública (VPP/VPO) en la Comunitat Valenciana, según el Decreto 180/2024.

## Desarrollo local

```bash
npm install
npm run dev
```

## Build de producción

```bash
npm run build
```

Genera la carpeta `dist/` lista para servir como sitio estático.

## Despliegue en Vercel

**Opción A — desde la CLI:**
```bash
npm install -g vercel
vercel
```
Sigue las instrucciones (framework detectado automáticamente: Vite).

**Opción B — desde GitHub:**
1. Sube este proyecto a un repo (p. ej. `agalvez-tech/rk-vpo-calculator`).
2. En Vercel → "Add New Project" → importa el repo.
3. Vercel detecta Vite automáticamente (`npm run build`, output `dist`). No requiere variables de entorno.
4. Deploy.

## Constantes a revisar cada año

En `src/App.jsx`, parte superior del archivo:

```js
const IPREM_ANUAL_12 = 7200; // IPREM vigente, 12 pagas
const MULTIPLICADOR_GENERAL = 6.5; // Régimen General
const MULTIPLICADOR_JOVEN = 5.5;   // Vivienda Joven (≤35 años)
```

El IPREM se actualiza (o se prorroga) cada año en los Presupuestos Generales del Estado — conviene revisarlo cada enero.

## Notas

- Esta herramienta es una orientación interna, no sustituye el visado administrativo del contrato por la Generalitat Valenciana ni la inscripción en el Registro de Demandantes de Vivienda Protegida.
- Los incrementos del límite de renta por discapacidad, familia numerosa, monoparental o edad no están automatizados — el resultado avisa cuando el cliente está muy cerca del límite para que se revise el caso a mano.
