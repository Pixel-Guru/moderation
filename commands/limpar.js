const { PermissionFlagsBits } = require("discord.js");

function parseAmount(args) {
  const amount = Number.parseInt(args[0], 10);
  if (!Number.isInteger(amount)) return null;
  if (amount < 1 || amount > 100) return null;
  return amount;
}

async function notify(message, content) {
  if (message.isSlashCommand) {
    await message.reply(content).catch(() => {});
    return;
  }

  await message.channel.send(content)
    .then((sent) => setTimeout(() => sent.delete().catch(() => {}), 8000))
    .catch(() => {});
}

module.exports = {
  name: "limpar",
  aliases: ["clear", "purge"],
  description: "Limpa de 1 a 100 mensagens do canal.",

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await notify(message, "Voce precisa da permissao `Gerenciar mensagens` para usar esse comando.");
      return;
    }

    const amount = parseAmount(args);
    if (!amount) {
      await notify(message, "Use `!limpar 10` ou `/limpar argumentos:10`. O limite e de 1 a 100 mensagens.");
      return;
    }

    await message.delete().catch(() => {});

    try {
      const deleted = await message.channel.bulkDelete(amount, true);
      await notify(message, `Limpei ${deleted.size} mensagem(ns) deste canal.`);
    } catch (error) {
      console.error("[limpar] erro ao limpar mensagens:", error?.message || error);
      await notify(message, "Nao consegui limpar esse canal. Confira minhas permissoes e a idade das mensagens.");
    }
  },
};
