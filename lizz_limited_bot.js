// lizz_limited_bot.js

const { Client, GatewayIntentBits, Collection, AttachmentBuilder, ApplicationCommandType, ApplicationCommandOptionType, ContextMenuCommandBuilder } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config();

// --- Configuration --- //
const CONFIG_FILE = "config.json";

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  }
  return { guildConfigs: {}, userConfigs: {} };
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 4));
}

let config = loadConfig();

// --- Bot Setup --- //
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Required for accessing message content
    GatewayIntentBits.DirectMessages, // For DMs
  ],
});

client.commands = new Collection();

// --- Helper Functions --- //
async function getEffectiveConfig(interaction) {
  if (interaction.guildId) {
    // Guild context
    if (!config.guildConfigs[interaction.guildId]) {
      config.guildConfigs[interaction.guildId] = { destinationId: null, destinationType: null, authorizedUsers: [] };
      saveConfig(config);
    }
    return config.guildConfigs[interaction.guildId];
  } else {
    // DM or User context (user installed app)
    if (!config.userConfigs[interaction.user.id]) {
      config.userConfigs[interaction.user.id] = { destinationId: null, destinationType: null };
      saveConfig(config);
    }
    return config.userConfigs[interaction.user.id];
  }
}

async function isAuthorized(interaction) {
  const effectiveConfig = await getEffectiveConfig(interaction);

  if (!interaction.guildId) {
    // If it's a user-installed app (DM or private channel), the user is always authorized.
    return true;
  }

  // For guild-installed apps, check authorizedUsers list.
  // If no authorized users are set for the guild, the first user to run authorize_user becomes admin.
  if (effectiveConfig.authorizedUsers.length === 0) {
    return true; // Allow first user to set up authorization
  }
  return effectiveConfig.authorizedUsers.includes(interaction.user.id);
}

async function getDestination(clientInstance, interaction) {
  const effectiveConfig = await getEffectiveConfig(interaction);
  const destId = effectiveConfig.destinationId;
  const destType = effectiveConfig.destinationType;

  if (!destId || !destType) {
    return null;
  }

  try {
    if (destType === "channel") {
      return await clientInstance.channels.fetch(destId);
    } else if (destType === "user") {
      return await clientInstance.users.fetch(destId);
    }
  } catch (error) {
    console.error("Erro ao buscar destino:", error);
    return null;
  }
  return null;
}

