const { MessageEmbed } = require("discord.js")

module.exports = { 
    name: "avatar", 
    aliases: ["av"],

run: async(client, message, args) => {
let user = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;

let avatar = user.displayAvatarURL({ size: 4096, dynamic: true });

let msg = new MessageEmbed() 

.setTitle(`📸 Avatar de *${user.user.tag}*`)
.setDescription(`[Clique aqui](${avatar}) para baixar!`)
.setColor(`RANDOM`)
.setImage(avatar)
.setFooter({ text: `Comando Utilizado por: ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true })})



 await message.channel.send({ embeds: [msg] });
}
}