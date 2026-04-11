// ============================================================
//  consulta.js — Integrado com Firebase Firestore
//  Inclui coletas em tempo real + histórico de etiquetas
//  Editar / Excluir / Reimprimir etiquetas (admin only)
// ============================================================

let _unsubscribeColetas     = null;
let _unsubscribeEtiquetas   = null;
let _unsubscribeFechamentos = null;
let _coletasCache           = [];
let _etiquetasCache         = [];
let _fechamentosCache       = [];
let _abaAtiva               = 'coletas'; // 'coletas' | 'etiquetas' | 'fechamentos'

// ID e dados da etiqueta sendo editada no modal
let _etiquetaEditandoId  = null;
let _etiquetaEditandoObj = null;
let _modalCaixasCount    = 0;

// ─── ABA ATIVA ────────────────────────────────────────────
function trocarAba(aba) {
  _abaAtiva = aba;
  document.getElementById('aba-coletas').classList.toggle('aba-ativa', aba === 'coletas');
  document.getElementById('aba-etiquetas').classList.toggle('aba-ativa', aba === 'etiquetas');
  const abaFech = document.getElementById('aba-fechamentos');
  if (abaFech) abaFech.classList.toggle('aba-ativa', aba === 'fechamentos');

  document.getElementById('secao-coletas').style.display   = aba === 'coletas'   ? '' : 'none';
  document.getElementById('secao-etiquetas').style.display = aba === 'etiquetas' ? '' : 'none';
  const secFech = document.getElementById('secao-fechamentos');
  if (secFech) secFech.style.display = aba === 'fechamentos' ? '' : 'none';
}

// ─── COLETAS ──────────────────────────────────────────────
function habilitarEdicao(id) {
  const div = document.getElementById(`coleta-${id}`);
  if (!div) return;

  div.querySelectorAll('[data-campo]').forEach(el => {
    const campo = el.getAttribute('data-campo');
    const valor = el.getAttribute('data-valor') || '';
    el.innerHTML = `<label>${campo.charAt(0).toUpperCase() + campo.slice(1)}: <input type="text" id="edit-${campo}-${id}" value="${valor}"></label>`;
  });

  const btnSalvar = div.querySelector('.btn-salvar');
  if (btnSalvar) btnSalvar.style.display = 'inline-block';
  const btnEditar = div.querySelector('.btn-editar');
  if (btnEditar) btnEditar.style.display = 'none';
}

async function editarColeta(id) {
  try {
    const dados = {
      cliente:         document.getElementById(`edit-cliente-${id}`)?.value.trim(),
      numeroProtocolo: document.getElementById(`edit-numeroProtocolo-${id}`)?.value.trim(),
      notaFiscal:      document.getElementById(`edit-notaFiscal-${id}`)?.value.trim(),
      observacao:      document.getElementById(`edit-observacao-${id}`)?.value.trim(),
    };
    
    // Remove campos indefinidos
    Object.keys(dados).forEach(k => dados[k] === undefined && delete dados[k]);
    
    await atualizarColeta(id, dados);
    alert('✅ Coleta atualizada com sucesso!');
  } catch (err) {
    alert('❌ Erro ao editar: ' + err.message);
  }
}


