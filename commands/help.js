const {
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
} = require("discord.js");

const categories = {
  home: {
    title: "Comandos ativos",
    color: 0x5865f2,
    body: [
      "Este bot esta em modo utilitario/moderacao.",
      "",
      "Use os botoes abaixo para ver os comandos disponiveis.",
    ].join("\n"),
  },
  moderacao: {
    title: "Moderacao",
    color: 0xed4245,
    body: [
      "`limpar`, `ban`, `unban`, `kick`, `castigo`",
      "`warn`, `verwarn`, `removewarn`, `addrole`, `autorole`",
      "`lock`, `unlock`, `lockall`, `unlockall`, `privar`, `desprivar`",
      "`anunciar`, `contador`, `setentrada`, `setnick`, `listban`",
    ].join("\n"),
  },
  utilitarios: {
    title: "Utilitarios",
    color: 0xfee75c,
    body: [
      "`ping`, `uptime`, `botinfo`, `serverinfo`, `userinfo`",
      "`canalinfo`, `roleinfo`, `avatar`, `emojiinfo`, `membro`",
      "`pegarid`, `tempocall`",
    ].join("\n"),
  },
};

function makeButton(id, label, style, activeKey) {
  return new ButtonBuilder()
    .setCustomId(`help:${id}`)
    .setLabel(label)
    .setStyle(style)
    .setDisabled(id === activeKey);
}

function buildPanel(activeKey = "home") {
  const category = categories[activeKey] || categories.home;
  const container = new ContainerBuilder()
    .setAccentColor(category.color)
    .addTextDisplayComponents((text) => text.setContent(`## ${category.title}\n${category.body}`))
    .addSeparatorComponents((separator) => separator
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small))
    .addActionRowComponents((row) => row.setComponents(
      makeButton("home", "Inicio", ButtonStyle.Secondary, activeKey),
      makeButton("moderacao", "Moderacao", ButtonStyle.Secondary, activeKey),
      makeButton("utilitarios", "Utilitarios", ButtonStyle.Secondary, activeKey),
      makeButton("fechar", "Fechar", ButtonStyle.Danger, activeKey),
    ));

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

module.exports = {
  name: "help",
  aliases: ["ajuda"],
  description: "Mostra os comandos ativos.",

  run: async (client, message) => {
    const panelMessage = await message.reply(buildPanel("home"));
    const collector = panelMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({
          content: "Esse painel pertence a outra pessoa.",
          ephemeral: true,
        });
        return;
      }

      const action = interaction.customId.replace("help:", "");

      if (action === "fechar") {
        await interaction.deferUpdate().catch(() => {});
        await panelMessage.delete().catch(() => {});
        return;
      }

      await interaction.update(buildPanel(action));
    });
  },
};
