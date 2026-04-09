// Carrega serviços do LocalStorage
let servicos = JSON.parse(localStorage.getItem("servicos")) || [];

// Adicionar serviço
document.getElementById("formServico").addEventListener("submit", function(e) {
  e.preventDefault();

  const cliente = document.getElementById("cliente").value.trim();
  const seguradora = document.getElementById("seguradora").value.trim();
  const horario = new Date(document.getElementById("horario").value);
  const valor = parseFloat(document.getElementById("valor").value);
  const desconto = parseFloat(document.getElementById("desconto").value);
  const pedagio = document.getElementById("pedagio").value; // sim ou nao
  const valorPedagio = parseFloat(document.getElementById("valorPedagio").value) || 0;

  if (!cliente || !seguradora || isNaN(valor) || isNaN(desconto)) {
    alert("Preencha todos os campos corretamente!");
    return;
  }

  // Valor final = valor - desconto + pedágio
  const valorFinal = (valor - (valor * desconto / 100)) + valorPedagio;

  const servico = { 
    id: Date.now(), 
    cliente, 
    seguradora, 
    horario, 
    valor, 
    desconto, 
    pedagio, 
    valorPedagio, 
    valorFinal 
  };

  servicos.push(servico);
  salvarLocal();
  atualizarTabela();

  e.target.reset(); // limpa formulário
});

// Salvar no LocalStorage
function salvarLocal() {
  localStorage.setItem("servicos", JSON.stringify(servicos));
}

// Atualizar tabela com filtro opcional
function atualizarTabela(filtro = "") {
  const tbody = document.querySelector("#tabelaServicos tbody");
  tbody.innerHTML = "";

  servicos
    .filter(s =>
      s.cliente.toLowerCase().includes(filtro.toLowerCase()) ||
      s.seguradora.toLowerCase().includes(filtro.toLowerCase()) ||
      new Date(s.horario).toLocaleString().toLowerCase().includes(filtro.toLowerCase()) ||
      s.valor.toString().includes(filtro) ||
      s.desconto.toString().includes(filtro) ||
      s.pedagio.toLowerCase().includes(filtro.toLowerCase())
    )
    .forEach(s => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.cliente}</td>
        <td>${s.seguradora}</td>
        <td>${new Date(s.horario).toLocaleString()}</td>
        <td>R$ ${s.valor.toFixed(2)}</td>
        <td>${s.desconto}%</td>
        <td>${s.pedagio === "sim" ? "Sim (R$ " + s.valorPedagio.toFixed(2) + ")" : "Não"}</td>
        <td>R$ ${s.valorFinal.toFixed(2)}</td>
        <td>
          <button onclick="editar(${s.id})">Editar</button>
          <button onclick="deletar(${s.id})">Excluir</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
}

// Editar serviço
function editar(id) {
  const servico = servicos.find(s => s.id === id);
  document.getElementById("cliente").value = servico.cliente;
  document.getElementById("seguradora").value = servico.seguradora;
  document.getElementById("horario").value = new Date(servico.horario).toISOString().slice(0,16);
  document.getElementById("valor").value = servico.valor;
  document.getElementById("desconto").value = servico.desconto;
  document.getElementById("pedagio").value = servico.pedagio;
  document.getElementById("valorPedagio").value = servico.valorPedagio;
  deletar(id); // remove para atualizar depois
}

// Deletar serviço
function deletar(id) {
  servicos = servicos.filter(s => s.id !== id);
  salvarLocal();
  atualizarTabela();
}

// Relatório simples (alerta)
document.getElementById("btnRelatorio").addEventListener("click", function() {
  let total = servicos.reduce((acc, s) => acc + s.valorFinal, 0);
  let pedagios = servicos.filter(s => s.pedagio === "sim").length;

  alert(
    "Relatório Le Guinchos\n" +
    "Total de Serviços: " + servicos.length + "\n" +
    "Serviços com Pedágio: " + pedagios + "\n" +
    "Valor Total: R$ " + total.toFixed(2)
  );
});

// Relatório em PDF com tabela
document.getElementById("btnPDF").addEventListener("click", function() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Relatório Le Guinchos", 14, 15);

  // Cabeçalho da tabela
  const colunas = ["Cliente", "Seguradora", "Horário", "Valor", "Desconto", "Pedágio", "Valor Final"];

  // Dados da tabela
  const linhas = servicos.map(s => [
    s.cliente,
    s.seguradora,
    new Date(s.horario).toLocaleString(),
    "R$ " + s.valor.toFixed(2),
    s.desconto + "%",
    s.pedagio === "sim" ? "Sim (R$ " + s.valorPedagio.toFixed(2) + ")" : "Não",
    "R$ " + s.valorFinal.toFixed(2)
  ]);

  // Gera tabela
  doc.autoTable({
    head: [colunas],
    body: linhas,
    startY: 25,
    styles: { fontSize: 10 }
  });

  // Totais
  let total = servicos.reduce((acc, s) => acc + s.valorFinal, 0);
  doc.text(`Total de Serviços: ${servicos.length}`, 14, doc.lastAutoTable.finalY + 10);
  doc.text(`Valor Total: R$ ${total.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 20);

  // Salva PDF
  doc.save("Relatorio_LeGuinchos.pdf");
});

// Pesquisa em tempo real
document.getElementById("pesquisa").addEventListener("input", function(e) {
  atualizarTabela(e.target.value);
});

// Inicializa tabela ao carregar
atualizarTabela();