function exibirColetas(lista) {
  const container = document.getElementById('listaColetas');
  container.innerHTML = '';

  if (lista.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#718096; margin-top:30px;">Nenhuma coleta encontrada.</p>';
    return;
  }

  const podeEditarColeta = ['admin', 'expedicao'].includes(window._perfilUsuario);

  lista.forEach(coleta => {
    const div = document.createElement('div');
    div.className = 'coleta-card';
    div.id = `coleta-${coleta._id}`;

    const statusCor  = coleta.status === 'Realizada' ? '#4caf50' : '#f50057';
    const statusIcon = coleta.status === 'Realizada' ? '✅' : '🕐';

    div.innerHTML = `
      <h3 style="color:#2e103b; margin-bottom:4px;">${coleta.numeroColeta || '-'}</h3>
      <p data-campo="cliente" data-valor="${coleta.cliente || ''}"><strong>Cliente:</strong> ${coleta.cliente || '-'}</p>
      <p data-campo="numeroProtocolo" data-valor="${coleta.numeroProtocolo || ''}"><strong>Protocolo:</strong> ${coleta.numeroProtocolo || '-'}</p>
      <p data-campo="notaFiscal" data-valor="${coleta.notaFiscal || ''}"><strong>Nota Fiscal:</strong> ${coleta.notaFiscal || '-'}</p>
      <p data-campo="observacao" data-valor="${coleta.observacao || ''}"><strong>Observação:</strong> ${coleta.observacao || '-'}</p>
      <p><strong>Solicitante:</strong> ${coleta.solicitante || '-'}</p>
      <p><strong>Atendente:</strong> ${coleta.atendente || '-'}</p>
      <p><strong>Ordem de Serviço:</strong> ${coleta.numeroServico || '-'}</p>
      <p><strong>Prazo:</strong> ${coleta.prazo || '-'}</p>
      <p><strong>Agendada em:</strong> ${coleta.dataHoraAgendamento || '-'}</p>
      <p><strong>Status:</strong> <span style="color:${statusCor}; font-weight:700;">${statusIcon} ${coleta.status || '-'}</span></p>
      <p><strong>Retirante:</strong> ${coleta.retirante || '-'}</p>
      <p><strong>Data da Retirada:</strong> ${coleta.dataRetirada || '-'}</p>
      ${podeEditarColeta ? `<div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn-editar"  onclick="habilitarEdicao('${coleta._id}')">&#9999;&#65039; Editar</button>
        <button class="btn-excluir" onclick="excluirColetaUI('${coleta._id}')">🗑️ Excluir</button>
        <button class="btn-salvar"  style="display:none" onclick="editarColeta('${coleta._id}')">&#128190; Salvar Alterações</button>
      </div>` : ''}
    `;
    container.appendChild(div);
  });
}

function filtrarColetas() {
  const clienteFiltro = document.getElementById('filtroCliente').value.toLowerCase();
  const numeroFiltro  = document.getElementById('filtroNumero').value.toLowerCase();
  const nfFiltro      = document.getElementById('filtroNF').value.toLowerCase();
  const statusFiltro  = document.getElementById('filtroStatus').value;

  const filtradas = _coletasCache.filter(coleta => {
    const matchCliente = (coleta.cliente?.toLowerCase() || '').includes(clienteFiltro);
    const matchNumero  = (String(coleta.numeroColeta).toLowerCase() || '').includes(numeroFiltro);
    const matchNF      = nfFiltro === '' || (coleta.notaFiscal?.toLowerCase().includes(nfFiltro));
    const matchStatus  = statusFiltro === '' || coleta.status === statusFiltro;
    return matchCliente && matchNumero && matchNF && matchStatus;
  });

  exibirColetas(filtradas);
}

const podeEditarColeta = ['admin', 'expedicao'].includes(window._perfilUsuario);

async function excluirColetaUI(id) {
  if (!confirm('⚠️ Deseja realmente excluir esta coleta?')) return;
  try {
    await excluirColeta(id);
    alert('✅ Coleta excluída!');
  } catch (err) {
    alert('❌ Erro: ' + err.message);
  }
}

