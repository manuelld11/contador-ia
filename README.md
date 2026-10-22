# Contador de IA

Contador en pantalla gigante que escucha el micrófono y suma cada vez que alguien dice "IA" o "inteligencia artificial". Pensado para dejarlo corriendo en una pantalla u celular de oficina.

**App en vivo:** https://manuelld11.github.io/contador-ia/

## Cómo funciona

- Usa el reconocimiento de voz del navegador (`SpeechRecognition` / Web Speech API), en español, de forma continua.
- Cuenta la sigla **"IA"** (como palabra exacta, no dentro de palabras como "historia" o "experiencia") y la frase completa **"inteligencia artificial"**, sin contar doble cuando aparecen juntas.
- El conteo de hoy se guarda en `localStorage` del navegador, así que sobrevive a cerrar la pestaña/app. Vuelve a 0 automáticamente cada día, y el total del día anterior queda guardado en el historial.
- Botón **Reiniciar** para poner el contador de hoy en 0 manualmente, y botón **Historial** para ver los totales por día y el registro de menciones de hoy con su hora.

## Requisitos

- Chrome o Edge (el reconocimiento de voz del navegador no está disponible en todos los navegadores).
- Conexión a internet (el reconocimiento de voz usa un servicio en la nube).
- Un **contexto seguro** (HTTPS o `localhost`) para que el navegador permita usar el micrófono — por eso la app está publicada en GitHub Pages en vez de abrirse como archivo local.

## Usarlo en el celular

1. Abre la URL de arriba en Chrome (Android) o Safari (iPhone) y acepta el permiso de micrófono.
2. Menú del navegador → "Agregar a pantalla de inicio" para que quede como un ícono de app, a pantalla completa.
3. Déjalo cerca de donde se habla — mientras más cerca el micrófono, mejor detecta.

## Desarrollo local

Como el micrófono requiere un contexto seguro, no abras `index.html` con doble clic: sirve la carpeta con un servidor local y abre `http://localhost:8080`.

```
start.bat
```

(usa `python -m http.server 8080` por debajo). Al abrir como `file://` el micrófono puede no funcionar, y además `localStorage` quedaría en un origen distinto al de producción.

## Publicar cambios

El sitio se publica solo con GitHub Pages desde la rama `main` (carpeta raíz). Basta con:

```
git add -A
git commit -m "..."
git push
```

GitHub Pages tarda uno o dos minutos en reflejar los cambios.

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | Estructura de la página: contador, botones, modal de historial. |
| `style.css` | Estilos, tamaño gigante del número, animación al incrementar. |
| `app.js` | Reconocimiento de voz, detección de menciones, persistencia, historial. |
| `manifest.json` / `icon.svg` | Permiten "instalar" la app en la pantalla de inicio del celular. |
| `start.bat` | Levanta un servidor local para probar la app desde el PC. |

## Limitaciones conocidas

- La sigla "IA" es corta y a veces el motor de voz la confunde con palabras parecidas ("ya", "iba") — es una limitación del reconocimiento de voz gratuito del navegador, no de la lógica de conteo.
- El conteo vive en el navegador/dispositivo donde se usa; no se sincroniza entre varios celulares a la vez.
