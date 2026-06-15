const fs = require("node:fs");
const path = require("node:path");
const Discord = require("discord.js");
const {
  ActivityType,
  ChannelType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
  Partials,
  PermissionFlagsBits,
} = Discord;
const db = require("quick.db");
const config = require("./config.json");
const { patchDiscordV13Compatibility } = require("./utils/discord-v13-compat");
const {
  buildLegacyMessageFromInteraction,
  normalizeSlashName,
  splitArgs,
} = require("./utils/slash-adapter");

patchDiscordV13Compatibility(Discord);

const token = process.env.DISCORD_TOKEN || config.token;
const prefix = config.prefix || "!";
const enabledCommandFiles = new Set([
  "addrole",
  "anunciar",
  "autorole",
  "avatar",
  "ban",
  "botinfo",
  "canalinfo",
  "castigo",
  "contador",
  "desprivar",
  "emojiinfo",
  "help",
  "kick",
  "limpar",
  "listban",
  "lock",
  "lockall",
  "membro",
  "pegarid",
  "ping",
  "privar",
  "removewarn",
  "roleinfo",
  "serverinfo",
  "setentrada",
  "setnick",
  "tempocall",
  "unban",
  "unlock",
  "unlockall",
  "uptime",
  "userinfo",
  "verwarn",
  "warn",
]);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.Reaction,
    Partials.User,
  ],
});

client.commands = new Collection();
client.aliases = new Collection();
client.slashCommands = new Collection();

function getCommandDescription(command, name) {
  const description =
    command.description ||
    command.config?.description ||
    `Executa o comando ${name}.`;

  return String(description).replace(/\s+/g, " ").slice(0, 100);
}

function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  const files = fs.readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"))
    .filter((file) => enabledCommandFiles.has(path.basename(file, ".js").toLowerCase()));

  for (const file of files) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    const run = command.run || command.execute;

    if (typeof run !== "function") {
      console.warn(`[bot] Ignorando ${file}: sem função run/execute.`);
      continue;
    }

    command.run = run;
    command.fileName = path.basename(file, ".js").toLowerCase();
    command.slashName = normalizeSlashName(command.fileName);
    command.description = getCommandDescription(command, command.fileName);

    client.commands.set(command.fileName, command);
    client.slashCommands.set(command.slashName, command);

    const declaredName = command.name || command.config?.name;
    if (typeof declaredName === "string" && declaredName.trim() && !declaredName.includes(" ")) {
      client.aliases.set(declaredName.toLowerCase(), command.fileName);
    }

    const aliases = command.aliases || command.config?.aliases || [];
    for (const alias of aliases) {
      if (!alias || typeof alias !== "string") continue;
      client.aliases.set(alias.toLowerCase(), command.fileName);
    }
  }

  console.log(`[bot] ${client.commands.size} comandos ativos carregados.`);
}

function buildSlashCommandPayloads() {
  const usedNames = new Set();
  const payloads = [];

  for (const command of client.commands.values()) {
    if (!command.slashName || usedNames.has(command.slashName)) continue;
    usedNames.add(command.slashName);

    payloads.push({
      name: command.slashName,
      description: command.description,
      dm_permission: false,
      options: [
        {
          type: 3,
          name: "argumentos",
          description: "Texto opcional, igual aos argumentos usados no comando antigo.",
          required: false,
        },
      ],
    });
  }

  return payloads;
}

async function registerSlashCommands() {
  const payloads = buildSlashCommandPayloads();

  if (!payloads.length) return;

  const guildId = process.env.DISCORD_GUILD_ID || config.guildId;

  if (guildId) {
    const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId);
    await guild.commands.set(payloads);
    console.log(`[slash] ${payloads.length} comandos registrados no servidor ${guildId}.`);
    return;
  }

  await client.application.commands.set(payloads);
  console.log(`[slash] ${payloads.length} comandos globais registrados.`);
}