function exportarParaCSV() {
  if (_coletasCache.length === 0) {
    alert('Nenhuma coleta para exportar.');
    return;
  }

  const campos = ['numeroColeta','cliente','solicitante','atendente','numeroProtocolo',
                  'notaFiscal','numeroServico','observacao','prazo','dataHoraAgendamento',
                  'status','retirante','dataRetirada'];

  const cabecalho = campos.join(';');
  const linhas    = _coletasCache.map(c => campos.map(k => c[k] || '').join(';'));
  const csv       = [cabecalho, ...linhas].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `coletas_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ─── ETIQUETAS ────────────────────────────────────────────
function exibirEtiquetas(lista) {
  const container = document.getElementById('listaEtiquetas');
  container.innerHTML = '';

  if (lista.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#718096; margin-top:30px;">Nenhuma etiqueta gerada ainda.</p>';
    return;
  }

  const podeGerenciarEtiquetas = ['admin', 'expedicao'].includes(window._perfilUsuario);

  lista.forEach(et => {
    const div = document.createElement('div');
    div.className = 'coleta-card';
    div.style.borderLeftColor = '#9c27b0';

    const caixas = Array.isArray(et.caixas)
      ? et.caixas.map((c, i) => `Caixa ${i + 1}: ${c} produtos`).join(' | ')
      : '-';

    const botoesAdmin = podeGerenciarEtiquetas ? `
      <button class="btn-editar"     onclick="abrirModalEtiqueta(${JSON.stringify(et).replace(/"/g, '&quot;')})">✏️ Editar</button>
      <button class="btn-reimprimir" onclick="reimprimirEtiqueta(${JSON.stringify(et).replace(/"/g, '&quot;')})">🖨️ Reimprimir</button>
      <button class="btn-excluir"    onclick="excluirEtiquetaUI('${et._id}')">🗑️ Excluir</button>
    ` : '';

    div.innerHTML = `
      <h3 style="color:#6a1b9a;">🏷️ Etiqueta — ${et.nf || '-'}</h3>
      <p><strong>Cliente:</strong> ${et.cliente || '-'}</p>
      <p><strong>NF / Orçamento:</strong> ${et.nf || '-'} (${et.tipoDoc === 'nf' ? 'Nota Fiscal' : 'Orçamento'})</p>
      <p><strong>Data:</strong> ${et.data || '-'}</p>
      <p><strong>${et.entregaTipo === 'transportadora' ? 'Transportadora' : 'Representante'}:</strong> ${et.transportadora || '-'}</p>
      <p><strong>Total de produtos:</strong> ${et.totalProdutos || '-'}</p>
      <p><strong>Caixas:</strong> ${caixas}</p>
      <p><strong>Gerada em:</strong> ${et.geradaEm || '-'}</p>
      ${botoesAdmin ? `<div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">${botoesAdmin}</div>` : ''}
    `;
    container.appendChild(div);
  });
}

// ─── EXCLUIR ETIQUETA ─────────────────────────────────────
async function excluirEtiquetaUI(id) {
  if (!confirm('⚠️ Tem certeza que deseja excluir esta etiqueta? Esta ação não pode ser desfeita.')) return;
  try {
    await excluirEtiqueta(id);
  } catch (err) {
    alert('❌ Erro ao excluir: ' + err.message);
  }
}

// ─── MODAL DE EDIÇÃO DE ETIQUETA ─────────────────────────
function abrirModalEtiqueta(et) {
  _etiquetaEditandoId  = et._id;
  _etiquetaEditandoObj = et;
  _modalCaixasCount    = 0;

  document.getElementById('modal-cliente').value      = et.cliente      || '';
  document.getElementById('modal-nf').value           = et.nf           || '';
  document.getElementById('modal-tipoDoc').value      = et.tipoDoc      || 'nf';
  document.getElementById('modal-data').value         = et.data         || '';
  document.getElementById('modal-tipoEntrega').value  = et.entregaTipo  || 'transportadora';
  document.getElementById('modal-transportadora').value = et.transportadora || '';
  atualizarLabelEntrega();

  // Popula caixas
  const listaCaixas = document.getElementById('modal-caixas-lista');
  listaCaixas.innerHTML = '';
  const caixas = Array.isArray(et.caixas) ? et.caixas : [];
  caixas.forEach(qtd => adicionarCaixaModal(qtd));

  document.getElementById('modal-etiqueta').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modal-etiqueta').style.display = 'none';
  _etiquetaEditandoId  = null;
  _etiquetaEditandoObj = null;
}

function atualizarLabelEntrega() {
  const tipo  = document.getElementById('modal-tipoEntrega').value;
  const label = document.getElementById('modal-label-entrega');
  if (label) label.textContent = (tipo === 'transportadora' ? 'Transportadora' : 'Representante') + ':';
}

function adicionarCaixaModal(valorInicial = '') {
  _modalCaixasCount++;
  const n    = _modalCaixasCount;
  const lista = document.getElementById('modal-caixas-lista');

  const item = document.createElement('div');
  item.className = 'caixa-modal-item';
  item.id        = `modal-caixa-item-${n}`;
  item.innerHTML = `
    <span style="font-weight:600; color:#4a5568; min-width:70px; font-size:14px;">Caixa ${n}:</span>
    <input type="number" id="modal-caixa-${n}" min="1" value="${valorInicial}" placeholder="nº de produtos">
    <button type="button" class="btn-remover-caixa" onclick="removerCaixaModal(${n})">✕ Remover</button>
  `;
  lista.appendChild(item);
}

function removerCaixaModal(n) {
  const item = document.getElementById(`modal-caixa-item-${n}`);
  if (item) item.remove();
}

async function salvarEdicaoEtiqueta(e) {
  e.preventDefault();
  const btn       = e.target.querySelector('button[type="submit"]');
  btn.disabled    = true;
  btn.textContent = 'Salvando...';

  try {
    const tipoEntrega = document.getElementById('modal-tipoEntrega').value;

    // Coleta os valores das caixas (ignora removidas)
    const caixas = [];
    document.querySelectorAll('#modal-caixas-lista .caixa-modal-item').forEach(item => {
      const input = item.querySelector('input[type="number"]');
      if (input) {
        const val = parseInt(input.value) || 0;
        caixas.push(val);
      }
    });

    const totalProdutos = caixas.reduce((a, b) => a + b, 0);

    const dados = {
      cliente:       document.getElementById('modal-cliente').value.trim(),
      nf:            document.getElementById('modal-nf').value.trim(),
      tipoDoc:       document.getElementById('modal-tipoDoc').value,
      data:          document.getElementById('modal-data').value,
      entregaTipo:   tipoEntrega,
      transportadora: document.getElementById('modal-transportadora').value.trim(),
      caixas,
      totalProdutos,
    };

    await atualizarEtiqueta(_etiquetaEditandoId, dados);
    fecharModal();
  } catch (err) {
    alert('❌ Erro ao salvar: ' + err.message);
    btn.disabled    = false;
    btn.textContent = '💾 Salvar Alterações';
  }
}

// ─── REIMPRIMIR ETIQUETA ──────────────────────────────────
function reimprimirEtiqueta(et) {
  const area   = document.getElementById('area-impressao');
  const caixas = Array.isArray(et.caixas) ? et.caixas : [];
  const total  = caixas.length;

  if (total === 0) {
    alert('Esta etiqueta não tem caixas para reimprimir.');
    return;
  }

  area.innerHTML = caixas.map((prod, i) => `
    <div class="etiqueta">
      <img src="EbenezerTitulo.png" class="logo-etiqueta" alt="">
      <div class="conteudo">
        <p><strong>Cliente:</strong> ${et.cliente || ''}</p>
        <p><strong>${et.tipoDoc === 'nf' ? 'NF' : 'Orçamento'}:</strong> ${et.nf || ''}</p>
        <p><strong>Caixa:</strong> ${i + 1} de ${total}</p>
        <p><strong>Produtos na caixa:</strong> ${prod}</p>
        <p><strong>Data:</strong> ${et.data || ''}</p>
        <p><strong>${et.entregaTipo === 'transportadora' ? 'Transportadora' : 'Representante'}:</strong> ${et.transportadora || ''}</p>
      </div>
    </div>
  `).join('');

  document.body.classList.add('modo-impressao');
  window.print();
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('modo-impressao');
  }, { once: true });
}

// ─── FILTRO / EXPORT ETIQUETAS ────────────────────────────
function filtrarEtiquetas() {
  const clienteFiltro = document.getElementById('filtroEtCliente').value.toLowerCase();
  const nfFiltro      = document.getElementById('filtroEtNF').value.toLowerCase();

  const filtradas = _etiquetasCache.filter(et => {
    const matchCliente = (et.cliente?.toLowerCase() || '').includes(clienteFiltro);
    const matchNF      = nfFiltro === '' || (et.nf?.toLowerCase().includes(nfFiltro));
    return matchCliente && matchNF;
  });

  exibirEtiquetas(filtradas);
}

function exportarEtiquetasCSV() {
  if (_etiquetasCache.length === 0) {
    alert('Nenhuma etiqueta para exportar.');
    return;
  }

  const campos    = ['nf','tipoDoc','cliente','data','entregaTipo','transportadora','totalProdutos','geradaEm'];
  const cabecalho = campos.join(';');
  const linhas    = _etiquetasCache.map(et => campos.map(k => et[k] || '').join(';'));
  const csv       = [cabecalho, ...linhas].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href     = URL.createObjectURL(blob);
  link.download = `etiquetas_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ─── FECHAMENTOS APROVADOS ─────────────────────────────────
