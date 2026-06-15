const Discord = require("discord.js");

module.exports = {
    name: "pegarid",
    aliases: ['id'],

run: async(client, message, args) => {

let user = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;

if(user.id === message.author.id) {
 return message.reply(`Aqui está o seu id: \`${message.author.id}\``)
 
} else {

message.channel.send(`Aqui está o id de ${user}: \`${user.id}\``);
}

}
}