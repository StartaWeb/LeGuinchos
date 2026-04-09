// ========== DATA STORES ==========
let servicos = JSON.parse(localStorage.getItem('servicos')) || [];
let checklists = JSON.parse(localStorage.getItem('checklists')) || [];
let fotos = JSON.parse(localStorage.getItem('fotos')) || [];
let despesas = JSON.parse(localStorage.getItem('despesas')) || [];
let abastecimentos = JSON.parse(localStorage.getItem('abastecimentos')) || [];

// Current checklist state
let currentChecklist = {};
let currentPart = null;

const CHECKLIST_PARTS = [
  {id:'para_choque_dianteiro',label:'Para-choque Dianteiro'},
  {id:'farol_esquerdo',label:'Farol Esquerdo'},
  {id:'farol_direito',label:'Farol Direito'},
  {id:'capo',label:'Capô'},
  {id:'para_brisa_dianteiro',label:'Para-brisa Dianteiro'},
  {id:'retrovisor_esquerdo',label:'Retrovisor Esquerdo'},
  {id:'retrovisor_direito',label:'Retrovisor Direito'},
  {id:'porta_dianteira_esquerda',label:'Porta Diant. Esquerda'},
  {id:'porta_dianteira_direita',label:'Porta Diant. Direita'},
  {id:'teto',label:'Teto'},
  {id:'porta_traseira_esquerda',label:'Porta Tras. Esquerda'},
  {id:'porta_traseira_direita',label:'Porta Tras. Direita'},
  {id:'para_brisa_traseiro',label:'Para-brisa Traseiro'},
  {id:'porta_malas',label:'Porta-malas'},
  {id:'estepe',label:'Estepe'},
  {id:'lanterna_esquerda',label:'Lanterna Esquerda'},
  {id:'lanterna_direita',label:'Lanterna Direita'},
  {id:'para_choque_traseiro',label:'Para-choque Traseiro'},
  {id:'pneu_dianteiro_esquerdo',label:'Pneu Diant. Esquerdo'},
  {id:'pneu_dianteiro_direito',label:'Pneu Diant. Direito'},
  {id:'pneu_traseiro_esquerdo',label:'Pneu Tras. Esquerdo'},
  {id:'pneu_traseiro_direito',label:'Pneu Tras. Direito'}
];

const EXPENSE_LABELS = {combustivel:'⛽ Combustível',pedagio:'🛤️ Pedágio',alimentacao:'🍔 Alimentação',manutencao:'🔧 Manutenção',pneu:'🛞 Pneus',lavagem:'🧽 Lavagem',outros:'📦 Outros'};

function save(key,data){localStorage.setItem(key,JSON.stringify(data))}

// ========== NAVIGATION ==========
function switchTab(tabId){
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  const navBtn = document.querySelector(`[data-tab="${tabId}"]`);
  if(navBtn) navBtn.classList.add('active');
  window.scrollTo(0,0);
}
document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click',()=>switchTab(btn.dataset.tab));
});

// ========== DASHBOARD ==========
function atualizarDashboard(){
  document.getElementById('totalServicos').textContent = servicos.length;
  const total = servicos.reduce((a,s)=>a+s.valorFinal,0);
  document.getElementById('totalValor').textContent = 'R$ '+total.toFixed(2);
  document.getElementById('totalChecklists').textContent = checklists.length;
}

function atualizarDashboardGas(){
  const totalLitros = abastecimentos.reduce((a,g)=>a+g.litros,0);
  const totalCusto = abastecimentos.reduce((a,g)=>a+g.valorTotal,0);
  // KM rodados = ultimo km - primeiro km (se houver pelo menos 2 registros)
  let kmRodados = 0;
  if(abastecimentos.length >= 2){
    const sorted = [...abastecimentos].sort((a,b)=>a.kmAtual-b.kmAtual);
    kmRodados = sorted[sorted.length-1].kmAtual - sorted[0].kmAtual;
  }
  document.getElementById('totalLitros').textContent = totalLitros.toFixed(1)+' L';
  document.getElementById('totalKm').textContent = kmRodados.toLocaleString('pt-BR')+' km';
  document.getElementById('totalGasCusto').textContent = 'R$ '+totalCusto.toFixed(2);
}

// ========== SERVICES ==========
document.getElementById('formServico').addEventListener('submit',function(e){
  e.preventDefault();
  const motorista = document.getElementById('motorista').value.trim();
  const seguradora = document.getElementById('seguradora').value.trim();
  const horario = new Date(document.getElementById('horario').value);
  const valor = parseFloat(document.getElementById('valor').value);
  const desconto = parseFloat(document.getElementById('desconto').value);
  const pedagio = document.getElementById('pedagio').value;
  if(!motorista||!seguradora||isNaN(valor)||isNaN(desconto)){alert('Preencha todos os campos!');return;}
  const valorFinal = valor-(valor*desconto/100);
  servicos.push({id:Date.now(),motorista,seguradora,horario,valor,desconto,pedagio,valorFinal});
  save('servicos',servicos);
  atualizarServicos();
  atualizarDashboard();
  e.target.reset();
});

