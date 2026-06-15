const legacyPermissionNames = {
  ADD_REACTIONS: "AddReactions",
  ADMINISTRATOR: "Administrator",
  ATTACH_FILES: "AttachFiles",
  BAN_MEMBERS: "BanMembers",
  CONNECT: "Connect",
  KICK_MEMBERS: "KickMembers",
  MANAGE_CHANNELS: "ManageChannels",
  MANAGE_EMOJIS_AND_STICKERS: "ManageGuildExpressions",
  MANAGE_GUILD: "ManageGuild",
  MANAGE_MESSAGES: "ManageMessages",
  MANAGE_NICKNAMES: "ManageNicknames",
  MANAGE_ROLES: "ManageRoles",
  MENTION_EVERYONE: "MentionEveryone",
  MODERATE_MEMBERS: "ModerateMembers",
  SEND_MESSAGES: "SendMessages",
  VIEW_CHANNEL: "ViewChannel",
};

const legacyChannelTypes = {
  GUILD_CATEGORY: "GuildCategory",
  GUILD_NEWS: "GuildAnnouncement",
  GUILD_STAGE_VOICE: "GuildStageVoice",
  GUILD_TEXT: "GuildText",
  GUILD_VOICE: "GuildVoice",
};

const legacyButtonStyles = {
  DANGER: "Danger",
  LINK: "Link",
  PRIMARY: "Primary",
  SECONDARY: "Secondary",
  SUCCESS: "Success",
};

const legacyComponentTypes = {
  ACTION_ROW: "ActionRow",
  BUTTON: "Button",
  CHANNEL_SELECT: "ChannelSelect",
  MENTIONABLE_SELECT: "MentionableSelect",
  ROLE_SELECT: "RoleSelect",
  SELECT_MENU: "StringSelect",
  STRING_SELECT: "StringSelect",
  USER_SELECT: "UserSelect",
};

function mapPermissionValue(Discord, value) {
  if (Array.isArray(value)) return value.map((entry) => mapPermissionValue(Discord, entry));
  if (typeof value !== "string") return value;

  const mappedName = legacyPermissionNames[value] || value;
  return Discord.PermissionFlagsBits?.[mappedName] || value;
}

function mapPermissionObject(Discord, permissions) {
  if (!permissions || typeof permissions !== "object" || Array.isArray(permissions)) {
    return mapPermissionValue(Discord, permissions);
  }

  const mapped = {};
  for (const [key, value] of Object.entries(permissions)) {
    const mappedName = legacyPermissionNames[key] || key;
    mapped[mappedName] = value;
  }
  return mapped;
}

function mapPermissionOverwrites(Discord, overwrites) {
  if (!Array.isArray(overwrites)) return overwrites;

  return overwrites.map((overwrite) => ({
    ...overwrite,
    allow: mapPermissionValue(Discord, overwrite.allow),
    deny: mapPermissionValue(Discord, overwrite.deny),
  }));
}

function mapChannelType(Discord, type) {
  if (typeof type !== "string") return type;

  const mappedName = legacyChannelTypes[type] || type;
  return Discord.ChannelType?.[mappedName] ?? type;
}

function mapComponentType(Discord, type) {
  if (typeof type !== "string") return type;

  const mappedName = legacyComponentTypes[type] || type;
  return Discord.ComponentType?.[mappedName] ?? type;
}

function mapButtonStyle(Discord, style) {
  if (typeof style !== "string") return style;

  const mappedName = legacyButtonStyles[style] || style;
  return Discord.ButtonStyle?.[mappedName] ?? style;
}

function mapColor(Discord, color) {
  if (typeof color !== "string") return color;

  if (color.toUpperCase() === "RANDOM") {
    return Math.floor(Math.random() * 0xffffff);
  }

  if (/^[0-9a-f]{6}$/i.test(color)) {
    return Number.parseInt(color, 16);
  }

  const normalizedName = color
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");

  return Discord.Colors?.[normalizedName] ?? color;
}

function normalizeComponentPayload(Discord, component) {
  if (!component || typeof component !== "object" || typeof component.toJSON === "function") {
    return component;
  }

  const normalized = { ...component };

  if (normalized.type) normalized.type = mapComponentType(Discord, normalized.type);
  if (normalized.style) normalized.style = mapButtonStyle(Discord, normalized.style);
  if (Array.isArray(normalized.components)) {
    normalized.components = normalized.components.map((child) => normalizeComponentPayload(Discord, child));
  }

  return normalized;
}

function normalizeMessagePayload(Discord, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;

  const normalized = { ...payload };

  if (Object.hasOwn(normalized, "ephemeral")) {
    delete normalized.ephemeral;
  }

  if (Array.isArray(normalized.components)) {
    normalized.components = normalized.components.map((component) => normalizeComponentPayload(Discord, component));
  }

  return normalized;
}

function patchMethod(prototype, method, wrapper) {
  if (!prototype || typeof prototype[method] !== "function") return;
  if (prototype[method].__compatPatched) return;

  const original = prototype[method];
  prototype[method] = wrapper(original);
  prototype[method].__compatPatched = true;
}

