// public/js/supabase-client.js
// Cliente único de Supabase, lo usan tanto la web pública (para leer
// eventos) como auth.html y admin.html (para login/registro y para
// cargar eventos). Se carga el SDK de Supabase por CDN en cada HTML
// antes que este archivo.

const SUPABASE_URL = 'https://lghvbajoelkqtnwlhqag.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_REH8wrYxQz6jveefsBbBgQ_GysaxRg0';

// La anon key es pública a propósito: Supabase la diseñó para vivir en
// el navegador. La seguridad real la dan las políticas RLS que están
// en supabase-schema.sql (nunca la "service_role", esa nunca va acá).
//
// flowType: 'implicit' es clave para que el link de verificación por
// mail funcione en CUALQUIER navegador/dispositivo (ej: te registrás
// en Chrome de la compu pero abrís el mail desde Safari en el celular).
// El otro modo ('pkce') exige que sea el mismo navegador donde te
// registraste, así que rompe justo en ese caso tan común.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { flowType: 'implicit' },
});