function atualizarServicos(filtro=''){
  const lista = document.getElementById('listaServicos');
  const filtered = servicos.filter(s=>
    s.motorista.toLowerCase().includes(filtro.toLowerCase())||
    s.seguradora.toLowerCase().includes(filtro.toLowerCase())
  );
  if(!filtered.length){lista.innerHTML='<p class="empty-msg">Nenhum serviço encontrado</p>';return;}
  lista.innerHTML = filtered.map(s=>`
    <div class="service-item">
      <div class="service-info">
        <h4>${s.motorista}</h4>
        <p>${s.seguradora} • ${new Date(s.horario).toLocaleString('pt-BR')}</p>
        <div class="service-actions">
          <button class="btn-edit" onclick="editarServico(${s.id})">✏️ Editar</button>
          <button class="btn-delete" onclick="deletarServico(${s.id})">🗑️ Excluir</button>
        </div>
      </div>
      <div class="service-value">
        <span class="amount">R$ ${s.valorFinal.toFixed(2)}</span>
        ${s.pedagio==='sim'?'<span class="badge badge-pedagio">Pedágio</span>':''}
      </div>
    </div>
  `).join('');
}
function editarServico(id){
  const s=servicos.find(x=>x.id===id);
  document.getElementById('motorista').value=s.motorista;
  document.getElementById('seguradora').value=s.seguradora;
  document.getElementById('horario').value=new Date(s.horario).toISOString().slice(0,16);
  document.getElementById('valor').value=s.valor;
  document.getElementById('desconto').value=s.desconto;
  document.getElementById('pedagio').value=s.pedagio;
  deletarServico(id);
  switchTab('tabInicio');
  document.getElementById('motorista').focus();
}
function deletarServico(id){
  if(!confirm('Excluir este serviço?'))return;
  servicos=servicos.filter(s=>s.id!==id);
  save('servicos',servicos);atualizarServicos();atualizarDashboard();
}
document.getElementById('pesquisa').addEventListener('input',e=>atualizarServicos(e.target.value));

// ========== CHECKLIST ==========
function initChecklist(){
  CHECKLIST_PARTS.forEach(p=>{
    if(!currentChecklist[p.id]) currentChecklist[p.id]={status:'none',obs:''};
  });
}
initChecklist();

// SVG click handlers
document.querySelectorAll('.car-part').forEach(el=>{
  el.addEventListener('click',function(){
    const partId = this.dataset.part;
    const partLabel = this.dataset.label;
    currentPart = partId;
    document.getElementById('modalPartLabel').textContent = partLabel;
    document.getElementById('modalObs').value = currentChecklist[partId]?.obs||'';
    document.querySelectorAll('.status-btn').forEach(b=>b.classList.remove('selected'));
    const st = currentChecklist[partId]?.status;
    if(st==='ok') document.querySelector('.status-btn.ok').classList.add('selected');
    if(st==='avariado') document.querySelector('.status-btn.avariado').classList.add('selected');
    document.getElementById('modalChecklist').classList.add('show');
  });
});

function setPartStatus(status){
  if(!currentPart)return;
  currentChecklist[currentPart].status=status;
  document.querySelectorAll('.status-btn').forEach(b=>b.classList.remove('selected'));
  if(status==='ok') document.querySelector('.status-btn.ok').classList.add('selected');
  if(status==='avariado') document.querySelector('.status-btn.avariado').classList.add('selected');
  atualizarSVGParts();
  atualizarChecklistResumo();
}
function salvarObsModal(){
  if(currentPart){
    currentChecklist[currentPart].obs=document.getElementById('modalObs').value;
  }
  fecharModal();
}
function fecharModal(){document.getElementById('modalChecklist').classList.remove('show');}

function atualizarSVGParts(){
  document.querySelectorAll('.car-part').forEach(el=>{
    const p=el.dataset.part;
    el.classList.remove('status-ok','status-avariado');
    if(currentChecklist[p]?.status==='ok') el.classList.add('status-ok');
    if(currentChecklist[p]?.status==='avariado') el.classList.add('status-avariado');
  });
}

function atualizarChecklistResumo(){
  const container = document.getElementById('checklistResumo');
  container.innerHTML = CHECKLIST_PARTS.map(p=>{
    const st = currentChecklist[p.id]?.status||'none';
    const obs = currentChecklist[p.id]?.obs||'';
    const statusLabel = st==='ok'?'OK':st==='avariado'?'Avariado':'—';
    const statusClass = 's-'+st;
    return `<div class="check-item">
      <span class="part-name">${p.label}${obs?' 📝':''}</span>
      <span class="part-status ${statusClass}">${statusLabel}</span>
    </div>`;
  }).join('');
}

