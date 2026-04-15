// ============================================================
//  firebase-config.js — Configuração e helpers do Firestore
//  Sistema de Controle de Coleta - Ebenezer
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyA7K5x9Z96Zaswff7cz4DaazFlvyDd4jNg",
  authDomain: "ebenezer-coletas.firebaseapp.com",
  projectId: "ebenezer-coletas",
  storageBucket: "ebenezer-coletas.firebasestorage.app",
  messagingSenderId: "697358210840",
  appId: "1:697358210840:web:4ad486df9294443e5db06d",
  measurementId: "G-ZGXJ44551B"
};

// Inicializa o Firebase (safe: evita inicializar duas vezes)
if (!firebase.apps || firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// ─────────────────────────────────────────────
//  HELPERS — ETIQUETAS (Editar / Excluir)
// ─────────────────────────────────────────────

/**
 * Exclui uma etiqueta do Firestore pelo ID.
 */
async function excluirEtiqueta(id) {
  await db.collection('etiquetas').doc(id).delete();
}

/**
 * Atualiza campos de uma etiqueta existente.
 */
async function atualizarEtiqueta(id, dados) {
  mostrarStatusConexao(true);
  await db.collection('etiquetas').doc(id).update({
    ...dados,
    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Exclui uma coleta do Firestore pelo ID.
 */
async function excluirColeta(id) {
  await db.collection('coletas').doc(id).delete();
}

/**
 * Exclui um fechamento do Firestore pelo ID.
 */
async function excluirFechamento(id) {
  await db.collection('fechamentos').doc(id).delete();
}


// ─────────────────────────────────────────────
//  INDICADOR DE CONEXÃO
// ─────────────────────────────────────────────
function mostrarStatusConexao(online) {
  let badge = document.getElementById('conexao-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'conexao-badge';
    badge.style.cssText = `
      position: fixed; bottom: 18px; right: 18px; z-index: 9999;
      padding: 8px 16px; border-radius: 20px; font-size: 13px;
      font-weight: 600; font-family: 'Inter', sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.4s ease; cursor: default;
    `;
    document.body.appendChild(badge);
  }
  if (online) {
    badge.textContent = '🟢 Conectado ao banco';
    badge.style.background = 'rgba(139, 195, 74, 0.95)';
    badge.style.color = '#fff';
  } else {
    badge.textContent = '🔴 Sem conexão';
    badge.style.background = 'rgba(245, 0, 87, 0.95)';
    badge.style.color = '#fff';
  }
}

// ─────────────────────────────────────────────
//  HELPERS — COLETAS
// ─────────────────────────────────────────────

/**
 * Salva uma nova coleta no Firestore.
 * Retorna o ID do documento criado.
 */
async function salvarColeta(coleta) {
  mostrarStatusConexao(true);
  const docRef = await db.collection('coletas').add({
    ...coleta,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

/**
 * Obtém o próximo número sequencial de coleta.
 * Usa um documento contador no Firestore.
 */
async function proximoNumeroColeta() {
  const contadorRef = db.collection('_contadores').doc('coletas');
  let numero = 1;
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(contadorRef);
    if (!doc.exists) {
      transaction.set(contadorRef, { atual: 1 });
      numero = 1;
    } else {
      numero = (doc.data().atual || 0) + 1;
      transaction.update(contadorRef, { atual: numero });
    }
  });
  return `COLETA-${String(numero).padStart(4, '0')}`;
}

/**
 * Atualiza campos de uma coleta existente.
 * @param {string} id - ID Firestore do documento
 * @param {object} dados - campos a atualizar
 */
async function atualizarColeta(id, dados) {
  mostrarStatusConexao(true);
  await db.collection('coletas').doc(id).update({
    ...dados,
    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Escuta coletas em tempo real.
 * @param {function} callback - chamado com array de coletas sempre que houver mudança
 * @returns função para cancelar o listener
 */
function ouvirColetas(callback) {
  return db.collection('coletas')
    .orderBy('criadoEm', 'desc')
    .onSnapshot(
      (snapshot) => {
        mostrarStatusConexao(true);
        const coletas = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
        callback(coletas);
      },
      (error) => {
        console.error('Erro ao escutar coletas:', error);
        mostrarStatusConexao(false);
      }
    );
}

/**
 * Busca coletas uma única vez (sem listener).
 */
async function carregarColetasOnce() {
  mostrarStatusConexao(true);
  const snapshot = await db.collection('coletas').orderBy('criadoEm', 'desc').get();
  return snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
}

// ─────────────────────────────────────────────
//  HELPERS — ETIQUETAS
// ─────────────────────────────────────────────

/**
 * Salva um registro de etiqueta gerada no Firestore.
 */
async function salvarEtiqueta(etiqueta) {
  mostrarStatusConexao(true);
  const docRef = await db.collection('etiquetas').add({
    ...etiqueta,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

/**
 * Escuta etiquetas em tempo real.
 */
function ouvirEtiquetas(callback) {
  return db.collection('etiquetas')
    .orderBy('criadoEm', 'desc')
    .onSnapshot(
      (snapshot) => {
        const etiquetas = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
        callback(etiquetas);
      },
      (error) => {
        console.error('Erro ao escutar etiquetas:', error);
        mostrarStatusConexao(false);
      }
    );
}

// ─────────────────────────────────────────────
//  HELPERS — FECHAMENTOS
// ─────────────────────────────────────────────

/**
 * Salva um novo fechamento no Firestore.
 * @param {object} dados - campos do fechamento
 * @returns {string} ID do documento criado
 */
async function salvarFechamento(dados) {
  mostrarStatusConexao(true);
  const docRef = await db.collection('fechamentos').add({
    ...dados,
    status: 'aguardando',
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

/**
 * Atualiza campos de um fechamento existente.
 * @param {string} id - ID Firestore do documento
 * @param {object} dados - campos a atualizar (ex: status, obs)
 */
async function atualizarFechamento(id, dados) {
  mostrarStatusConexao(true);
  await db.collection('fechamentos').doc(id).update({
    ...dados,
    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Escuta todos os fechamentos em tempo real (para aba de aprovação).
 */
function ouvirFechamentosAguardando(callback) {
  return db.collection('fechamentos')
    .where('status', '==', 'aguardando')
    .orderBy('criadoEm', 'desc')
    .onSnapshot(
      (snapshot) => {
        mostrarStatusConexao(true);
        const lista = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
        callback(lista);
      },
      (error) => {
        console.error('Erro ao escutar fechamentos:', error);
        mostrarStatusConexao(false);
      }
    );
}

/**
 * Escuta todos os fechamentos aprovados (para aba de consultas).
 */
function ouvirFechamentosAprovados(callback) {
  return db.collection('fechamentos')
    .where('status', '==', 'aprovado')
    .orderBy('criadoEm', 'desc')
    .onSnapshot(
      (snapshot) => {
        mostrarStatusConexao(true);
        // Filtra nulos ou indefinidos de forma segura
        const lista = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
        callback(lista);
      },
      (error) => {
        console.error('Erro ao escutar fechamentos aprovados:', error);
        mostrarStatusConexao(false);
      }
    );
}

/**
 * Escuta todos os fechamentos do usuário logado (qualquer status).
 */
function ouvirMeusFechamentos(uid, callback) {
  return db.collection('fechamentos')
    .where('uid', '==', uid)
    .orderBy('criadoEm', 'desc')
    .onSnapshot(
      (snapshot) => {
        mostrarStatusConexao(true);
        const lista = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
        callback(lista);
      },
      (error) => {
        console.error('Erro ao escutar meus fechamentos:', error);
        mostrarStatusConexao(false);
      }
    );
}

/**
 * Busca uma etiqueta pelo número NF/Orçamento (para importação no fechamento).
 */
async function buscarEtiquetaPorNF(nf) {
  mostrarStatusConexao(true);
  const snapshot = await db.collection('etiquetas')
    .where('nf', '==', nf)
    .orderBy('criadoEm', 'desc')
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { _id: doc.id, ...doc.data() };
}

/**
 * Verifica se já existe uma etiqueta com o número de NF/Orçamento informado.
 */
async function checarNFExistente(nf) {
  if (!nf) return false;
  mostrarStatusConexao(true);
  
  // Busca por string
  const snapshotStr = await db.collection('etiquetas')
    .where('nf', '==', String(nf))
    .limit(1).get();
  if (!snapshotStr.empty) return true;

  // Busca por number (caso existam registros antigos assim)
  if (!isNaN(nf)) {
    const snapshotNum = await db.collection('etiquetas')
      .where('nf', '==', Number(nf))
      .limit(1).get();
    if (!snapshotNum.empty) return true;
  }

  return false;
}

/**
 * Verifica se já existe um fechamento (pendente ou aprovado) para o orçamento/NF.
 */
async function checarFechamentoExistente(orcamento) {
  if (!orcamento) return false;
  mostrarStatusConexao(true);

  // Busca por string
  const snapshotStr = await db.collection('fechamentos')
    .where('orcamento', '==', String(orcamento))
    .limit(1).get();
  if (!snapshotStr.empty) return true;

  // Busca por number
  if (!isNaN(orcamento)) {
    const snapshotNum = await db.collection('fechamentos')
      .where('orcamento', '==', Number(orcamento))
      .limit(1).get();
    if (!snapshotNum.empty) return true;
  }

  return false;
}

/**
 * Busca um fechamento aprovado pelo número da NF Final.
 */
async function buscarFechamentoPorNFFinal(nf) {
  mostrarStatusConexao(true);
  const snapshot = await db.collection('fechamentos')
    .where('nfFinal', '==', nf)
    .where('status', '==', 'aprovado')
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { _id: doc.id, ...doc.data() };
}

/**
 * Registra um log de alteração no banco de dados.
 */
async function registrarLog(usuario, acao, documentoId, dados = {}) {
  try {
    await db.collection('logs').add({
      usuario: usuario || 'Sistema',
      acao: acao,
      documentoId: documentoId,
      dados: dados,
      data: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('Erro ao registrar log:', err);
  }
}

/**
 * Escuta todos os fechamentos (para perfis admin e whatsapp).
 */
function ouvirTodosFechamentos(callback) {
  return db.collection('fechamentos')
    .orderBy('criadoEm', 'desc')
    .onSnapshot(
      (snapshot) => {
        mostrarStatusConexao(true);
        const lista = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
        callback(lista);
      },
      (error) => {
        console.error('Erro ao escutar todos os fechamentos:', error);
        mostrarStatusConexao(false);
      }
    );
}

