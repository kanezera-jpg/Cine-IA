//Elementos da interface

const inputEndpoint = document.getElementById('endpoint');
const inputDeployment = document.getElementById('deployment');
const inputApiKey = document.getElementById('apiKey');

const btnSalvar = document.getElementById('btnSalvar');
const statusConfig = document.getElementById('statusConfig');

const formChat = document.getElementById('formChat');
const campoMensagem = document.getElementById('campoMensagem'); 
const listaMensagens = document.getElementById('mensagens');

//Configuração da API

let config = {
    endpoint:'',
    deployment:'',
    apikey:''
};

// Instruções do CineIA

const instrucoesCineIA = 'Você é o CineIA, um assistente especializado em recomendar ' +
'filmes e séries. Seja breve simpático e objetivo ' +
'Sempre sugira pelo menos um titulo concreto.'+
'Explique em uma frase por que a recomendação combina com o pedido.'
'Considere gênero, clima, estilo e referências mencionadas pelo usuário.'; 

// Histórico de conversa

let historico = [];

//Passo 1 - Salvar Configuração

btnSalvar.addEventListener('click', () => {
    //Remove espaçoes desnecessários
    config.endpoint = inputEndpoint.ariaValueMax.trim();
    config.deployment = inputDeployment.ariaValueMax.trim();
    config.apiKey = inputApiKey.ariaValueMax.trim();

    //Verificar se os três campos foram preenchidos
    if(!config.endpoint || !config.deployment || !config.apikey){
        statusConfig.textContent - 'Preencha o Ednpoint, o Deployment e a API Key';
        return;
    }

    //Verifica se o endpoint possui o formato esperado
    if(!config.endpoint.includes('/openai/v1/responses')){
        statusConfig.textContent = 'O endpoint deve terminar com /openai/v1/responses.'

        return;
    }

    statusConfig.textContent - 'Configuração salva ✅';
});

//Passo 2 - Enviar mensagem

formChat.addEventListener('submit', async(evento) =>{

    //Impede que a página seja recarregada
    evento.preventDefault();

    //Pega o texto digitado pelo usuário
    const texto = campoMensagem.value.trim()

    //Não envia mensagens vazias
    if(!texto){
        return;
    }

    //Verifica se a configuração foi realizada
    if(!config.endpoint || !config.deployment || !config.apiKey){
        adicionarMensagemNaTela(
            'bot',
            'Configure o Endpoint, o Deployment e a API Key antes de conversar.'
        );
        return;
    }

    //Mostrar a mensagem do usuário na tela
    adicionarMensagemNaTela('user', texto);

    //Limpar o campo texto
    campoMensagem.value = '';

    //Adicionar a mensagem ao histórico
    historico.push({
        role:'user',
        content:texto
    })

    //Mostra mensagem temporaria enquanto aguarda a azure
    const carregando = adicionarMensagemNaTela(
        'bot',
        'Pensando...'
    );

    //Desabilita o botão enquanto aguarda a resposta
    const botaoEnviar = formChat.querySelector('button[type="submit"]');

    if(botaoEnviar){
        botaoEnviar.disabled = true;
    }

    try{
        //Chama a Azure OpenAI
        const resposta = await perguntaParaAzure();

        //Substituir "Pensando..." pela resposta
        carregando.textContent = resposta;

        //Só adiciona ao histórico se recebemos uma resposta válida
        if(resposta && !resposta.startsWith('Ocorreu um erro')){

            historico.push({
                role: 'assistant',
                content: resposta
            });
        }
    }catch(erro){
        console.error('Erro no chat', erro);
        carregando.textContent = 'Não foi possível obter uma resposta da Azure'
    }finally{
        //Reativa o botão
        if(botaoEnviar){
            botaoEnviar.disabled = false;
        }
        //Devolve o foco para o campo de mensagem
        campoMensagem.focus();
    }
});


//Função Principal - Azure OpenAI responses API
async function perguntaParaAzure() {
    //Verifica a configuração
    if(!config.endpoint || !config.deployment || !config.apiKey){
        return(
            'Configure o Endpoint, o Deployment e a API Key antes de conversar.'
        );
    }

    //Endpoint
    const url = config.endpoint.replace(/\/+$/, '');
    //Corpo da Requisição

    const corpo = {
        model: config.deployment,
        instructions: instrucoesCineIA,
        input: historico
    };
}