function salvarChecklist(){
  const veiculo = {
    placa:document.getElementById('veiPlaca').value,
    modelo:document.getElementById('veiModelo').value,
    cor:document.getElementById('veiCor').value,
    ano:document.getElementById('veiAno').value,
    seguradora:document.getElementById('veiSeguradora').value
  };
  const proprietario = {
    nome:document.getElementById('propNome').value,
    cpf:document.getElementById('propCPF').value,
    telefone:document.getElementById('propTelefone').value,
    endereco:document.getElementById('propEndereco').value,
    email:document.getElementById('propEmail').value
  };
  const checklist = {
    id:Date.now(),
    data:new Date().toISOString(),
    veiculo,proprietario,
    itens:{...currentChecklist},
    observacaoGeral:document.getElementById('obsGeral').value
  };
  checklists.push(checklist);
  save('checklists',checklists);
  alert('Checklist salvo com sucesso!');
  // Reset
  currentChecklist={};initChecklist();
  document.querySelectorAll('#tabChecklist input, #tabChecklist textarea').forEach(i=>i.value='');
  atualizarSVGParts();atualizarChecklistResumo();atualizarChecklistsSalvos();atualizarDashboard();
}

function atualizarChecklistsSalvos(){
  const container = document.getElementById('checklistsSalvos');
  if(!checklists.length){container.innerHTML='<p class="empty-msg">Nenhum checklist salvo</p>';return;}
  container.innerHTML = checklists.slice().reverse().map(c=>`
    <div class="saved-item">
      <div class="saved-info">
        <h4>${c.veiculo.placa||'Sem placa'} - ${c.veiculo.modelo||'Veículo'}</h4>
        <p>${new Date(c.data).toLocaleString('pt-BR')}</p>
      </div>
      <div class="saved-actions">
        <button class="btn-pdf" onclick="gerarPDFChecklistById(${c.id})">📄 PDF</button>
        <button class="btn-delete" onclick="deletarChecklist(${c.id})">🗑️</button>
      </div>
    </div>
  `).join('');
}
function deletarChecklist(id){
  if(!confirm('Excluir este checklist?'))return;
  checklists=checklists.filter(c=>c.id!==id);
  save('checklists',checklists);atualizarChecklistsSalvos();atualizarDashboard();
}