function exibirFechamentosAprovados(lista) {
  const container = document.getElementById('listaFechamentosAprovados');
  container.innerHTML = '';

  if (lista.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#718096; margin-top:30px;">Nenhum fechamento aprovado encontrado.</p>';
    return;
  }

  lista.forEach(f => {
    const div = document.createElement('div');
    div.className = 'coleta-card';
    div.style.borderLeftColor = '#4caf50'; // aprovado (verde)

    const pagLabel = { pix: 'PIX', cartao: `Cartão (${f.numParcelas || 1}x)`, boleto: `Boleto (${f.numParcelas || 1}x)` }[f.pagamento] || f.pagamento;
    const envioLabel = { correios: `Correios (Frete: R$${(f.valorFrete||0).toFixed(2)})`, sedex: `SEDEX (Frete: R$${(f.valorFrete||0).toFixed(2)})`, transportadora: `Transportadora (${f.nomeTransportadora || 'N/A'})` }[f.envio] || f.envio;

    let thumbnailHtml = `
      <div class="fechamento-thumbnail-wrapper" onclick="abrirModalImagem('${f.imagemBase64 || ''}', '${f.orcamento || ''}')">
        ${f.imagemBase64 
          ? `<img src="${f.imagemBase64}" alt="Comprovante">` 
          : `<div class="fechamento-no-image">📷</div>`}
      </div>
    `;

    const isAdmin = window._perfilUsuario === 'admin';

    div.innerHTML = `
      <div class="card-fechamento-grid">
        <div class="fechamento-info">
          <h3 style="color:#2e7d32;">✅ Fechamento — ${f.orcamento || '-'}</h3>
          <p><strong>Cliente:</strong> ${f.cliente || '-'} (Cód: ${f.codigoCliente || '-'})</p>
          <p><strong>Enviado por:</strong> ${f.nomeOperador || '-'}</p>
          <p><strong>Representante:</strong> ${f.representante || '-'}</p>
          <p><strong>Aprovado em:</strong> ${f.atualizadoEm?.toDate ? f.atualizadoEm.toDate().toLocaleString('pt-BR') : '-'}</p>
          <p><strong>Total de Caixas:</strong> ${f.totalCaixas || '-'}</p>
          <p><strong>KG:</strong> ${f.kg != null ? f.kg + ' kg' : '-'}</p>
          <p><strong>Pagamento:</strong> ${pagLabel} - <strong>Campanha:</strong> ${f.campanha === 'sim' ? 'SIM' : 'NÃO'}</p>
          <p><strong>Envio:</strong> ${envioLabel}</p>
          ${isAdmin ? `
            <div style="display:flex; gap:8px; margin-top:12px;">
              <button class="btn-excluir" style="padding:4px 12px; font-size:11px;" onclick="excluirFechamentoUI('${f._id}')">🗑️ Remover Registro</button>
            </div>
          ` : ''}
        </div>
        ${thumbnailHtml}
      </div>
    `;
    container.appendChild(div);
  });
}