async function runPrefixCommand(message) {
  if (message.author.bot || !message.guild) return;
  if (!message.content.toLowerCase().startsWith(prefix.toLowerCase())) return;
  if (message.content.startsWith(`<@!${client.user.id}>`) || message.content.startsWith(`<@${client.user.id}>`)) return;

  const args = message.content.trim().slice(prefix.length).split(/ +/g);
  const commandName = args.shift()?.toLowerCase();
  const resolvedName = client.commands.has(commandName)
    ? commandName
    : client.aliases.get(commandName);
  const command = client.commands.get(resolvedName);

  if (!command) {
    await message.channel.send(`❌ | ${message.author} O comando \`${prefix}${commandName}\` não existe! Use ${prefix}help`)
      .then((msg) => setTimeout(() => msg.delete().catch(() => {}), 10000))
      .catch(() => {});
    return;
  }

  try {
    await command.run(client, message, args);
  } catch (error) {
    console.error(`[prefix] Erro no comando ${commandName}:`, error);
    await message.reply("Não consegui executar esse comando. Veja o console para detalhes.").catch(() => {});
  }
}

async function runSlashCommand(interaction) {
  const command = client.slashCommands.get(interaction.commandName);

  if (!command) {
    await interaction.reply({
      content: "Esse slash command não foi encontrado no carregador do bot.",
      ephemeral: true,
    }).catch(() => {});
    return;
  }

  const rawArgs = interaction.options.getString("argumentos") || "";
  const args = splitArgs(rawArgs);
  const legacyMessage = buildLegacyMessageFromInteraction(interaction, {
    argsText: rawArgs,
    commandName: command.fileName,
    prefix,
  });

  await interaction.deferReply({ ephemeral: true }).catch(() => {});

  try {
    await command.run(client, legacyMessage, args);

    if (!legacyMessage.hasResponded()) {
      await interaction.editReply("Comando executado.").catch(() => {});
    }
  } catch (error) {
    console.error(`[slash] Erro no comando /${interaction.commandName}:`, error);
    const payload = "Não consegui executar esse comando. Veja o console para detalhes.";

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload).catch(() => {});
    } else {
      await interaction.reply({ content: payload, ephemeral: true }).catch(() => {});
    }
  }
}

async function handlePurchaseComponents(interaction) {
  if (!interaction.isButton()) return false;

  if (interaction.customId === "1") {
    const channel = await interaction.guild.channels.create({
      name: "compra",
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.MentionEveryone,
          ],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
          ],
        },
      ],
    });

    const closeButton = new Discord.ButtonBuilder()
      .setCustomId("2")
      .setStyle(Discord.ButtonStyle.Danger)
      .setLabel("FECHAR TICKET")
      .setEmoji("❌");

    const ticketPanel = new Discord.ContainerBuilder()
      .setAccentColor(0x2f9eaa)
      .addTextDisplayComponents((text) => text.setContent([
        `## Ticket de compra`,
        `Olá ${interaction.user}, seu ticket de compra foi criado.`,
        `Aguarde para ser atendido.`,
      ].join("\n")))
      .addActionRowComponents((row) => row.setComponents(closeButton));

    await channel.send({
      components: [ticketPanel],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.reply({ content: `Canal criado: ${channel}`, ephemeral: true });
    return true;
  }

  if (interaction.customId === "2") {
    await interaction.reply({ content: "Fechando ticket...", ephemeral: true }).catch(() => {});
    await interaction.channel.delete().catch(() => {});
    return true;
  }

  return false;
}

loadCommands();

client.once(Events.ClientReady, async () => {
  

  console.log(`[bot] online como ${client.user.tag} | ${client.guilds.cache.size} servidores | prefixo ${prefix} | ${client.commands.size} comandos`);

  try {
    await registerSlashCommands();
  } catch (error) {
    console.error("[slash] Não consegui registrar os slash commands:", error);
  }
});

