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
    apiKey: ''
};

// Instruções do CineIA

const instrucoesCineIA = 
'Você é o CineIA, um assistente especializado em recomendar ' + 
'filmes e séries. Seja breve simpático e objetivo. ' +
'Sempre sugira pelo menos um título concreto.'+
'Explique em uma frase por que a recomendação combina com o pedido.'+
'Considere gênero, clima, estilo e referências mencionadas pelo usuário.';

//Histórico de conversa

let historico = [];

//Passo 1 - Salvar Configuração

btnSalvar.addEventListener('click', () => {
    //Remove espaços desnecessários
    config.endpoint = inputEndpoint.value.trim();
    config.deployment = inputDeployment.value.trim();
    config.apiKey = inputApiKey.value.trim();

    //Verificar se os três campos foram preenchidos
    if (!config.endpoint || !config.deployment || !config.apiKey){
        statusConfig.textContent = 'Preencha o Endpoint, o Deployment e a API Key.';
        return;
    }

    //Verifica se o endpoint possui o formato esperado
    if(!config.endpoint.includes('/openai/v1/responses')){
        statusConfig.textContent = 'O endpoint deve terminar com /openai/v1/responses.';

        return;
    }

    statusConfig.textContent = 'Configuração salva ✅';
});

//Passo 2 - Enviar mensagem

formChat.addEventListener('submit', async(evento) =>{
   
    //Impede que a página seja recarregada
    evento.preventDefault();

    //Pega o texto digitado pelo usuario
    const texto = campoMensagem.value.trim();

    //Não envia mensagens vazias
    if(!texto){
        return;
    }

    //Verifica se a configuração foi realizada
    if (!config.endpoint || !config.deployment || !config.apiKey){
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
    });

    //Mostra mensagem temporária enquanto aguarda a Azure
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
        carregando.textContent = 'Não foi possível obter uma resposta da Azure.';
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
    if (!config.endpoint || !config.deployment || !config.apiKey){
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
        input:historico
    };

    try{
    // Faz a requisição para a Azure
    const resposta = await fetch(url, {
        
        method:'POST',
        headers:{
            'Content-Type':'application/json',

            //Chave de acesso da Azure
            'api-key': config.apiKey
        },
        body: JSON.stringify(corpo)
    });

    //Tratamento de Erro
    if(!resposta.ok){
        const erroTexto = await resposta.text();
        console.error('Erro da Azure: ', erroTexto);
        
        //Tenta transformar o erro em Json
        let mensagemErro = erroTexto;

        try{
            const erroJson = JSON.parse(erroTexto);
            if(erroTexto.error?.message){
                mensagemErro = erroJson.error.message;
            }
        }catch{
            //Caso o retorno não seja JSON
            //Mantém o texto original.
        }

        return(
            `Ocorreu um erro(${resposta.status}): ${mensagemErro}`
        );
    }
        //Converte a resposta para JSON
        const dados = await resposta.json();

        console.log('Resposta completa da Azure:', dados);

        //Extrai o texto gerado
        // A Responses API disponibiliza o texto em:
        // dados.output_text
        if(dados.output_text){
            return dados.output_text;
        }

    //Fallback
    // Caso output_text não esteja disponível, tentamos localizar
    // o texto dentro da estrutura de output.

    if(Array.isArray(dados.output)){
        for(const item of dados.output){
            if(Array.isArray(item.content)){
                for(const conteudo of item.content){
                    if(conteudo.text){
                        return conteudo.text;
                    }
                }
            }
        }
    }

    console.error(
        'Não foi possível localizar o texto da resposta:',
        dados
    );
    return 'A Azure respondeu, mas não foi possível encontrar o texto da resposta.';
    }catch(erro){
        //Erro de conexão
        console.error('Erro de conexão com a Azure',erro);
        return(
            'Não foi possível conectar à Azure.'+
            'Verifique o endpoint, a API Key, o CORS e a sua conexão.'
        );
    }
}

//Função Auxiliar - Adicionar mensagem na tela
function adicionarMensagemNaTela(remetente, texto){
    
    const div = document.createElement('div');

    //Define a classe CSS da mensagem 
    div.classList.add(
        'msg',
        remetente === 'user'?'user':'bot'
    );

    //Insere o texto
    div.textContent = texto;

    //Adiciona a mensagem ao chat
    listaMensagens.appendChild(div);

    //Rola automaticamente para a última mensagem
    listaMensagens.scrollTop = listaMensagens.scrollHeight;

    return div;


}