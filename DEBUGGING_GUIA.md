# 🔍 Guía de Debugging - Problemas de Autenticación

## Cómo abrir la Consola del Navegador

### Chrome / Brave
1. Presiona: `F12` o `Ctrl + Shift + I` (Windows) / `Cmd + Option + I` (Mac)
2. Selecciona la pestaña **"Console"** (Consola)

### Firefox
1. Presiona: `F12` o `Ctrl + Shift + I` (Windows) / `Cmd + Option + I` (Mac)
2. Selecciona la pestaña **"Console"** (Consola)

### Edge
1. Presiona: `F12` o `Ctrl + Shift + I`
2. Selecciona la pestaña **"Console"**

---

## Qué ver en la Consola

### ✅ Si TODO funciona correctamente, deberías ver:

```
🔍 Auth Debug: Script loaded
✅ Supabase client initialized
🎯 Turnstile Ready triggered
✅ Auth Debug: Ready to monitor
```

### ❌ Si hay problemas, busca mensajes rojos:

#### Problema 1: Turnstile no funciona
```
⚠️ Turnstile not ready for login!
```
**Solución:** Espera a que se cargue la página completamente, o revisa si hay error de red.

#### Problema 2: Login fallido
Cuando intentes iniciar sesión, verás uno de estos errores:

```
🔴 Error raw: Invalid login credentials
```
→ El email o contraseña son incorrectos

```
🔴 Error raw: Email not confirmed
```
→ Debes confirmar tu email primero (revisa el correo)

```
🔴 Error raw: Network error
```
→ Problema de conexión a internet

#### Problema 3: Registro fallido
Cuando intentes crear cuenta:

```
🔴 Error raw: User already registered
```
→ Ese email ya tiene una cuenta registrada

```
🔴 Error raw: over_email_send_rate_limit
```
→ Intentaste crear demasiadas cuentas. Espera 10 minutos.

---

## Pasos para Diagnosticar

### 1️⃣ Verifica que Supabase esté conectado
Escribe en la consola:
```javascript
console.log(supabaseClient)
```
Deberías ver un objeto, NO `undefined`

### 2️⃣ Verifica que Turnstile esté listo
Escribe en la consola:
```javascript
console.log({
  turnstileReady: typeof window.turnstile !== 'undefined',
  turnstileLoginId: window.turnstileLoginId,
  turnstileRegisterId: window.turnstileRegisterId
})
```

### 3️⃣ Intenta el login manualmente (para testing)
Escribe en la consola:
```javascript
await supabaseClient.auth.signInWithPassword({
  email: 'tu@email.com',
  password: 'tu_contraseña'
})
```

### 4️⃣ Verifica el estado de autenticación
Escribe en la consola:
```javascript
const session = await supabaseClient.auth.getSession()
console.log(session)
```

---

## 📧 Problema: No llegan emails de confirmación

Esto podría ser por:

1. **Email en SPAM** → Revisa la carpeta de spam
2. **Dominio bloqueado** → Usa otro email (Gmail, Hotmail, etc.)
3. **Supabase no configurado** → El administrador debe configurar SMTP en Supabase
4. **Rate limit** → Esperaste menos de 1 minuto, intenta en 1 minuto

**Para testing sin email:**
Si estás en desarrollo y no recibes emails, pídele al administrador que:
1. Vaya a Supabase Dashboard
2. Desactive "Email confirmations required" temporalmente
3. O configure un proveedor de email real

---

## 🚀 Cuando veas los mensajes en la consola

**Copia y pega EXACTAMENTE lo que ves en la consola roja/naranja aquí:**

`[PEGA LOS ERRORES AQUÍ]`

Eso me ayudará a diagnosticar exactamente qué está fallando.
