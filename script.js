
/*
    CONFIGURAÇÕES DO PROJETO

    Altere o endereço para a unidade da UNINASSAU
    que será utilizada como ponto de partida.
*/

const ORIGEM = "UNINASSAU, Fortaleza, Ceará, Brasil";

// Parâmetros ilustrativos para a estimativa do frete
const TAXA_BASE = 4.50;
const PRECO_POR_KM = 1.65;
const FRETE_MINIMO = 7.50;

let dadosCEP = null;

// Formata o CEP automaticamente
document.getElementById("cep").addEventListener("input", function () {
    let valor = this.value.replace(/\D/g, "").slice(0, 8);

    if (valor.length > 5) {
        valor = valor.replace(/^(\d{5})(\d)/, "$1-$2");
    }

    this.value = valor;
});

// API pública ViaCEP
async function buscarCEP() {

    const cep = document.getElementById("cep").value.replace(/\D/g, "");
    const endereco = document.getElementById("endereco");
    const mensagem = document.getElementById("mensagem");

    mensagem.textContent = "";

    if (cep.length !== 8) {
        mensagem.textContent = "Digite um CEP válido com 8 números.";
        return;
    }

    endereco.textContent = "Consultando endereço...";

    try {

        const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

        if (!resposta.ok) {
            throw new Error("Erro na consulta do CEP.");
        }

        const dados = await resposta.json();

        if (dados.erro) {
            endereco.textContent = "CEP não encontrado.";
            return;
        }

        dadosCEP = dados;

        endereco.innerHTML = `
            <strong>Endereço encontrado:</strong><br>
            ${dados.logradouro || "Logradouro não informado"},
            ${dados.bairro || "Bairro não informado"}<br>
            ${dados.localidade} - ${dados.uf}
        `;

    } catch (erro) {

        endereco.textContent = "Não foi possível consultar o CEP.";
        console.error(erro);

    }
}

// Geocodificação usando Nominatim (OpenStreetMap)
async function obterCoordenadas(endereco) {

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(endereco)}`;

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error("Erro ao localizar endereço.");
    }

    const dados = await resposta.json();

    if (!dados.length) {
        throw new Error("Não foi possível localizar o endereço no mapa.");
    }

    return {
        latitude: Number(dados[0].lat),
        longitude: Number(dados[0].lon)
    };
}

// Fórmula de Haversine para calcular distância geográfica
function calcularDistancia(lat1, lon1, lat2, lon2) {

    const raioTerra = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return raioTerra * c;
}

// Cálculo estimado do preço
function calcularPreco(distancia) {

    const preco = TAXA_BASE + (distancia * PRECO_POR_KM);

    return Math.max(preco, FRETE_MINIMO);
}

// Função principal
async function calcularFrete() {

    const mensagem = document.getElementById("mensagem");
    const resultado = document.getElementById("resultado");
    const numero = document.getElementById("numero").value.trim();

    mensagem.style.color = "#e05252";

    if (!dadosCEP) {
        mensagem.textContent = "Primeiro consulte um CEP válido.";
        return;
    }

    if (!numero) {
        mensagem.textContent = "Informe o número do endereço.";
        return;
    }

    mensagem.style.color = "#555";
    mensagem.textContent = "Calculando distância e estimativa...";

    try {

        const enderecoDestino = [
            dadosCEP.logradouro,
            numero,
            dadosCEP.bairro,
            dadosCEP.localidade,
            dadosCEP.uf,
            "Brasil"
        ].filter(Boolean).join(", ");

        // Localiza origem e destino
        const origem = await obterCoordenadas(ORIGEM);
        const destino = await obterCoordenadas(enderecoDestino);

        // Distância em linha reta
        const distancia = calcularDistancia(
            origem.latitude,
            origem.longitude,
            destino.latitude,
            destino.longitude
        );

        // Aproximação para trajeto por vias
        const distanciaEstimada = distancia * 1.3;

        const preco = calcularPreco(distanciaEstimada);

        document.getElementById("distancia").textContent =
            distanciaEstimada.toFixed(2).replace(".", ",") + " km";

        document.getElementById("preco").textContent =
            preco.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            });

        resultado.style.display = "grid";

        mensagem.style.color = "#16834a";
        mensagem.textContent = "Estimativa calculada com sucesso!";

    } catch (erro) {

        mensagem.style.color = "#e05252";
        mensagem.textContent = erro.message;

        console.error(erro);

    }
}
