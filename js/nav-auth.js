// public/js/nav-auth.js
// Cambia los botones "INICIAR SESIÓN" / "UNITE A RPM" del nav por
// "MI PERFIL" / "CERRAR SESIÓN" cuando hay una sesión iniciada.

async function actualizarNavSegunSesion() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  const loginLinks = [document.getElementById('navLoginLink'), document.getElementById('navLoginLinkMobile')];
  const joinBtns = [document.getElementById('navJoinBtn'), document.getElementById('navJoinBtnMobile')];

  if (!session) return; // Se queda con "Iniciar sesión" / "Unite a RPM" (el estado por defecto del HTML).

  loginLinks.forEach(link => {
    if (!link) return;
    link.textContent = 'MI PERFIL';
    link.href = 'perfil.html';
  });

  joinBtns.forEach(btn => {
    if (!btn) return;
    btn.textContent = 'CERRAR SESIÓN';
    btn.href = '#';
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabaseClient.auth.signOut();
      window.location.reload();
    });
  });
}

actualizarNavSegunSesion();
