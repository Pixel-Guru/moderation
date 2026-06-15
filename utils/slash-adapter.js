const { Collection } = require("discord.js");

function normalizeSlashName(name) {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
}

function splitArgs(input) {
  if (!input || !input.trim()) return [];
  return input.trim().split(/ +/g);
}

function idsFromMentions(text, pattern) {
  const ids = [];
  const regex = new RegExp(pattern, "g");
  let match;

  while ((match = regex.exec(text)) !== null) {
    ids.push(match[1]);
  }

  return ids;
}

function firstFromCollection(collection) {
  collection.first = function first() {
    return this.values().next().value;
  };
  collection.last = function last() {
    return Array.from(this.values()).at(-1);
  };
  return collection;
}

function buildMentions(interaction, argsText) {
  const users = firstFromCollection(new Collection());
  const members = firstFromCollection(new Collection());
  const roles = firstFromCollection(new Collection());
  const channels = firstFromCollection(new Collection());

  for (const id of idsFromMentions(argsText, "<@!?(\\d+)>")) {
    const user = interaction.client.users.cache.get(id);
    const member = interaction.guild?.members.cache.get(id);
    if (user) users.set(id, user);
    if (member) members.set(id, member);
  }

  for (const id of idsFromMentions(argsText, "<@&(\\d+)>")) {
    const role = interaction.guild?.roles.cache.get(id);
    if (role) roles.set(id, role);
  }

  for (const id of idsFromMentions(argsText, "<#(\\d+)>")) {
    const channel = interaction.guild?.channels.cache.get(id);
    if (channel) channels.set(id, channel);
  }

  return {
    channels,
    members,
    roles,
    users,
  };
}

function cleanReplyPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;

  const cleaned = { ...payload };
  delete cleaned.ephemeral;
  return cleaned;
}

function buildLegacyMessageFromInteraction(interaction, options) {
  let responded = false;
  const content = `${options.prefix}${options.commandName}${options.argsText ? ` ${options.argsText}` : ""}`;
  const mentions = buildMentions(interaction, options.argsText);

  async function respond(payload) {
    responded = true;
    const cleaned = cleanReplyPayload(payload);

    if (interaction.deferred || interaction.replied) {
      if (!interaction.__legacyFirstReplyDone) {
        interaction.__legacyFirstReplyDone = true;
        return interaction.editReply(cleaned);
      }
      return interaction.followUp(cleaned);
    }

    interaction.__legacyFirstReplyDone = true;
    return interaction.reply(cleaned);
  }

  return {
    id: interaction.id,
    author: interaction.user,
    channel: interaction.channel,
    client: interaction.client,
    content,
    createdAt: new Date(),
    guild: interaction.guild,
    isSlashCommand: true,
    member: interaction.member,
    mentions,
    user: interaction.user,

    hasResponded() {
      return responded;
    },

    delete() {
      return Promise.resolve();
    },

    react() {
      return Promise.resolve();
    },

    reply(payload) {
      return respond(payload);
    },
  };
}

module.exports = {
  buildLegacyMessageFromInteraction,
  normalizeSlashName,
  splitArgs,
};