// ========== PHOTOS ==========
document.getElementById('cameraInput').addEventListener('change',function(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(ev){
    const img=new Image();
    img.onload=function(){
      const canvas=document.createElement('canvas');
      const MAX=800;
      let w=img.width,h=img.height;
      if(w>MAX){h=h*(MAX/w);w=MAX;}
      if(h>MAX){w=w*(MAX/h);h=MAX;}
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      const dataUrl=canvas.toDataURL('image/jpeg',0.7);
      const desc=document.getElementById('fotoDescricao').value||'Foto '+new Date().toLocaleString('pt-BR');
      fotos.push({id:Date.now(),data:dataUrl,timestamp:new Date().toISOString(),descricao:desc});
      save('fotos',fotos);
      atualizarGaleria();
      document.getElementById('fotoDescricao').value='';
    };
    img.src=ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value='';
});

function atualizarGaleria(){
  const gallery=document.getElementById('galeriaFotos');
  const empty=document.getElementById('semFotos');
  if(!fotos.length){gallery.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  gallery.innerHTML=fotos.map(f=>`
    <div class="photo-item">
      <img src="${f.data}" alt="${f.descricao}" loading="lazy">
      <button class="photo-delete" onclick="deletarFoto(${f.id})">✕</button>
      <div class="photo-desc">${f.descricao}</div>
    </div>
  `).join('');
}
function deletarFoto(id){
  if(!confirm('Excluir esta foto?'))return;
  fotos=fotos.filter(f=>f.id!==id);save('fotos',fotos);atualizarGaleria();
}

// ========== EXPENSES ==========
document.getElementById('formDespesa').addEventListener('submit',function(e){
  e.preventDefault();
  const tipo=document.getElementById('despTipo').value;
  const valor=parseFloat(document.getElementById('despValor').value);
  const data=document.getElementById('despData').value;
  const descricao=document.getElementById('despDescricao').value;
  if(!tipo||isNaN(valor)||!data){alert('Preencha os campos obrigatórios!');return;}
  despesas.push({id:Date.now(),tipo,valor,data,descricao});
  save('despesas',despesas);
  atualizarDespesas();
  e.target.reset();
});

function atualizarDespesas(){
  // Summary
  const resumo=document.getElementById('despesasResumo');
  const totais={};
  despesas.forEach(d=>{totais[d.tipo]=(totais[d.tipo]||0)+d.valor;});
  const totalGeral=despesas.reduce((a,d)=>a+d.valor,0);
  let html=Object.entries(EXPENSE_LABELS).map(([k,label])=>{
    const icon=label.split(' ')[0];
    const name=label.split(' ').slice(1).join(' ');
    return `<div class="expense-cat"><span class="cat-icon">${icon}</span><span class="cat-value">R$ ${(totais[k]||0).toFixed(2)}</span><span class="cat-label">${name}</span></div>`;
  }).join('');
  html+=`<div class="expense-cat" style="grid-column:span 2;background:rgba(0,100,200,0.2)"><span class="cat-icon">💵</span><span class="cat-value" style="font-size:1.3em">R$ ${totalGeral.toFixed(2)}</span><span class="cat-label">Total Geral</span></div>`;
  resumo.innerHTML=html;

  // List
  const lista=document.getElementById('listaDespesas');
  const empty=document.getElementById('semDespesas');
  if(!despesas.length){lista.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  lista.innerHTML=despesas.slice().reverse().map(d=>`
    <div class="expense-item">
      <div class="exp-info">
        <strong>${EXPENSE_LABELS[d.tipo]||d.tipo}</strong>
        <small>${new Date(d.data+'T12:00:00').toLocaleDateString('pt-BR')} ${d.descricao?'• '+d.descricao:''}</small>
      </div>
      <span class="exp-value">R$ ${d.valor.toFixed(2)}</span>
      <button class="exp-delete" onclick="deletarDespesa(${d.id})">🗑️</button>
    </div>
  `).join('');
}
function deletarDespesa(id){
  if(!confirm('Excluir esta despesa?'))return;
  despesas=despesas.filter(d=>d.id!==id);save('despesas',despesas);atualizarDespesas();
}

// ========== GASOLINA & KM ==========
const GAS_TIPO_LABELS = {gasolina:'⛽ Gasolina',etanol:'🌿 Etanol',diesel:'🔵 Diesel',gnv:'💨 GNV'};

// Auto-calc valor total ao digitar litros ou preco
['gasLitros','gasPrecoLitro'].forEach(id=>{
  document.getElementById(id).addEventListener('input',()=>{
    const litros = parseFloat(document.getElementById('gasLitros').value)||0;
    const preco = parseFloat(document.getElementById('gasPrecoLitro').value)||0;
    const total = litros*preco;
    document.getElementById('gasValorTotal').value = total>0?total.toFixed(2):'';
  });
});

document.getElementById('formGasolina').addEventListener('submit',function(e){
  e.preventDefault();
  const data = document.getElementById('gasData').value;
  const kmAtual = parseFloat(document.getElementById('gasKmAtual').value);
  const litros = parseFloat(document.getElementById('gasLitros').value);
  const precoLitro = parseFloat(document.getElementById('gasPrecoLitro').value);
  const tipo = document.getElementById('gasTipo').value;
  const posto = document.getElementById('gasPosto').value.trim();
  if(!data||isNaN(kmAtual)||isNaN(litros)||isNaN(precoLitro)){alert('Preencha todos os campos!');return;}
  const valorTotal = litros*precoLitro;
  abastecimentos.push({id:Date.now(),data,kmAtual,litros,precoLitro,valorTotal,tipo,posto});
  save('abastecimentos',abastecimentos);
  atualizarGasolina();
  atualizarDashboardGas();
  e.target.reset();
  document.getElementById('gasValorTotal').value='';
});

function atualizarGasolina(){
  const lista = document.getElementById('listaGasolina');
  const empty = document.getElementById('semGasolina');
  const efDiv = document.getElementById('gasEficiencia');
  atualizarDashboardGas();

  // Ordenar por KM para calcular distância entre abastecimentos
  const sorted = [...abastecimentos].sort((a,b)=>a.kmAtual-b.kmAtual);

  // Mapa de id -> kmPercorrido (calculado em relação ao anterior)
  const kmMap = {};
  for(let i=0;i<sorted.length;i++){
    if(i===0){
      kmMap[sorted[i].id] = null; // primeiro abastecimento, sem referência anterior
    } else {
      const km = sorted[i].kmAtual - sorted[i-1].kmAtual;
      kmMap[sorted[i].id] = km;
    }
  }

  // Seção de Eficiência
  let efHtml = '';
  for(let i=1;i<sorted.length;i++){
    const km = sorted[i].kmAtual - sorted[i-1].kmAtual;
    const consumo = km / sorted[i].litros;
    const data = new Date(sorted[i].data+'T12:00:00').toLocaleDateString('pt-BR');
    efHtml += `<div class="gas-ef-item">
      <span class="gas-ef-date">${data}</span>
      <span class="gas-ef-km">🛣️ ${km.toLocaleString('pt-BR')} km percorridos</span>
      <span class="gas-ef-consumo">${consumo.toFixed(2)} km/L</span>
    </div>`;
  }
  efDiv.innerHTML = efHtml
    ? `<div class="gas-ef-header"><span>Data</span><span>KM Percorrido</span><span>Rendimento</span></div>` + efHtml
    : '<p class="empty-msg">Registre ao menos 2 abastecimentos para ver o KM percorrido por tanque</p>';

  if(!abastecimentos.length){lista.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';

  // Lista com KM percorrido embutido
  lista.innerHTML = abastecimentos.slice().reverse().map(g=>{
    const kmPercorrido = kmMap[g.id];
    const kmBadge = kmPercorrido != null
      ? `<span class="km-badge">🛣️ ${kmPercorrido.toLocaleString('pt-BR')} km</span>`
      : `<span class="km-badge km-badge-first">1º abastecimento</span>`;
    return `
    <div class="expense-item gas-item">
      <div class="exp-info">
        <strong>${GAS_TIPO_LABELS[g.tipo]||g.tipo} &mdash; ${g.litros.toFixed(2)} L &mdash; ${g.kmAtual.toLocaleString('pt-BR')} km</strong>
        <small>${new Date(g.data+'T12:00:00').toLocaleDateString('pt-BR')} | R$ ${g.precoLitro.toFixed(3)}/L${g.posto?' | '+g.posto:''}</small>
        ${kmBadge}
      </div>
      <div class="gas-item-right">
        <span class="exp-value">R$ ${g.valorTotal.toFixed(2)}</span>
        ${kmPercorrido!=null?`<span class="gas-consumo-mini">${(kmPercorrido/g.litros).toFixed(2)} km/L</span>`:''}
        <button class="exp-delete" onclick="deletarAbastecimento(${g.id})">🗑️</button>
      </div>
    </div>`;
  }).join('');
}
function deletarAbastecimento(id){
  if(!confirm('Excluir este abastecimento?'))return;
  abastecimentos=abastecimentos.filter(g=>g.id!==id);
  save('abastecimentos',abastecimentos);atualizarGasolina();
}

// ========== PDF GENERATION ==========
const DEV_INFO = {empresa:'StartWeb',dev:'Roberto Ursine',tel:'(11) 98285-6216'};

function pdfHeader(doc, titulo){
  // Marca d'água diagonal
  doc.setFontSize(42);
  doc.setTextColor(220, 230, 245);
  doc.setFont('helvetica','bold');
  doc.text('Le Guincho', 55, 148, {angle: 45});

  // Cabeçalho azul - Logo
  doc.setFontSize(20);
  doc.setTextColor(0, 88, 176);
  doc.setFont('helvetica','bold');
  doc.text('Le Guincho', 14, 16);

  // Subtítulo
  doc.setFontSize(9);
  doc.setTextColor(100, 120, 150);
  doc.setFont('helvetica','normal');
  doc.text('App do Motorista', 14, 23);

  // Separador
  doc.setDrawColor(0, 88, 176);
  doc.setLineWidth(0.5);
  doc.line(14, 26, 196, 26);

  // Título do relatório
  doc.setFontSize(15);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica','bold');
  doc.text(titulo, 14, 34);

  // Data de geração
  doc.setFontSize(8);
  doc.setTextColor(130, 140, 155);
  doc.setFont('helvetica','normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 41);

  return 48;
}
function pdfFooter(doc){
  const h=doc.internal.pageSize.height;
  doc.setFontSize(8);doc.setTextColor(120,120,120);
  doc.text(`Desenvolvido por ${DEV_INFO.empresa} | Dev: ${DEV_INFO.dev} | ${DEV_INFO.tel}`,14,h-10);
  doc.setDrawColor(0,100,200);doc.line(14,h-15,196,h-15);
}

function gerarPDFServicos(){
  if(!servicos.length){alert('Nenhum serviço para gerar relatório');return;}
  const{jsPDF}=window.jspdf;const doc=new jsPDF();
  let y=pdfHeader(doc,'Relatório de Serviços');
  const cols=['Motorista','Seguradora','Data/Hora','Valor','Desc.','Pedágio','V. Final'];
  const rows=servicos.map(s=>[
    s.motorista,
    s.seguradora,
    new Date(s.horario).toLocaleString('pt-BR'),
    'R$ '+s.valor.toFixed(2),
    s.desconto+'%',
    s.pedagio==='sim'?'Sim':'Não',
    'R$ '+s.valorFinal.toFixed(2)
  ]);
  doc.autoTable({
    head:[cols],
    body:rows,
    startY:y,
    styles:{fontSize:8,cellPadding:3},
    headStyles:{fillColor:[0,80,160],textColor:[255,255,255],fontStyle:'bold'},
    alternateRowStyles:{fillColor:[240,245,255]},
    columnStyles:{
      0:{cellWidth:25},
      1:{cellWidth:25},
      2:{cellWidth:38},
      3:{cellWidth:22,halign:'right'},
      4:{cellWidth:15,halign:'center'},
      5:{cellWidth:18,halign:'center'},
      6:{cellWidth:27,halign:'right',fontStyle:'bold'}
    }
  });
  const total=servicos.reduce((a,s)=>a+s.valorFinal,0);
  const fy=doc.lastAutoTable.finalY+10;
  doc.setFontSize(11);doc.setTextColor(0,0,0);doc.setFont('helvetica','bold');
  doc.text(`Total de Serviços: ${servicos.length}`,14,fy);
  doc.text(`Valor Total: R$ ${total.toFixed(2)}`,14,fy+8);
  doc.setFont('helvetica','normal');
  pdfFooter(doc);doc.save('Relatorio_Servicos_LeGuincho.pdf');
}

function gerarPDFChecklistById(id){
  const c=checklists.find(x=>x.id===id);if(!c){alert('Checklist não encontrado');return;}
  gerarPDFChecklistData(c);
}
function gerarPDFChecklist(){
  if(!checklists.length){alert('Nenhum checklist salvo');return;}
  gerarPDFChecklistData(checklists[checklists.length-1]);
}
function gerarPDFChecklistData(c){
  const{jsPDF}=window.jspdf;const doc=new jsPDF();
  let y=pdfHeader(doc,'Relatório de Checklist');
  // Vehicle info
  doc.setFontSize(11);doc.setTextColor(0,80,160);doc.text('Dados do Veículo',14,y);y+=7;
  doc.setFontSize(9);doc.setTextColor(0,0,0);
  doc.text(`Placa: ${c.veiculo.placa||'—'} | Modelo: ${c.veiculo.modelo||'—'} | Cor: ${c.veiculo.cor||'—'} | Ano: ${c.veiculo.ano||'—'}`,14,y);y+=5;
  doc.text(`Seguradora: ${c.veiculo.seguradora||'—'}`,14,y);y+=8;
  // Owner info
  if(c.proprietario.nome||c.proprietario.cpf||c.proprietario.telefone){
    doc.setFontSize(11);doc.setTextColor(0,80,160);doc.text('Dados do Proprietário',14,y);y+=7;
    doc.setFontSize(9);doc.setTextColor(0,0,0);
    if(c.proprietario.nome)doc.text(`Nome: ${c.proprietario.nome}`,14,y),y+=5;
    if(c.proprietario.cpf)doc.text(`CPF: ${c.proprietario.cpf}`,14,y),y+=5;
    if(c.proprietario.telefone)doc.text(`Tel: ${c.proprietario.telefone}`,14,y),y+=5;
    if(c.proprietario.endereco)doc.text(`End: ${c.proprietario.endereco}`,14,y),y+=5;
    if(c.proprietario.email)doc.text(`Email: ${c.proprietario.email}`,14,y),y+=5;
    y+=3;
  }
  // Checklist table
  doc.setFontSize(11);doc.setTextColor(0,80,160);doc.text('Inspeção do Veículo',14,y);y+=4;
  const rows=CHECKLIST_PARTS.map(p=>{
    const item=c.itens[p.id]||{status:'none',obs:''};
    const st=item.status==='ok'?'OK':item.status==='avariado'?'AVARIADO':'Não verificado';
    return[p.label,st,item.obs||'—'];
  });
  doc.autoTable({head:[['Parte','Status','Observação']],body:rows,startY:y,styles:{fontSize:8},headStyles:{fillColor:[0,80,160]},
    didParseCell:function(data){
      if(data.section==='body'&&data.column.index===1){
        if(data.cell.raw==='OK')data.cell.styles.textColor=[0,160,80];
        if(data.cell.raw==='AVARIADO')data.cell.styles.textColor=[220,50,50];
      }
    }
  });
  const fy2=doc.lastAutoTable.finalY+5;
  if(c.observacaoGeral){doc.setFontSize(9);doc.setTextColor(0,0,0);doc.text(`Obs: ${c.observacaoGeral}`,14,fy2);}
  doc.text(`Data: ${new Date(c.data).toLocaleString('pt-BR')}`,14,fy2+7);
  pdfFooter(doc);doc.save('Checklist_LeGuincho.pdf');
}

function gerarPDFFotos(){
  if(!fotos.length){alert('Nenhuma foto para gerar relatório');return;}
  const{jsPDF}=window.jspdf;const doc=new jsPDF();
  let y=pdfHeader(doc,'Relatório de Fotos');
  fotos.forEach((f,i)=>{
    if(y>230){doc.addPage();y=20;}
    try{
      doc.addImage(f.data,'JPEG',14,y,80,60);
      doc.setFontSize(8);doc.setTextColor(80,80,80);
      doc.text(f.descricao||'Foto '+(i+1),100,y+10);
      doc.text(new Date(f.timestamp).toLocaleString('pt-BR'),100,y+17);
      y+=70;
    }catch(e){y+=10;}
  });
  pdfFooter(doc);doc.save('Fotos_LeGuincho.pdf');
}

function gerarPDFDespesas(){
  if(!despesas.length){alert('Nenhuma despesa para gerar relatório');return;}
  const{jsPDF}=window.jspdf;const doc=new jsPDF();
  let y=pdfHeader(doc,'Relatório de Despesas');
  const cols=['Categoria','Data','Descrição','Valor'];
  const rows=despesas.map(d=>[EXPENSE_LABELS[d.tipo]||d.tipo,new Date(d.data+'T12:00:00').toLocaleDateString('pt-BR'),d.descricao||'—','R$ '+d.valor.toFixed(2)]);
  doc.autoTable({head:[cols],body:rows,startY:y,styles:{fontSize:8},headStyles:{fillColor:[0,80,160]}});
  const total=despesas.reduce((a,d)=>a+d.valor,0);
  const fy=doc.lastAutoTable.finalY+10;
  doc.setFontSize(10);doc.setTextColor(0,0,0);
  doc.text(`Total de Despesas: R$ ${total.toFixed(2)}`,14,fy);
  // By category
  const totais={};despesas.forEach(d=>{totais[d.tipo]=(totais[d.tipo]||0)+d.valor;});
  let cy=fy+10;
  Object.entries(totais).forEach(([k,v])=>{
    doc.setFontSize(9);doc.text(`${EXPENSE_LABELS[k]||k}: R$ ${v.toFixed(2)}`,14,cy);cy+=6;
  });
  pdfFooter(doc);doc.save('Despesas_LeGuincho.pdf');
}

function gerarPDFCompleto(){
  const{jsPDF}=window.jspdf;const doc=new jsPDF();
  let y=pdfHeader(doc,'Relatório Completo');
  // Services
  if(servicos.length){
    doc.setFontSize(12);doc.setTextColor(0,80,160);doc.text('Serviços',14,y);y+=4;
    const rows=servicos.map(s=>[s.motorista,s.seguradora,new Date(s.horario).toLocaleString('pt-BR'),'R$ '+s.valorFinal.toFixed(2)]);
    doc.autoTable({head:[['Motorista','Seguradora','Data','Valor Final']],body:rows,startY:y,styles:{fontSize:7},headStyles:{fillColor:[0,80,160]}});
    y=doc.lastAutoTable.finalY+8;
  }
  // Latest checklist
  if(checklists.length){
    if(y>200){doc.addPage();y=20;}
    const c=checklists[checklists.length-1];
    doc.setFontSize(12);doc.setTextColor(0,80,160);doc.text('Último Checklist',14,y);y+=6;
    doc.setFontSize(8);doc.setTextColor(0,0,0);
    doc.text(`${c.veiculo.placa||'—'} | ${c.veiculo.modelo||'—'} | ${new Date(c.data).toLocaleString('pt-BR')}`,14,y);y+=5;
    const rows=CHECKLIST_PARTS.map(p=>{const it=c.itens[p.id]||{status:'none'};return[p.label,it.status==='ok'?'OK':it.status==='avariado'?'AVARIADO':'—'];});
    doc.autoTable({head:[['Parte','Status']],body:rows,startY:y,styles:{fontSize:7},headStyles:{fillColor:[0,80,160]},
      didParseCell:function(data){if(data.section==='body'&&data.column.index===1){if(data.cell.raw==='OK')data.cell.styles.textColor=[0,160,80];if(data.cell.raw==='AVARIADO')data.cell.styles.textColor=[220,50,50];}}
    });
    y=doc.lastAutoTable.finalY+8;
  }
  // Photos
  if(fotos.length){
    if(y>200){doc.addPage();y=20;}
    doc.setFontSize(12);doc.setTextColor(0,80,160);doc.text('Fotos',14,y);y+=6;
    fotos.forEach((f,i)=>{
      if(y>230){doc.addPage();y=20;}
      try{doc.addImage(f.data,'JPEG',14,y,60,45);doc.setFontSize(7);doc.setTextColor(80,80,80);doc.text(f.descricao||'',80,y+10);y+=52;}catch(e){y+=5;}
    });
  }
  // Expenses
  if(despesas.length){
    if(y>200){doc.addPage();y=20;}
    doc.setFontSize(12);doc.setTextColor(0,80,160);doc.text('Despesas',14,y);y+=4;
    const rows=despesas.map(d=>[EXPENSE_LABELS[d.tipo]||d.tipo,new Date(d.data+'T12:00:00').toLocaleDateString('pt-BR'),'R$ '+d.valor.toFixed(2)]);
    doc.autoTable({head:[['Categoria','Data','Valor']],body:rows,startY:y,styles:{fontSize:7},headStyles:{fillColor:[0,80,160]}});
  }
  pdfFooter(doc);doc.save('Relatorio_Completo_LeGuincho.pdf');
}

function gerarPDFGasolina(){
  if(!abastecimentos.length){alert('Nenhum abastecimento para gerar relatório');return;}
  const{jsPDF}=window.jspdf;const doc=new jsPDF();
  let y=pdfHeader(doc,'Relatório de Gasolina & KM');

  // Calcular KM percorrido por abastecimento
  const sorted=[...abastecimentos].sort((a,b)=>a.kmAtual-b.kmAtual);
  const totalLitros=abastecimentos.reduce((a,g)=>a+g.litros,0);
  const totalCusto=abastecimentos.reduce((a,g)=>a+g.valorTotal,0);
  const kmRodados=sorted.length>=2?sorted[sorted.length-1].kmAtual-sorted[0].kmAtual:0;
  const mediaConsumo=kmRodados>0&&totalLitros>0?(kmRodados/totalLitros).toFixed(2):'—';

  // Resumo no topo (igual ao estilo da imagem)
  doc.setFontSize(9);doc.setTextColor(80,80,80);doc.setFont('helvetica','normal');
  const resumoLines = [
    `Total de Abastecimentos: ${abastecimentos.length}`,
    `Total de Litros: ${totalLitros.toFixed(2)} L`,
    `KM Rodados (período): ${kmRodados.toLocaleString('pt-BR')} km`,
    `Média de Consumo: ${mediaConsumo} km/L`,
    `Custo Total: R$ ${totalCusto.toFixed(2)}`
  ];
  resumoLines.forEach(line=>{ doc.text(line,14,y); y+=6; });
  y+=4;

  // Tabela principal com coluna KM Percorrido
  const cols=['Motorista/Posto','Data','Combustível','KM Atual','KM Percorrido','Litros','Consumo','Total'];
  const rows=sorted.map((g,i)=>{
    const kmPerc = i===0 ? '—' : (sorted[i].kmAtual - sorted[i-1].kmAtual).toLocaleString('pt-BR')+' km';
    const consumo = i===0 ? '—' : ((sorted[i].kmAtual-sorted[i-1].kmAtual)/g.litros).toFixed(2)+' km/L';
    return[
      g.posto||'—',
      new Date(g.data+'T12:00:00').toLocaleDateString('pt-BR'),
      (GAS_TIPO_LABELS[g.tipo]||g.tipo).replace(/[\u26fd\ud83c\udf3f\ud83d\udd35\ud83d\udca8]\s/,''),
      g.kmAtual.toLocaleString('pt-BR'),
      kmPerc,
      g.litros.toFixed(2)+' L',
      consumo,
      'R$ '+g.valorTotal.toFixed(2)
    ];
  });

  doc.autoTable({
    head:[cols],
    body:rows,
    startY:y,
    styles:{fontSize:7.5,cellPadding:3},
    headStyles:{fillColor:[0,88,176],textColor:[255,255,255],fontStyle:'bold'},
    alternateRowStyles:{fillColor:[240,248,255]},
    columnStyles:{
      0:{cellWidth:28},
      1:{cellWidth:20},
      2:{cellWidth:22},
      3:{cellWidth:22,halign:'right'},
      4:{cellWidth:25,halign:'right',fontStyle:'bold'},
      5:{cellWidth:16,halign:'right'},
      6:{cellWidth:22,halign:'right'},
      7:{cellWidth:22,halign:'right',fontStyle:'bold'}
    }
  });

  const fy=doc.lastAutoTable.finalY+10;
  doc.setFontSize(11);doc.setTextColor(0,0,0);doc.setFont('helvetica','bold');
  doc.text(`Total de Abastecimentos: ${abastecimentos.length}`,14,fy);
  doc.text(`Total de Litros: ${totalLitros.toFixed(2)} L`,14,fy+8);
  doc.text(`KM Rodados: ${kmRodados.toLocaleString('pt-BR')} km`,14,fy+16);
  doc.text(`Custo Total: R$ ${totalCusto.toFixed(2)}`,14,fy+24);
  doc.setFont('helvetica','normal');

  pdfFooter(doc);doc.save('Gasolina_KM_LeGuincho.pdf');
}

// ========== INIT ==========
atualizarDashboard();
atualizarServicos();
atualizarChecklistResumo();
atualizarChecklistsSalvos();
atualizarGaleria();
atualizarDespesas();
atualizarGasolina();