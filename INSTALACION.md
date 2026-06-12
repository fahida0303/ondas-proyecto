# Instalación y ejecución — Asistente de Resonancia

Aplicación web (React + Vite + TypeScript + Three.js) para localizar la resonancia de
un tubo y calcular la velocidad del sonido.

---

## 1. Requisitos previos

Hay que tener instalado en la PC:

| Programa | Versión recomendada | Dónde descargarlo |
|----------|---------------------|-------------------|
| **Node.js** | **20 LTS o superior** (22 LTS ideal) | https://nodejs.org (botón "LTS") |
| **npm** | Viene incluido con Node.js | — |

> ⚠️ **Importante:** Vite 8 necesita Node.js **20.19+** o **22.12+**. Con versiones más viejas
> dará error. Para comprobar la versión instalada, abrir una terminal y ejecutar:
> ```
> node -v
> npm -v
> ```

No hace falta instalar nada más (ni Python, ni bases de datos). Todas las librerías
(React, Three.js, etc.) se instalan automáticamente con `npm install`.

---

## 2. Pasos para abrir el proyecto

1. **Descomprimir** el archivo en una carpeta cualquiera.

2. Abrir una **terminal** dentro de esa carpeta:
   - Windows: clic derecho en la carpeta → *"Abrir en Terminal"* (o abrir PowerShell y usar `cd ruta\de\la\carpeta`).

3. **Instalar las dependencias** (solo la primera vez). Esto crea la carpeta `node_modules`:
   ```
   npm install
   ```

4. **Arrancar la aplicación** en modo desarrollo:
   ```
   npm run dev
   ```

5. La terminal mostrará una dirección como:
   ```
   ➜  Local:   http://localhost:5173/
   ```
   Abrir esa dirección en el navegador (**Chrome** o **Edge** recomendados).

6. Para **detener** el servidor: pulsar `Ctrl + C` en la terminal.

---

## 3. Permiso del micrófono

- La app pide acceso al **micrófono** para detectar la resonancia. Hay que pulsar **"Permitir"**
  cuando el navegador lo solicite.
- El micrófono funciona en `http://localhost:5173` sin problema (es un contexto seguro).
- El **Predictor de Resonancia** (simulación con el slider) funciona **sin micrófono**.

---

## 4. (Opcional) Versión de producción

Para generar una versión optimizada y servirla:
```
npm run build      # crea la carpeta dist/
npm run preview    # sirve dist/ en http://localhost:4173/
```

---

## 5. Antes de comprimir y enviar

Para que el archivo no pese cientos de MB, **NO incluir** estas carpetas (se regeneran con
`npm install` / `npm run build`):

- `node_modules/`
- `dist/`

Quien reciba el proyecto solo necesita ejecutar `npm install` y luego `npm run dev`.

---

## 6. Solución de problemas

| Problema | Solución |
|----------|----------|
| `npm: no se reconoce...` | No está instalado Node.js. Instalarlo desde nodejs.org y reiniciar la terminal. |
| Error de versión / `EBADENGINE` | La versión de Node es vieja. Instalar Node 20 LTS o superior. |
| `npm install` falla a medias | Borrar `node_modules` y el archivo `package-lock.json` no es necesario; volver a ejecutar `npm install`. |
| El micrófono no se detecta | Revisar que el navegador tenga permiso (candado junto a la URL) y que haya un micrófono conectado. |
| La página queda en blanco | Verificar que `npm run dev` siga corriendo y abrir la URL exacta que muestra la terminal. |