function abrirModalImagem(src, orcamento) {
  if (!src) { alert('Este fechamento não possui imagem anexa.'); return; }
  const modal = document.getElementById('modal-imagem');
  const img = document.getElementById('img-full');
  const caption = document.getElementById('img-caption');
  
  img.src = src;
  caption.textContent = `Comprovante - Orçamento ${orcamento}`;
  modal.style.display = 'flex';
}

function fecharModalImagem() {
  document.getElementById('modal-imagem').style.display = 'none';
}

async function excluirFechamentoUI(id) {
  if (!confirm('⚠️ Deseja remover este registro de fechamento aprovado?')) return;
  try {
    await excluirFechamento(id);
    alert('✅ Registro removido!');
  } catch (err) {
    alert('❌ Erro: ' + err.message);
  }
}

function filtrarFechamentos() {
  const clienteFiltro = document.getElementById('filtroFechCliente').value.toLowerCase();
  const nfFiltro      = document.getElementById('filtroFechNF').value.toLowerCase();

  const filtradas = _fechamentosCache.filter(f => {
    const matchCliente = (f.cliente?.toLowerCase() || '').includes(clienteFiltro) || (String(f.codigoCliente).toLowerCase() || '').includes(clienteFiltro);
    const matchNF      = nfFiltro === '' || (f.orcamento?.toLowerCase().includes(nfFiltro));
    return matchCliente && matchNF;
  });

  exibirFechamentosAprovados(filtradas);
}

