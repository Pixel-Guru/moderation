const {MessageEmbed} = require('discord.js')
module.exports = {
    name: 'membro',
    run : async(client, message, args) => {
            let embed = new MessageEmbed()
      .setTitle(`Total de Membros`)
      .addField(`👥Total de membros`, `${message.guild.memberCount}`, true)
      .addField(`👤Humanos`, `${message.guild.members.cache.filter(member => !member.user.bot).size}`, true)
      .addField(`🤖Bots`, `${message.guild.members.cache.filter(member => member.user.bot).size}`, true)
      .setThumbnail(message.guild.iconURL({ size: 4096, dynamic: true }))
      .setAuthor(message.guild.name, message.guild.iconURL({ size: 4096, dynamic: true }))
      .setTimestamp()
      .setFooter({text: `Comando executado por ${message.author.username}`, iconURL: message.author.displayAvatarURL({ dynamic: true })})
      message.reply({ embeds: [embed] })

    }
}