// --- Events --- //
client.once("ready", async () => {
  console.log(`Bot conectado como ${client.user.tag} - Lizz Limited 🏴`);
  console.log("Sincronizando comandos de barra...");

  // Define integration types and contexts for commands
  const integrationTypes = [0, 1]; // 0 = GUILD_INSTALL, 1 = USER_INSTALL
  const contexts = [0, 1, 2]; // 0 = GUILD, 1 = BOT_DM, 2 = PRIVATE_CHANNEL

  const commands = [
    {
      name: "proxy",
      description: "Envia mensagens, GIFs ou anexos através do bot.",
      type: ApplicationCommandType.ChatInput,
      integration_types: integrationTypes,
      contexts: contexts,
      options: [
        {
          name: "mensagem",
          type: ApplicationCommandOptionType.String,
          description: "A mensagem de texto para enviar.",
          required: false,
        },
        {
          name: "gif_link",
          type: ApplicationCommandOptionType.String,
          description: "Um link direto para um GIF (ex: https://media.giphy.com/media/XXXX/giphy.gif).",
          required: false,
        },
        {
          name: "anexo",
          type: ApplicationCommandOptionType.Attachment,
          description: "Anexe um arquivo diretamente ao comando.",
          required: false,
        },
      ],
    },
    {
      name: "set_destino",
      description: "Configura o canal ou usuário para onde as mensagens serão enviadas.",
      type: ApplicationCommandType.ChatInput,
      integration_types: integrationTypes,
      contexts: contexts,
      options: [
        {
          name: "destino_tipo",
          type: ApplicationCommandOptionType.String,
          description: "O tipo de destino (canal ou usuario).",
          required: true,
          choices: [
            { name: "canal", value: "channel" },
            { name: "usuario", value: "user" },
          ],
        },
        {
          name: "destino_id",
          type: ApplicationCommandOptionType.String,
          description: "O ID do canal ou usuário.",
          required: true,
        },
      ],
    },
    {
      name: "authorize_user",
      description: "Autoriza um usuário a usar os comandos do bot (apenas para instalações em guildas).",
      type: ApplicationCommandType.ChatInput,
      integration_types: [0], // Only GUILD_INSTALL
      contexts: [0], // Only GUILD
      options: [
        {
          name: "user_id",
          type: ApplicationCommandOptionType.String,
          description: "O ID do usuário a ser autorizado.",
          required: true,
        },
      ],
    },
  ];

  try {
    await client.application.commands.set(commands);
    console.log("Comandos de barra sincronizados com sucesso.");
  } catch (error) {
    console.error("Falha ao sincronizar comandos:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  // Authorization check
  if (!(await isAuthorized(interaction))) {
    // Special case for authorize_user: only allow if no users are authorized yet in guild context
    const effectiveConfig = await getEffectiveConfig(interaction);
    if (commandName === "authorize_user" && interaction.guildId && effectiveConfig.authorizedUsers.length === 0) {
      // Allow the first user to authorize themselves in a guild
    } else {
      return interaction.reply({
        content: "Você não tem permissão para usar este comando.",
        ephemeral: true,
      });
    }
  }

  switch (commandName) {
    case "proxy":
      await handleProxyCommand(interaction, options);
      break;
    case "set_destino":
      await handleSetDestinoCommand(interaction, options);
      break;
    case "authorize_user":
      await handleAuthorizeUserCommand(interaction, options);
      break;
    default:
      break;
  }
});

// --- Command Handlers --- //
async function handleProxyCommand(interaction, options) {
  await interaction.deferReply({ ephemeral: true });

  const mensagem = options.getString("mensagem");
  const gifLink = options.getString("gif_link");
  const anexo = options.getAttachment("anexo");

  const destination = await getDestination(client, interaction);
  if (!destination) {
    return interaction.editReply(
      "Destino não configurado. Use `/set_destino` para configurar."
    );
  }

  if (!mensagem && !gifLink && !anexo) {
    return interaction.editReply(
      "Por favor, forneça uma mensagem, um link de GIF ou um anexo."
    );
  }

  try {
    const contentToSend = [];
    const files = [];

    if (mensagem) {
      contentToSend.push(mensagem);
    }
    if (gifLink) {
      contentToSend.push(gifLink);
    }

    if (anexo) {
      try {
        const attachmentFile = new AttachmentBuilder(anexo.url, { name: anexo.name });
        files.push(attachmentFile);
      } catch (error) {
        console.error("Erro ao processar anexo:", error);
        return interaction.editReply("Não foi possível processar o anexo. Tente novamente ou use um link.");
      }
    }

    if (contentToSend.length === 0 && files.length === 0) {
      return interaction.editReply("Nenhum conteúdo válido para enviar.");
    }

    await destination.send({
      content: contentToSend.join("\n"),
      files: files,
    });
    await interaction.editReply("Conteúdo enviado com sucesso!");
  } catch (error) {
    console.error("Erro ao enviar conteúdo:", error);
    if (error.code === 50013) { // Missing Permissions
      await interaction.editReply(
        "Não tenho permissão para enviar mensagens para o destino configurado. Verifique as permissões do bot no canal/DM de destino."
      );
    } else {
      await interaction.editReply(
        `Ocorreu um erro ao enviar o conteúdo: ${error.message}`
      );
    }
  }
}

async function handleSetDestinoCommand(interaction, options) {
  const destinoTipo = options.getString("destino_tipo");
  const destinoId = options.getString("destino_id");

  const effectiveConfig = await getEffectiveConfig(interaction);

  const validTypes = ["channel", "user"];
  if (!validTypes.includes(destinoTipo)) {
    return interaction.reply({
      content: `Tipo de destino inválido. Use um de: ${validTypes.join(", ")}.`,
      ephemeral: true,
    });
  }

  if (isNaN(destinoId)) {
    return interaction.reply({
      content: "O ID do destino deve ser um número inteiro.",
      ephemeral: true,
    });
  }

  effectiveConfig.destinationId = destinoId;
  effectiveConfig.destinationType = destinoTipo;
  saveConfig(config);

  await interaction.reply({
    content: `Destino configurado para ${destinoTipo} com ID ${destinoId}.`,
    ephemeral: true,
  });
}

async function handleAuthorizeUserCommand(interaction, options) {
  // This command is only for guild installations
  if (!interaction.guildId) {
    return interaction.reply({
      content: "Este comando só pode ser usado em um servidor (guilda).",
      ephemeral: true,
    });
  }

  const userIdToAuthorize = options.getString("user_id");
  const guildConfig = config.guildConfigs[interaction.guildId];

  // If no authorized users exist for this guild, the first user to run this command becomes authorized.
  if (guildConfig.authorizedUsers.length === 0) {
    guildConfig.authorizedUsers.push(interaction.user.id);
    saveConfig(config);
    await interaction.reply({
      content: "Você foi definido como o primeiro usuário autorizado para este servidor.",
      ephemeral: true,
    });
  }

  if (!guildConfig.authorizedUsers.includes(interaction.user.id)) {
    return interaction.reply({
      content: "Você não tem permissão para autorizar outros usuários neste servidor.",
      ephemeral: true,
    });
  }

  if (isNaN(userIdToAuthorize)) {
    return interaction.reply({
      content: "O ID do usuário deve ser um número inteiro.",
      ephemeral: true,
    });
  }

  if (!guildConfig.authorizedUsers.includes(userIdToAuthorize)) {
    guildConfig.authorizedUsers.push(userIdToAuthorize);
    saveConfig(config);
    await interaction.reply({
      content: `Usuário com ID ${userIdToAuthorize} autorizado com sucesso para este servidor.`, 
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: `Usuário com ID ${userIdToAuthorize} já está autorizado para este servidor.`, 
      ephemeral: true,
    });
  }
}

// --- Run Bot --- //
const TOKEN = process.env.DISCORD_TOKEN;

if (TOKEN) {
  client.login(TOKEN);
} else {
  console.error(
    "Erro: Token do bot não encontrado. Defina a variável de ambiente DISCORD_TOKEN no arquivo .env."
  );
}
