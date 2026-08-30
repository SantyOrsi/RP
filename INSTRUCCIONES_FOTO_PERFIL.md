# 📸 Instrucciones: Cargar y Convertir Fotos a webP

He agregado la funcionalidad para que los usuarios puedan cargar una foto de perfil que se convierte automáticamente a formato webP y **se guarda directamente en la base de datos de Supabase**.

## ✅ Pasos de Setup

### 1️⃣ Actualizar la Base de Datos (Supabase)

Ve a tu proyecto de Supabase y ejecuta la migración:

1. Abre **Supabase → SQL Editor → New query**
2. Copia todo el contenido del archivo `MIGRACION_AVATAR.sql`
3. Ejecuta la query

Esto va a:
- Agregar la columna `avatar_data` a la tabla `profiles` (para guardar la imagen en base64)
- Actualizar la vista `public_profiles` para incluir `avatar_data`

¡Eso es todo! ✅ No necesitas crear buckets ni políticas de Storage.

## 🎨 Características Implementadas

### En el HTML (`perfil.html`):
- ✅ Avatar que muestra la foto guardada (o ícono por defecto)
- ✅ Botón para cambiar la foto (pequeño, en la esquina del avatar)
- ✅ Sección "MI FOTO DE PERFIL" con botón para cargar

### En el JavaScript (`perfil.js`):
- ✅ Conversión automática a webP usando Canvas API
- ✅ Vista previa instantánea después de seleccionar
- ✅ Guardado directo en la BD (sin Storage)
- ✅ Muestra de fotos anteriores al cargar el perfil
- ✅ Mensajes de estado y errores

### En el CSS (`perfil.css`):
- ✅ Estilos para el botón de cambiar foto
- ✅ Responsive y adaptado al diseño existente

## 🚀 Cómo Usar

1. **Accede tu perfil**: Ve a `perfil.html` (sin ?id=)
2. **Haz clic en "CARGAR FOTO"**: Se abrirá el explorador de archivos
3. **Selecciona una imagen**: JPG, PNG, GIF, WebP, etc.
4. **¡Listo!**: La foto se convertirá a webP y se guardará en la BD

Alternativamente, puedes hacer clic en el pequeño botón de edición en la esquina del avatar.

## 📋 Archivos Modificados

- `perfil.html` - Agregados: input de file, botón de cambiar foto, nueva sección
- `js/perfil.js` - Agregadas funciones: `convertirAWebP()`, `mostrarFotoGuardada()`, `configurarCargaFoto()`
- `css/perfil.css` - Agregados estilos para `.cambiar-foto-btn`
- `MIGRACION_AVATAR.sql` - Script para actualizar la BD

## ⚠️ Notas Importantes

- Las imágenes se convierten a **webP con calidad 0.8** (buen balance entre tamaño y calidad)
- Las imágenes se guardan como **base64 en la columna `avatar_data`** de la tabla `profiles`
- La funcionalidad solo aparece si **estás viendo tu propio perfil**
- Si tienes problemas, revisa la consola del navegador (F12) para ver mensajes de error

## 🔒 Seguridad

- Cada usuario solo puede actualizar su propio perfil (por las políticas RLS de Supabase)
- Las fotos se sirven desde `public_profiles` (vista pública que permite lectura)
- Los datos sensibles siguen protegidos en la tabla `profiles`

¡Listo! 🎉

