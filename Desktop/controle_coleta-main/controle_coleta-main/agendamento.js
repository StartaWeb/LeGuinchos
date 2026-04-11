// ============================================================
//  agendamento.js — Integrado com Firebase Firestore
// ============================================================

document.getElementById('coletaForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const btnSubmit = this.querySelector('button[type="submit"]');
  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Salvando...';

  try {
    const cliente      = document.getElementById('cliente').value.trim();
    const solicitante  = document.getElementById('solicitante').value.trim();
    const atendente    = document.getElementById('atendente').value.trim();
    const numeroProtocolo = document.getElementById('protocolo').value.trim();
    const notaFiscal   = document.getElementById('notaFiscal').value.trim();
    const ordemServico = document.getElementById('ordemServico').value.trim();
    const observacao   = document.getElementById('observacao').value.trim();
    const prazo        = document.getElementById('prazo').value;

    // Número de coleta sequencial via Firestore (compartilhado entre todos)
    const numeroColeta  = await proximoNumeroColeta();
    const numeroServico = ordemServico || gerarNumeroServico();

    const agora = new Date();
    const dataHoraAgendamento = agora.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    const coleta = {
      cliente,
      solicitante,
      atendente,
      numeroProtocolo,
      notaFiscal,
      numeroServico,
      observacao,
      prazo,
      numeroColeta,
      dataHoraAgendamento,
      status: 'Agendada'
    };

    await salvarColeta(coleta);

    document.getElementById('confirmacao').innerHTML = `
      <h2>✅ Coleta Agendada!</h2>
      <p><strong>Número da Coleta:</strong> ${numeroColeta}</p>
      <p><strong>Cliente:</strong> ${cliente}</p>
      <p><strong>Solicitante:</strong> ${solicitante}</p>
      <p><strong>Atendente:</strong> ${atendente}</p>
      <p><strong>Número de Protocolo:</strong> ${numeroProtocolo || '-'}</p>
      <p><strong>Nota Fiscal:</strong> ${notaFiscal || '-'}</p>
      <p><strong>Ordem de Serviço:</strong> ${numeroServico}</p>
      <p><strong>Observação:</strong> ${observacao || '-'}</p>
      <p><strong>Prazo:</strong> ${prazo}</p>
      <p><strong>Agendada em:</strong> ${dataHoraAgendamento}</p>
      <p style="color:#4caf50; font-weight:700; margin-top:12px;">💾 Salvo no banco de dados com sucesso!</p>
    `;

    document.getElementById('coletaForm').reset();

  } catch (error) {
    console.error('Erro ao salvar coleta:', error);
    mostrarStatusConexao(false);
    document.getElementById('confirmacao').innerHTML = `
      <p style="color:red;">❌ Erro ao salvar: ${error.message}</p>
    `;
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Agendar Coleta';
  }
});

function gerarNumeroServico() {
  const agora = new Date();
  return (
    'SRV-' +
    agora.getFullYear().toString().slice(-2) +
    (agora.getMonth() + 1).toString().padStart(2, '0') +
    agora.getDate().toString().padStart(2, '0') +
    '-' +
    Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  );
}