const Discord = require("quick.db");
const db = require("quick.db");

module.exports = {
    name: "set autorole",
    author: "l",

    run: async(client, message, args) => {
        let luizao_user = message.author;
        let msg_luizao_error = "Lembre-se de mencionar um cargo";
        let msg_luizao_completo_error = `:x: ${luizao_user} ${msg_luizao_error}.`;
        if (!args[0]) return message.channel.send(msg_luizao_completo_error)

        let luizao_autorole_cargo = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);

        db.set(`luizao_autorole_${message.guild.id}`, luizao_autorole_cargo.id);

        let msg_luizao_confirmação = `✅ | ${luizao_user} O cargo [${luizao_autorole_cargo}] foi definido como autorole com sucesso!`;

        message.channel.send(msg_luizao_confirmação)

    }
}