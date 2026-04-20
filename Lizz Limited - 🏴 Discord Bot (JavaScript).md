# Lizz Limited - 🏴 Discord Bot (JavaScript)

Este é o código-fonte para o bot Discord "Lizz Limited - 🏴", um proxy multifuncional para envio de mensagens, GIFs e anexos, desenvolvido para contornar limitações de contas no Discord, agora em JavaScript e com suporte a **Aplicativos de Usuário (User Installable Apps)**.

## Funcionalidades

- **`/proxy`**: Envia mensagens de texto, links de GIFs e anexos para um destino pré-configurado. Pode ser usado em servidores, DMs e canais privados.
- **`/set_destino <tipo> <ID>`**: Configura o canal ou usuário para onde o bot enviará o conteúdo. Tipos suportados: `channel` (canal) e `user` (usuário). A configuração é **individual** para cada servidor ou para a sua instalação de usuário.
- **`/authorize_user <ID>`**: Autoriza um usuário a utilizar os comandos do bot **apenas em instalações de servidor**. O primeiro usuário a executar este comando em um servidor será automaticamente autorizado e poderá autorizar outros para aquele servidor.

## Configuração e Execução

Siga os passos abaixo para configurar e executar o seu bot:

### 1. Pré-requisitos

Certifique-se de ter o [Node.js](https://nodejs.org/en/download/) (versão 16.x ou superior) instalado em seu sistema.

### 2. Instalação das Dependências

Abra o terminal ou prompt de comando na pasta do projeto e execute o seguinte comando para instalar as bibliotecas `discord.js` e `dotenv`:

```bash
npm install discord.js dotenv
```

### 3. Obtenção do Token do Bot

1. Vá para o [Portal do Desenvolvedor do Discord](https://discord.com/developers/applications).
2. Crie uma nova aplicação ou selecione uma existente.
3. Na barra lateral esquerda, clique em "Bot".
4. Clique em "Add Bot" e confirme.
5. Em "Privileged Gateway Intents", ative as opções "PRESENCE INTENT", "SERVER MEMBERS INTENT" e "MESSAGE CONTENT INTENT".
6. Clique em "Reset Token" e copie o token gerado. **Mantenha este token em segredo!**

### 4. Adicionando o Token ao Bot

Crie um arquivo chamado `.env` na mesma pasta do script `lizz_limited_bot.js` e adicione a seguinte linha:

```
DISCORD_TOKEN=SEU_TOKEN_AQUI
```

Substitua `SEU_TOKEN_AQUI` pelo token que você copiou do Portal do Desenvolvedor do Discord.

### 5. Configuração Inicial (`config.json`)

O arquivo `config.json` será criado automaticamente na primeira execução, ou você pode criá-lo manualmente na mesma pasta do script com o seguinte conteúdo:

```json
{
    "guildConfigs": {},
    "userConfigs": {}
}
```

Este arquivo armazenará as configurações de destino e usuários autorizados para cada servidor (`guildConfigs`) e para cada usuário que instalar o bot como aplicativo de usuário (`userConfigs`). **Não edite este arquivo manualmente após a primeira execução, use os comandos do bot.**

### 6. Executando o Bot

No terminal ou prompt de comando, navegue até a pasta onde você salvou o arquivo `lizz_limited_bot.js` e execute:

```bash
node lizz_limited_bot.js
```

O bot deverá se conectar ao Discord e sincronizar os comandos de barra.

### 7. Adicionando o Bot ao Seu Servidor Discord (Instalação em Guilda)

1. No Portal do Desenvolvedor, vá para "OAuth2" -> "URL Generator".
2. Em "SCOPES", selecione `bot` e `applications.commands`.
3. Em "BOT PERMISSIONS", selecione as permissões necessárias, como `Send Messages`, `Send Messages in Threads`, `Embed Links`, `Attach Files`.
4. Copie o URL gerado e cole-o no seu navegador para adicionar o bot ao seu servidor.

### 8. Instalando o Bot como Aplicativo de Usuário (User Installable App)

Para usar o bot em DMs ou em servidores onde ele não foi adicionado, você precisa instalá-lo como um aplicativo de usuário:

1. No Portal do Desenvolvedor, vá para "OAuth2" -> "URL Generator".
2. Em "SCOPES", selecione `applications.commands.permissions.update`.
3. Copie o URL gerado e cole-o no seu navegador. Isso permitirá que você autorize o bot a usar comandos de barra em seu nome.
4. Após a autorização, você poderá usar os comandos `/proxy` e `/set_destino` em qualquer lugar do Discord, incluindo DMs e outros servidores, como se fosse um comando nativo seu.

## Uso dos Comandos

Após o bot estar online e instalado (seja em um servidor ou como aplicativo de usuário):

1.  **Autorize-se (apenas para instalações em servidor)**: Se o bot estiver em um servidor, use o comando `/authorize_user <seu_ID_de_usuário>` para se autorizar a usar o bot. Você pode encontrar seu ID de usuário ativando o Modo Desenvolvedor no Discord (Configurações de Usuário -> Avançado) e clicando com o botão direito no seu nome de usuário.
2.  **Configure o Destino**: Use `/set_destino channel <ID_do_canal>` ou `/set_destino user <ID_do_usuário>` para definir onde as mensagens serão enviadas. O ID do canal pode ser obtido clicando com o botão direito no canal e selecionando "Copiar ID".
    *   **Importante**: Se você usar este comando em um servidor, o destino será salvo para aquele servidor. Se usar em uma DM (como aplicativo de usuário), o destino será salvo para a sua instalação de usuário.
3.  **Envie Conteúdo**: Use o comando `/proxy` com os parâmetros `mensagem`, `gif_link` ou `anexo` para enviar seu conteúdo.

Exemplo:

`/proxy mensagem: Minha conta está limitada, por favor, me ajudem! gif_link: https://media.giphy.com/media/XXXX/giphy.gif anexo: <anexo_aqui>`

**Observação sobre Anexos:** A funcionalidade de reenvio de anexos foi implementada para baixar o anexo da mensagem original e re-uploadá-lo para o destino. Este processo consome largura de banda e está sujeito aos limites de tamanho de arquivo do Discord. Certifique-se de que o bot tenha as permissões necessárias para gerenciar anexos no destino.