client.on(Events.MessageCreate, runPrefixCommand);

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await runSlashCommand(interaction);
      return;
    }

    await handlePurchaseComponents(interaction);
  } catch (error) {
    console.error("[interaction] Erro ao processar interação:", error);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Algo deu errado ao processar essa interação.", ephemeral: true }).catch(() => {});
    }
  }
});

client.on(Events.GuildMemberAdd, (member) => {
  const channelId = db.get(`contador_${member.guild.id}`);
  const channel = member.guild.channels.cache.get(channelId);
  if (!channel) return;

  channel.setName(`👥 Membros: ${member.guild.memberCount}`).catch(() => {});
});

client.on(Events.GuildMemberRemove, (member) => {
  const channelId = db.get(`contador_${member.guild.id}`);
  const channel = member.guild.channels.cache.get(channelId);
  if (!channel) return;

  channel.setName(`👥 Membros: ${member.guild.memberCount}`).catch(() => {});
});

client.on(Events.GuildMemberAdd, async (member) => {
  const welcomeChannelId = db.get(`boasvindachannel_${member.guild.id}`);
  if (!welcomeChannelId) return;

  const embed = new Discord.EmbedBuilder()
    .setDescription(`Olá ${member.user}, seja bem-vindo(a) ao servidor \`${member.guild.name}\`!`)
    .setColor(0x2ecc71)
    .setThumbnail(member.user.displayAvatarURL())
    .setAuthor({
      name: member.guild.name,
      iconURL: member.guild.iconURL() || undefined,
    });

  member.guild.channels.cache.get(welcomeChannelId)
    ?.send({ content: `${member.user}`, embeds: [embed] })
    .catch(() => {});
});

client.on(Events.GuildMemberAdd, async (member) => {
  const autoroleId = db.get(`luizao_autorole_${member.guild.id}`);
  if (!autoroleId) return;

  member.roles.add(autoroleId).catch(() => {});
});

client.on(Events.GuildCreate, async (guild) => {
  try {
    const fetchedLogs = await guild.fetchAuditLogs({
      limit: 1,
      type: Discord.AuditLogEvent.BotAdd,
    });
    const addAuthorLog = fetchedLogs.entries.first();
    const executor = addAuthorLog?.executor;

    if (executor) {
      await executor.send(`Olá ${executor.tag}, obrigado por me adicionar no servidor \`${guild.name} (${guild.id})\`.`);
    }
  } catch (error) {
    console.error("[guildCreate] Não consegui enviar DM para quem adicionou o bot:", error);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  const blockedMessages = [
    "seu macaco",
    "seu preto",
    "sua puta",
    "seu gorila",
  ];
  const lowerContent = message.content.toLowerCase();

  if (blockedMessages.includes(lowerContent)) {
    await message.reply("Esta mensagem foi bloqueada.").catch(() => {});
    setTimeout(() => message.delete().catch(() => {}), 300);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
  const lowerContent = message.content.toLowerCase();

  if (lowerContent.includes("bom dia")) {
    await message.reply("Bom dia, meu consagrado!").catch(() => {});
  }

  if (lowerContent.includes("boa noite")) {
    await message.reply("Boa noite!").catch(() => {});
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[antiCrash] unhandledRejection:", reason?.stack || reason);
});

process.on("uncaughtException", (err, origin) => {
  console.error("[antiCrash] uncaughtException:", err?.stack || err);
});

process.on("uncaughtExceptionMonitor", (err, origin) => {
  console.error("[antiCrash] uncaughtExceptionMonitor:", err?.message || err);
});

process.on("multipleResolves", (type, promise, reason) => {
  console.warn(`[antiCrash] multipleResolves: ${type}`);
});

if (!token) {
  console.error("Token não encontrado. Defina DISCORD_TOKEN ou preencha config.json.");
  process.exit(1);
}

client.login(token);
