const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans
    ]
});

// Stockage simple pour l'anti-raid (anti-spam de connexions)
const joinTimestamps = new Map();

client.once('ready', async () => {
    console.log(`Lokia est en ligne et connecté en tant que ${client.user.tag} !`);

    // Enregistrement des commandes Slash globales ou pour ton serveur
    const commands = [
        new SlashCommandBuilder()
            .setName('say')
            .setDescription('Fait parler le bot de manière invisible.')
            .addStringOption(option => option.setName('message').setDescription('Le message').setRequired(true)),
        
        new SlashCommandBuilder()
            .setName('ban')
            .setDescription('Bannit un membre du serveur.')
            .addUserOption(option => option.setName('membre').setDescription('Le membre à bannir').setRequired(true))
            .addStringOption(option => option.setName('raison').setDescription('La raison du ban'))
    ];

    await client.application.commands.set(commands);
    console.log('Commandes de Lokia enregistrées !');
});

// ==========================================
// 1. ANTI-RAID & ANTI-NUKE RENFORCÉ
// ==========================================
client.on('guildMemberAdd', async member => {
    const guildId = member.guild.id;
    const now = Date.now();
    
    if (!joinTimestamps.has(guildId)) {
        joinTimestamps.set(guildId, []);
    }
    
    let timestamps = joinTimestamps.get(guildId);
    timestamps.push(now);
    
    // Nettoyer les vieux timestamps (fenêtre de 10 secondes)
    timestamps = timestamps.filter(time => now - time < 10000);
    joinTimestamps.set(guildId, timestamps);

    // Si plus de 5 personnes rejoignent en moins de 10 secondes -> Alerte / Sécurité Anti-Raid
    if (timestamps.length > 5) {
        console.warn(`[ANTI-RAID] Pic de connexions suspect détecté sur ${member.guild.name} !`);
        // Optionnel : Bloquer temporairement les invitations ou alerter les admins en MP
    }

    // ==========================================
    // 2. SYSTÈME DE BIENVENUE AVEC BANNIÈRE
    // ==========================================
    // Remplace par l'ID de ton salon de bienvenue
    const welcomeChannelId = 'ID_SALON_BIENVENUE';
    const channel = member.guild.channels.cache.get(welcomeChannelId);
    
    if (channel) {
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('Bienvenue sur le serveur ! 🎉')
            .setDescription(`Salut ${member}, bienvenue sur **${member.guild.name}** !\nPense à lire le règlement et à passer un bon moment avec nous.`)
            // Ici tu peux intégrer ton lien de bannière personnalisée
            .setImage('URL_DE_TA_BANNIERE_PERSONNALISEE') 
            .setTimestamp()
            .setFooter({ text: 'Lokia Protection System' });

        channel.send({ embeds: [welcomeEmbed] });
    }

    // Envoyer un message privé (MP) au nouveau membre
    try {
        await member.send(`Salut ! Bienvenue sur **${member.guild.name}**. Si tu as besoin d'aide, n'hésite pas à contacter le staff.`);
    } catch (err) {
        console.log(`Impossible d'envoyer un MP à ${member.user.tag}`);
    }
});

// Système d'au revoir (Member Remove)
client.on('guildMemberRemove', member => {
    const channelId = 'ID_SALON_BIENVENUE';
    const channel = member.guild.channels.cache.get(channelId);
    if (channel) {
        channel.send(`😢 **${member.user.tag}** a quitté le navire. À bientôt !`);
    }
});

// ==========================================
// 3. GESTION DES COMMANDES (Say, Ban, etc.)
// ==========================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'say') {
        const texte = interaction.options.getString('message');
        await interaction.reply({ content: 'Message envoyé 👌', ephemeral: true });
        await interaction.channel.send(texte);
    } 
    
    else if (commandName === 'ban') {
        // Vérifier si l'utilisateur a les permissions de bannir
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: '❌ Tu n\'as pas la permission d\'utiliser cette commande.', ephemeral: true });
        }

        const target = interaction.options.getUser('membre');
        const raison = interaction.options.getString('raison') || 'Aucune raison spécifiée';
        const memberTarget = interaction.guild.members.cache.get(target.id);

        if (memberTarget) {
            try {
                await memberTarget.ban({ reason: raison });
                await interaction.reply({ content: `✅ **${target.tag}** a été banni avec succès.\nRaison : ${raison}`, ephemeral: true });
            } catch (err) {
                await interaction.reply({ content: '❌ Je n\'ai pas réussi à bannir ce membre (problème de hiérarchie des rôles).', ephemeral: true });
            }
        }
    }
});

client.login('TON_TOKEN_BOT');
