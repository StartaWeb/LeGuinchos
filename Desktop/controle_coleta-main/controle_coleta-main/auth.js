// ============================================================
//  auth.js — Proteção de rotas e controle de menu por perfil
//  Sistema de Controle de Coleta - Ebenezer
//  Perfis: admin | faturamento | consulta | whatsapp
// ============================================================

(function () {
  const PAGINA_ATUAL = window.location.pathname.split('/').pop() || 'index.html';

  // Configurações de Acesso por Perfil
  const PERFIS_CONFIG = {
    admin: {
      acesso: ['index.html', 'agendamento.html', 'consulta.html', 'retirada.html', 'fechamento.html', 'aprovacao.html', 'usuarios.html'],
      menu: [
        { href: 'index.html',       label: '🏷️ Etiquetas' },
        { href: 'agendamento.html', label: '📅 Agendar Coleta' },
        { href: 'consulta.html',    label: '🔍 Consultas' },
        { href: 'retirada.html',    label: '✅ Retirada' },
        { href: 'fechamento.html',  label: '📋 Fechamento' },
        { href: 'aprovacao.html',   label: '🗂️ Aprovar' },
        { href: 'usuarios.html',    label: '👥 Usuários' }
      ]
    },
    expedicao: {
      acesso: ['index.html', 'agendamento.html', 'consulta.html', 'retirada.html'],
      menu: [
        { href: 'index.html',       label: '🏷️ Etiquetas' },
        { href: 'agendamento.html', label: '📅 Agendar Coleta' },
        { href: 'consulta.html',    label: '🔍 Consultas' },
        { href: 'retirada.html',    label: '✅ Retirada' }
      ]
    },
    faturamento: {
      acesso: ['consulta.html', 'aprovacao.html'],
      menu: [
        { href: 'aprovacao.html',   label: '✅ Aprovar' },
        { href: 'consulta.html',    label: '🔍 Consultas' }
      ]
    },
    whatsapp: {
      acesso: ['consulta.html', 'fechamento.html'],
      menu: [
        { href: 'consulta.html',    label: '🔍 Consultas' },
        { href: 'fechamento.html',  label: '📋 Fechamento' }
      ]
    },
    consulta: {
      acesso: ['consulta.html'],
      menu: [
        { href: 'consulta.html',    label: '🔍 Consultas' }
      ]
    }
  };

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Busca perfil no Firestore
    let perfil = 'consulta';
    let nome   = user.email;
    try {
      const doc = await db.collection('usuarios').doc(user.uid).get();
      if (doc.exists) {
        perfil = doc.data().perfil || 'consulta';
        nome   = doc.data().nome   || user.email;
      }
    } catch (e) {
      console.warn('Perfil não encontrado — usando "consulta" por padrão.');
    }

    // Controle de acesso dinâmico
    const config = PERFIS_CONFIG[perfil] || PERFIS_CONFIG.consulta;
    
    // Se a página atual não estiver na lista de permitidas do perfil
    if (!config.acesso.includes(PAGINA_ATUAL)) {
      // Redireciona para a primeira página permitida do perfil
      window.location.href = config.acesso[0];
      return;
    }

    // Expõe globalmente
    window._perfilUsuario = perfil;
    window._nomeUsuario   = nome;

    // Atualiza menu
    atualizarNav(perfil, nome);

    // Notifica scripts que dependem do perfil
    window.dispatchEvent(new CustomEvent('authPronto', { detail: { perfil, nome } }));
  });

  function atualizarNav(perfil, nome) {
    const ul = document.querySelector('.menu ul');
    if (!ul) return;

    const config = PERFIS_CONFIG[perfil] || PERFIS_CONFIG.consulta;
    const links  = config.menu;

    ul.innerHTML = '';
    links.forEach(({ href, label }) => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="${href}" ${PAGINA_ATUAL === href ? 'style="font-weight:bold; color:#f50057;"' : ''}>${label}</a>`;
      ul.appendChild(li);
    });

    // Badge com nome + botão sair
    const liBadge = document.createElement('li');
    liBadge.innerHTML = `
      <div class="usuario-badge">
        <span class="usuario-nome">👤 ${nome}</span>
        <button class="btn-logout" id="btnLogout">Sair</button>
      </div>
    `;
    ul.appendChild(liBadge);

    document.getElementById('btnLogout').addEventListener('click', () => {
      firebase.auth().signOut().then(() => {
        window.location.href = 'login.html';
      });
    });
  }
})();
