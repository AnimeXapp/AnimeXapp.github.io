# AnimeX — Landing Page

Sitio estático que sirve como punto de descarga del APK de AnimeX y como
manifest fuente para el auto-updater de la app.

**URL pública:** `https://animexapp.github.io/`
**Repo:** `https://github.com/AnimeXapp/AnimeXapp.github.io`

## Estructura

```
web/
├── index.html      ← landing principal
├── styles.css
├── script.js       ← carga latest.json y configura botones de descarga
├── latest.json     ← manifest con la versión actual (la app la consume)
├── assets/         ← logo, fondo, ícono (copiados de la app)
└── releases/       ← aquí van los APK firmados (animex-X.Y.Z.apk)
```

## Activar GitHub Pages (primera vez)

1. Ir a **https://github.com/AnimeXapp/AnimeXapp.github.io/settings/pages**
2. **Source**: Branch `main` / `(root)` → **Save**
3. Esperar 1-2 minutos. La URL final será:
   `https://animexapp.github.io/`

## Publicar una nueva versión

Cuando saques v1.1.0:

1. En el proyecto AnimeX:
   ```bash
   flutter build apk --release
   ```

2. Copiar `build/app/outputs/flutter-apk/app-release.apk` a
   `web/releases/animex-1.1.0.apk`.

3. Editar `web/latest.json`:
   ```json
   {
     "version": "1.1.0",
     "build_number": 2,
     "url": "animex-1.1.0.apk",
     "release_notes": "Qué cambió en esta versión",
     "released_at": "2026-XX-XX",
     "required": false
   }
   ```

4. Push a GitHub:
   ```bash
   cd web
   git add releases/animex-1.1.0.apk latest.json
   git commit -m "release: v1.1.0"
   git push
   ```

5. ✅ Todos los usuarios verán el aviso al abrir la app dentro de las próximas
   6 horas (intervalo de chequeo del cliente).

## Importante: firma del APK

Para que el update funcione (instalar encima de una versión anterior), todos
los APK deben estar firmados con el **mismo keystore**. Si firmas con otro,
Android rechazará la instalación por mismatch de firma.

Si es la primera vez que firmas:

```powershell
keytool -genkey -v -keystore animex-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias animex
```

Luego configura `android/app/build.gradle.kts` con la signing config y
**guarda bien el keystore** — sin él no podrás publicar updates futuras.

## Probar el auto-updater

Una vez desplegada la web, para verificar que la app detecta updates:

1. Editar `latest.json` → cambiar `"version": "1.0.0"` por `"version": "1.0.1"`
2. Push
3. Esperar máx 6h o resetear `SharedPreferences` de la app:
   - Configuración del teléfono → Apps → AnimeX → Almacenamiento → Borrar datos
   - Reabrir la app → debería aparecer el dialog "Nueva versión disponible"
