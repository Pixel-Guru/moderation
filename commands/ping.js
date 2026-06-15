const {
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  MessageFlags,
} = require("discord.js");

function buildPingPanel(client) {
  const button = new ButtonBuilder()
    .setCustomId("ping:refresh")
    .setLabel("Atualizar")
    .setStyle(ButtonStyle.Primary);

  const container = new ContainerBuilder()
    .setAccentColor(0x3498db)
    .addTextDisplayComponents((text) => text.setContent([
      "## Pong!",
      `WebSocket: **${client.ws.ping} ms**`,
    ].join("\n")))
    .addActionRowComponents((row) => row.setComponents(button));

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

module.exports = {
  name: "ping",
  aliases: ["pong"],
  description: "Mostra a latencia do bot em Components V2.",

  run: async (client, message) => {
    const panelMessage = await message.reply(buildPingPanel(client));
    const collector = panelMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId !== "ping:refresh") return;
      await interaction.update(buildPingPanel(client));
    });
  },
};
