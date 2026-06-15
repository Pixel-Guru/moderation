const { MessageEmbed } = require("discord.js")
const moment = require('moment') // npm i moment
moment.locale('pt-BR')

module.exports = {
    name: 'canalinfo',
    aliases: ["channel-info", "ci"],

    run: async (client, message, args) => {
        var channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel
        if(!channel) return message.reply("**❌ | Canal não identificado! Verifique se está utilizando um ID válido ou mencionando um canal existente.**")

        let embed = new MessageEmbed()
        .setColor('AQUA')
        .setTitle('Informações do canal:')
        .setFields(
            {
                name: 'Nome:',
                value: `\`${channel.name}\``,
                inline: true
            },
            {
                name: 'ID:',
                value: `\`${channel.id}\``,
                inline: true
            },
            {
                name: 'Menção',
                value: `\`<#${channel.id}>\``,
                inline: true
            },
            {
                name: 'Tipo do canal:',
                value: `\`${channelType()}\``,
                inline: true
            },
            {
                name: 'NSFW:',
                value: `\`${channel.nsfw ? "Sim" : "Não"}\``,
                inline: true
            },
            {
                name: 'Categoria:',
                value: `\`${channel.parent == null ? 'Nenhuma categoria selecionada' : channel.parent.name}\``,
                inline: true
            },
            {
                name: 'Criado em:',
                value: `\`${moment(channel.createdAt).format('LL')}, às ${moment(channel.createdAt).format('LT')}\``,
                inline: true
            }
        )
        message.reply({embeds: [embed]})

        function channelType() {
            let types = {
                GUILD_TEXT: 'Canal de texto',
                GUILD_VOICE: 'Canal de voz',
                GUILD_CATEGORY: 'Categoria',
                GUILD_NEWS: 'Canal de novidades',
                GUILD_NEWS_THREAD: `Canal de novidades (Thread)`,
                GUILD_PUBLIC_THREAD: `Thread pública`,
                GUILD_PRIVATE_THREAD: `Thread privada`,
                GUILD_STAGE_VOICE: `Palco`,
                UNKNOWN: `Desconhecido`
            }

        let c = types[channel.type]
        return c
        }
    }
}

/*
Feito com carinho pelo TheAnonimooo
*/