function exportarFechamentosCSV() {
  if (_fechamentosCache.length === 0) {
    alert('Nenhum fechamento para exportar.');
    return;
  }

  const campos = ['orcamento','codigoCliente','cliente','nomeOperador','representante','totalCaixas','kg','pagamento','numParcelas','envio','nomeTransportadora','valorFrete','campanha','tipoDoc','dimensoes'];
  const cabecalho = campos.join(';');
  const linhas    = _fechamentosCache.map(f => campos.map(k => {
    let val = f[k] !== undefined && f[k] !== null ? f[k] : '';
    
    // Formata campos específicos
    if (k === 'valorFrete' && val !== '') val = val.toFixed(2);
    if (k === 'dimensoes' && Array.isArray(val)) {
      val = val.map((d, i) => `Cx${i+1}: ${d.c||0}x${d.l||0}x${d.a||0}cm`).join(' | ');
    }
    
    return `"${String(val).replace(/"/g, '""')}"`;
  }).join(';'));
  const csv       = [cabecalho, ...linhas].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `fechamentos_aprovados_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ─── INICIALIZAÇÃO ────────────────────────────────────────
function iniciarListeners() {
  document.getElementById('listaColetas').innerHTML =
    '<p style="text-align:center; color:#9c27b0; margin-top:30px;">⏳ Conectando ao banco de dados...</p>';
  document.getElementById('listaEtiquetas').innerHTML =
    '<p style="text-align:center; color:#9c27b0; margin-top:30px;">⏳ Carregando etiquetas...</p>';
  const listaF = document.getElementById('listaFechamentosAprovados');
  if (listaF) {
      listaF.innerHTML = '<p style="text-align:center; color:#9c27b0; margin-top:30px;">⏳ Carregando fechamentos...</p>';
  }

  _unsubscribeColetas = ouvirColetas(coletas => {
    _coletasCache = coletas;
    if (_abaAtiva === 'coletas') exibirColetas(coletas);
  });

  _unsubscribeEtiquetas = ouvirEtiquetas(etiquetas => {
    _etiquetasCache = etiquetas;
    if (_abaAtiva === 'etiquetas') exibirEtiquetas(etiquetas);
  });

  if (typeof ouvirFechamentosAprovados === 'function') {
    _unsubscribeFechamentos = ouvirFechamentosAprovados(fechamentos => {
      _fechamentosCache = fechamentos;
      if (_abaAtiva === 'fechamentos') exibirFechamentosAprovados(fechamentos);
    });
  }
}

// Re-renderiza quando o perfil fica disponível (para mostrar botões de admin)
window.addEventListener('authPronto', () => {
  if (_coletasCache.length > 0)   exibirColetas(_coletasCache);
  if (_etiquetasCache.length > 0) exibirEtiquetas(_etiquetasCache);
  if (_fechamentosCache.length > 0) exibirFechamentosAprovados(_fechamentosCache);
});

window.onload = iniciarListeners;