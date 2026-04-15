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
    if (window._perfilUsuario === 'expedicao') {
      await registrarLog(window._nomeUsuario, 'Editou coleta', id, { cliente: dados.cliente });
    }
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
  const isWhatsapp = window._perfilUsuario === 'whatsapp';

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
      <p><strong>Retirante:</strong> <span id="retirante-texto-${coleta._id}">${coleta.retirante || '-'}</span></p>
      <p><strong>Data da Retirada:</strong> <span id="dataRetirada-texto-${coleta._id}">${coleta.dataRetirada || '-'}</span></p>
      ${coleta.confirmadoPor ? `<p><strong>Confirmado por:</strong> ${coleta.confirmadoPor}</p>` : ''}
      
      ${coleta.status !== 'Realizada' ? `
        <div id="area-confirmar-${coleta._id}" style="margin-top:15px; padding-top:12px; border-top:1px dashed #cbd5e1;">
          <label style="font-size:12px; font-weight:700; color:#4a5568;">Nome do Retirante:</label>
          <div style="display:flex; gap:8px; margin-top:4px;">
            <input type="text" id="retirante-input-${coleta._id}" placeholder="Quem está retirando?" style="margin:0; flex:1;">
            <button class="btn-salvar" onclick="confirmarRetiradaUI('${coleta._id}')" style="margin:0; padding:8px 16px;">✅ Confirmar</button>
          </div>
        </div>
      ` : ''}

      ${podeEditarColeta && !isWhatsapp ? `<div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:15px;">
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

async function confirmarRetiradaUI(id) {
  const nome = document.getElementById(`retirante-input-${id}`).value.trim();
  if (!nome) { alert('Por favor, informe o nome de quem está retirando.'); return; }

  if (!confirm(`Confirmar retirada para: ${nome}?`)) return;

  try {
    const agora = new Date();
    const dataFormatada = agora.toLocaleString('pt-BR');
    
    await db.collection('coletas').doc(id).update({
      status: 'Realizada',
      retirante: nome,
      dataRetirada: dataFormatada,
      confirmadoPor: window._nomeUsuario || 'Sistema',
      dataConfirmacao: agora
    });
    if (window._perfilUsuario === 'expedicao') {
      await registrarLog(window._nomeUsuario, 'Confirmou retirada', id, { retirante: nome });
    }

    alert('✅ Retirada confirmada com sucesso!');
    // A atualização em tempo real do listener deve cuidar do resto
  } catch (err) {
    alert('❌ Erro ao confirmar retirada: ' + err.message);
  }
}

async function excluirColetaUI(id) {
  if (!confirm('⚠️ Deseja realmente excluir esta coleta?')) return;
  try {
    await excluirColeta(id);
    if (window._perfilUsuario === 'expedicao') {
      await registrarLog(window._nomeUsuario, 'Excluiu coleta', id);
    }
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

    const statusEtiqueta = et.status === 'aprovado' 
      ? `<span style="background:#4caf50; color:#fff; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:700; margin-left:10px;">✅ APROVADO</span>`
      : '';

    div.innerHTML = `
      <h3 style="color:#6a1b9a;">🏷️ Etiqueta — ${et.nf || '-'} ${statusEtiqueta}</h3>
      <p><strong>Cliente:</strong> ${et.cliente || '-'}</p>
      <p><strong>NF / Orçamento:</strong> ${et.nf || '-'} (${et.tipoDoc === 'nf' ? 'Nota Fiscal' : 'Orçamento'})</p>
      ${et.nfFinal ? `<p style="color:#2e7d32;"><strong>NF Final (Aprovada):</strong> ${et.nfFinal}</p>` : ''}
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
  document.getElementById('modal-kg').value            = et.kg            || '';
  atualizarLabelEntrega();
  atualizarModalRotuloNf();

  // Popula caixas
  const listaCaixas = document.getElementById('modal-caixas-lista');
  listaCaixas.innerHTML = '';
  const caixas = Array.isArray(et.caixas) ? et.caixas : [];
  const dims   = Array.isArray(et.dimensoes) ? et.dimensoes : [];
  
  caixas.forEach((qtd, i) => {
    adicionarCaixaModal(qtd, dims[i] || { c: 0, l: 0, a: 0 });
  });

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

function atualizarModalRotuloNf() {
  const tipoDoc = document.getElementById('modal-tipoDoc').value;
  const lbl = document.getElementById('modal-lblNf');
  if (tipoDoc === 'orcamento') {
    lbl.textContent = 'Orçamento:';
  } else {
    lbl.textContent = 'Nota Fiscal (NF):';
  }
}

function adicionarCaixaModal(valorInicial = '', dim = { c: 0, l: 0, a: 0 }) {
  _modalCaixasCount++;
  const n    = _modalCaixasCount;
  const lista = document.getElementById('modal-caixas-lista');

  const item = document.createElement('div');
  item.className = 'caixa-modal-item';
  item.id        = `modal-caixa-item-${n}`;
  item.style.marginBottom = '15px';
  item.style.padding = '10px';
  item.style.background = '#f8fafc';
  item.style.borderRadius = '8px';
  item.style.border = '1px solid #e2e8f0';

  item.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <span style="font-weight:700; color:#4a5568;">Caixa ${n}</span>
      <button type="button" class="btn-remover-caixa" onclick="removerCaixaModal(${n})" style="margin:0; padding:2px 8px; font-size:12px;">✕ Remover</button>
    </div>
    <div style="display:grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap:8px; align-items:end;">
      <div>
        <label style="font-size:11px; color:#718096; margin-bottom:4px;">Produtos:</label>
        <input type="number" id="modal-caixa-${n}" min="0" value="${valorInicial}" placeholder="Qtd">
      </div>
      <div>
        <label style="font-size:11px; color:#718096; margin-bottom:4px;">A(cm):</label>
        <input type="number" id="modal-caixa-a-${n}" min="0" step="0.1" value="${dim.a || 0}">
      </div>
      <div>
        <label style="font-size:11px; color:#718096; margin-bottom:4px;">L(cm):</label>
        <input type="number" id="modal-caixa-l-${n}" min="0" step="0.1" value="${dim.l || 0}">
      </div>
      <div>
        <label style="font-size:11px; color:#718096; margin-bottom:4px;">C(cm):</label>
        <input type="number" id="modal-caixa-c-${n}" min="0" step="0.1" value="${dim.c || 0}">
      </div>
    </div>
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
    const dimensoes = [];

    document.querySelectorAll('#modal-caixas-lista .caixa-modal-item').forEach(item => {
      const inputQtd = item.querySelector('input[id^="modal-caixa-"]:not([id*="-c-"]):not([id*="-l-"]):not([id*="-a-"])');
      const inputC   = item.querySelector('input[id^="modal-caixa-c-"]');
      const inputL   = item.querySelector('input[id^="modal-caixa-l-"]');
      const inputA   = item.querySelector('input[id^="modal-caixa-a-"]');

      if (inputQtd) {
        caixas.push(parseInt(inputQtd.value) || 0);
        dimensoes.push({
          a: parseFloat(inputA?.value) || 0,
          l: parseFloat(inputL?.value) || 0,
          c: parseFloat(inputC?.value) || 0
        });
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
      kg:            parseFloat(document.getElementById('modal-kg').value) || 0,
      caixas,
      dimensoes,
      totalProdutos,
      totalCaixas: caixas.length
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
    
    const transportadoraFmt = f.nomeTransportadora 
      ? `${f.nomeTransportadora}${f.codigoTransportadora ? ' (Cód: ' + f.codigoTransportadora + ')' : ''}`
      : (f.nomeTransportadora || 'N/A');

    const envioLabel = { 
      correios: `Correios (Frete: R$${(f.valorFrete||0).toFixed(2)})`, 
      sedex: `SEDEX (Frete: R$${(f.valorFrete||0).toFixed(2)})`, 
      transportadora: `Transportadora (${transportadoraFmt})` 
    }[f.envio] || f.envio;

    // Galeria de miniaturas
    const ims = f.imagensBase64 || (f.imagemBase64 ? [f.imagemBase64] : []);
    let thumbnailHtml = `
      <div class="fechamento-thumbnail-wrapper">
        ${ims.length > 0 
          ? ims.map(img => `
              <div class="fechamento-thumbnail-item" onclick="abrirModalImagem('${img}', '${f.orcamento || ''}')">
                <img src="${img}" alt="Comprovante">
              </div>
            `).join('')
          : `<div class="fechamento-no-image">📷</div>`}
      </div>
    `;

    const isAdmin = window._perfilUsuario === 'admin';
    const isWhatsapp = window._perfilUsuario === 'whatsapp';

    div.innerHTML = `
      <div class="card-fechamento-grid">
        <div class="fechamento-info">
          <h3 style="color:#2e7d32;">✅ Fechamento — ${f.orcamento || '-'}</h3>
          <p><strong>NF Final (Aprovada):</strong> <span style="color:#2e7d32; font-weight:700;">${f.nfFinal || 'Pendente'}</span></p>
          <p><strong>Cliente:</strong> ${f.cliente || '-'} (Cód: ${f.codigoCliente || '-'})</p>
          <p><strong>Enviado por:</strong> ${f.nomeOperador || '-'}</p>
          <p><strong>Representante:</strong> ${f.representante || '-'}</p>
          <p><strong>Aprovado em:</strong> ${f.atualizadoEm?.toDate ? f.atualizadoEm.toDate().toLocaleString('pt-BR') : '-'}</p>
          <p><strong>Total de Caixas:</strong> ${f.totalCaixas || '-'}</p>
          <p><strong>KG:</strong> ${f.kg != null ? f.kg + ' kg' : '-'}</p>
          <p><strong>Pagamento:</strong> ${pagLabel} - <strong>Campanha:</strong> ${f.campanha === 'sim' ? 'SIM' : 'NÃO'}</p>
          <p><strong>Envio:</strong> ${envioLabel}</p>
          ${isAdmin && !isWhatsapp ? `
            <div style="display:flex; gap:8px; margin-top:12px;">
              <button class="btn-editar" style="padding:4px 12px; font-size:11px;" onclick="irParaEdicaoFechamento('${f._id}')">✏️ Editar</button>
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

  const campos = ['orcamento','codigoCliente','cliente','nomeOperador','representante','totalCaixas','kg','pagamento','numParcelas','envio','nomeTransportadora','codigoTransportadora','valorFrete','campanha','tipoDoc','dimensoes'];
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

function irParaEdicaoFechamento(id) {
  window.location.href = `fechamento.html?edit=${id}`;
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
window.addEventListener('authPronto', ({ detail }) => {
  // Oculta aba de etiquetas para perfil whatsapp
  if (detail.perfil === 'whatsapp') {
    const btnEt = document.getElementById('aba-etiquetas');
    if (btnEt) btnEt.style.display = 'none';
    if (_abaAtiva === 'etiquetas') trocarAba('coletas');
  }

  if (_coletasCache.length > 0)   exibirColetas(_coletasCache);
  if (_etiquetasCache.length > 0) exibirEtiquetas(_etiquetasCache);
  if (_fechamentosCache.length > 0) exibirFechamentosAprovados(_fechamentosCache);
});

window.onload = iniciarListeners;