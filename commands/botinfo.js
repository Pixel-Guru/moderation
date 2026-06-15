const Discord = require("discord.js")

module.exports = {
    name: "botinfo", 
    author: "Nick",

    run: async(client, message, args) => {

        let user = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;

        let data = user.createdAt.toLocaleDateString("pt-br");
        let avatar = user.displayAvatarURL({ dynamic: true });

        let embed = new Discord.MessageEmbed()
        .setColor("#7B68EE")
        .setAuthor(`${message.guild.name}`, client.user.avatarURL())
        .setThumbnail(`${message.guild.iconURL({ dynamic: true })}`)
        .setTitle(`__Informações do bot abaixo:__`)
        .setDescription(`Olá ${message.author} tudo bem? Eu sou um simples bot com funções como moderação, informações e diversão.`)
        .setThumbnail(`${message.guild.iconURL({ dynamic: true })}`)
        .addFields(
            {
                name: '⛄️ Informações ',
                value: `> 🍖 Nome: ${client.user}
                > 💻 Desenvolvedor: <@!648595529307127811>
                > 🤠 Ver meus comandos: .help
                > 🎾 Ping: \`${client.ws.ping}ms\`
                > 💨 Prefixo: \`.\``,
                inline: false
            },
            {
                name: '📊 Estatísticas',
                value: `> 🤖 Servidores: \`${client.guilds.cache.size}\`
                > 🦾 Usuários: \`${client.users.cache.size}\`
                > 🧠 Comandos: \`70\``,
                inline: false
    
            },
            {
                name: '⚙️ Outras informações minhas',
                value: `> <:id:937814768360771694> Meu id: \`975862123022393414\`
                > 📅 Data de criação: \`16/05/2022\` 
                > 👒 Data de lançamento: \`28/05/2022\`
                > 💄 Fim do BETA: \`26/06/2022\`
                > 👽 Versão BOT Kylie: \`v8\`
                > 🤖 Bot iniciado \`312\` vezes`,
                inline: false
            },
            
        );

        message.reply({ embeds: [embed] })


       
        
    } //Nick'#0004
} 