function patchEmbedBuilder(Discord) {
  const prototype = Discord.EmbedBuilder?.prototype;
  if (!prototype) return;

  Discord.MessageEmbed = Discord.EmbedBuilder;

  patchMethod(prototype, "setAuthor", (original) => function setAuthorCompat(author, iconURL, url) {
    if (author === false || author === null) return this;
    if (typeof author === "string") {
      return original.call(this, {
        name: author,
        iconURL: iconURL || undefined,
        url: url || undefined,
      });
    }
    return original.call(this, author);
  });

  patchMethod(prototype, "setFooter", (original) => function setFooterCompat(footer, iconURL) {
    if (footer === false || footer === null) return this;
    if (typeof footer === "string") {
      return original.call(this, {
        text: footer || "\u200b",
        iconURL: iconURL || undefined,
      });
    }
    return original.call(this, footer);
  });

  patchMethod(prototype, "setColor", (original) => function setColorCompat(color) {
    return original.call(this, mapColor(Discord, color));
  });

  if (typeof prototype.addField !== "function") {
    prototype.addField = function addFieldCompat(name, value, inline = false) {
      return this.addFields({
        name: String(name),
        value: String(value),
        inline: Boolean(inline),
      });
    };
  }
}

function patchBuilders(Discord) {
  Discord.MessageActionRow = Discord.ActionRowBuilder;
  Discord.MessageButton = Discord.ButtonBuilder;
  Discord.MessageSelectMenu = Discord.StringSelectMenuBuilder;
  Discord.MessageAttachment = Discord.AttachmentBuilder;

  patchMethod(Discord.ButtonBuilder?.prototype, "setStyle", (original) => function setStyleCompat(style) {
    return original.call(this, mapButtonStyle(Discord, style));
  });
}

function patchPermissions(Discord) {
  const PermissionBitField = Discord.PermissionsBitField;
  if (!PermissionBitField || PermissionBitField.__compatPatched) return;

  const originalResolve = PermissionBitField.resolve.bind(PermissionBitField);
  PermissionBitField.resolve = function resolveCompat(permission) {
    return originalResolve(mapPermissionValue(Discord, permission));
  };
  PermissionBitField.__compatPatched = true;
}

function patchGuildChannelCreate(Discord) {
  patchMethod(Discord.GuildChannelManager?.prototype, "create", (original) => function createCompat(nameOrOptions, maybeOptions) {
    if (typeof nameOrOptions === "string") {
      const options = { ...(maybeOptions || {}) };
      return original.call(this, {
        ...options,
        name: nameOrOptions,
        type: mapChannelType(Discord, options.type),
        permissionOverwrites: mapPermissionOverwrites(Discord, options.permissionOverwrites),
      });
    }

    const options = { ...(nameOrOptions || {}) };
    return original.call(this, {
      ...options,
      type: mapChannelType(Discord, options.type),
      permissionOverwrites: mapPermissionOverwrites(Discord, options.permissionOverwrites),
    });
  });
}

function patchPermissionOverwrites(Discord) {
  patchMethod(Discord.PermissionOverwriteManager?.prototype, "edit", (original) => function editCompat(userOrRole, permissions, options) {
    return original.call(this, userOrRole, mapPermissionObject(Discord, permissions), options);
  });
}

function patchCollectors(Discord) {
  const patchCollectorHost = (prototype) => {
    patchMethod(prototype, "createMessageComponentCollector", (original) => function collectorCompat(options = {}) {
      return original.call(this, {
        ...options,
        componentType: mapComponentType(Discord, options.componentType),
      });
    });

    patchMethod(prototype, "awaitMessageComponent", (original) => function awaitComponentCompat(options = {}) {
      return original.call(this, {
        ...options,
        componentType: mapComponentType(Discord, options.componentType),
      });
    });
  };

  [
    Discord.Message?.prototype,
    Discord.TextChannel?.prototype,
    Discord.NewsChannel?.prototype,
    Discord.ThreadChannel?.prototype,
    Discord.DMChannel?.prototype,
    Discord.VoiceChannel?.prototype,
  ].forEach(patchCollectorHost);
}

function patchMessagePayloads(Discord) {
  const patchPayloadHost = (prototype, methods) => {
    for (const method of methods) {
      patchMethod(prototype, method, (original) => function payloadCompat(payload, ...rest) {
        return original.call(this, normalizeMessagePayload(Discord, payload), ...rest);
      });
    }
  };

  [
    Discord.TextChannel?.prototype,
    Discord.NewsChannel?.prototype,
    Discord.ThreadChannel?.prototype,
    Discord.DMChannel?.prototype,
    Discord.VoiceChannel?.prototype,
  ].forEach((prototype) => patchPayloadHost(prototype, ["send"]));

  patchPayloadHost(Discord.Message?.prototype, ["reply", "edit"]);
}

function patchInteractions(Discord) {
  const prototype = Discord.BaseInteraction?.prototype;
  if (!prototype || typeof prototype.isSelectMenu === "function") return;

  prototype.isSelectMenu = function isSelectMenuCompat() {
    return [
      "isStringSelectMenu",
      "isUserSelectMenu",
      "isRoleSelectMenu",
      "isMentionableSelectMenu",
      "isChannelSelectMenu",
    ].some((method) => typeof this[method] === "function" && this[method]());
  };
}

function patchGuildMe(Discord) {
  const prototype = Discord.Guild?.prototype;
  if (!prototype || Object.getOwnPropertyDescriptor(prototype, "me")) return;

  Object.defineProperty(prototype, "me", {
    get() {
      return this.members.me;
    },
  });
}

function patchDiscordV13Compatibility(Discord) {
  patchEmbedBuilder(Discord);
  patchBuilders(Discord);
  patchPermissions(Discord);
  patchGuildChannelCreate(Discord);
  patchPermissionOverwrites(Discord);
  patchCollectors(Discord);
  patchMessagePayloads(Discord);
  patchInteractions(Discord);
  patchGuildMe(Discord);
}

module.exports = {
  mapPermissionObject,
  mapPermissionOverwrites,
  normalizeMessagePayload,
  patchDiscordV13Compatibility,
};
