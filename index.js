// Include
require('dotenv').config()
const Discord = require('discord.js')
const client = new Discord.Client()
client.login(process.env.TOKEN)

// ---------------
// -- Parameters--
// ---------------
const inscriptionEndDate = new Date('December 12, 2020 23:59:59')
const inscriptionEndDateStr = 'Samedi 12 décembre à 23h59'
const RED = '#C40808'

// ---------------
let inscriptionMessageID
let inscriptionMessageLink
let participants = {}
let associations = {}

const alreadyParticipating = (id) => {
    return participants[id] !== undefined
}

const createParticipantIfNeeded = (user) => {
    const id = user.id
    if (!alreadyParticipating(id)) {
        participants[id] = {
            lettre: '',
            user,
        }
        return true
    }
    return false
}

const shuffle = (_arr) => {
    let arr = [..._arr]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

const createAssociations = () => {
    const IDs = shuffle(Object.keys(participants))
    for (let k = 0; k < IDs.length; ++k) {
        associations[IDs[k]] = IDs[(k+1)%IDs.length]
    }
}

const sendLettre = (from, to) => {
    console.log(participants[from])
    participants[to].user.send(new Discord.MessageEmbed()
        .setColor(RED)
        .setDescription(participants[from].lettre)
    )
}

const userProfile = (id) => {
    const user = participants[id].user
    return new Discord.MessageEmbed()
        .setColor(RED)
        .setTitle(user.tag)
        .setImage(user.avatarURL())
}

const sendTargetInfo = (id) => {
    const user = participants[id].user
    user.send("🎅 Hohoho ! Cette année tu seras le Père Noël pour :")
    user.send(userProfile(associations[id]))
    user.send("Voici la lettre qu'iel t'a laissé :")
    sendLettre(associations[id], id)
}

client.on('ready', () => {
    client.channels.cache.get(process.env.CHANNEL_ID)
        .send("Inscrivez vous !")
        .then(msg => {
            inscriptionMessageID = msg.id 
            inscriptionMessageLink = msg.url
        })
})

client.on('message', (msg) => {
    // Read public channel
    if (msg.channel.id === process.env.CHANNEL_ID) {
        // Informations 
        if (msg.content.startsWith("!secret-santa")) {
            msg.channel.send("Les participants actuellement inscrits au Secret Santa E-Tacraft sont : ")
            Object.keys(participants).forEach(id =>
                msg.channel.send(new Discord.MessageEmbed()
                        .setColor(RED)
                        .setTitle(participants[id].user.username)
                )
            )
            msg.channel.send(
`Vous pouvez vous inscrire sur ce message : 
${inscriptionMessageLink}
Les inscriptions ferment le ${inscriptionEndDateStr}`
            )
        }
    }
    // Read DMs
    if (msg.channel.type === 'dm' && msg.author !== process.env.BOT_ID) {
        if (alreadyParticipating(msg.author.id)) {
            if (msg.content.startsWith("!lettre ")) {
                const lettre = msg.content.substr(8)
                participants[msg.author.id].lettre = lettre
                msg.author.send(`Merci, j'ai bien reçu ta lettre ! Tu peux la modifier jusqu'au lancement de l'évènement le ${inscriptionEndDateStr}`)
                sendLettre(msg.author.id, msg.author.id)
            }
            if (msg.content.startsWith("!info")) {
                msg.author.send("Ta lettre")
                sendLettre(msg.author.id, msg.author.id)
            }
            if (msg.content.startsWith("!go")) {
                createAssociations()
                Object.keys(participants).forEach(id => sendTargetInfo(id))
            }
        }
        else {
            msg.author.send("Avant toute chose, tu dois t'inscrire en réagissant \"🎅\" sur mon message dans le channel E-Tacraft de la E-Taverne : " + inscriptionMessageLink)
        }
    }
})

client.on('messageReactionAdd', async(e, user) => {
    if (e.message.id === inscriptionMessageID && e.emoji.identifier === '%F0%9F%8E%85') {
        createParticipantIfNeeded(user)
        user.send("🎅 🎅 🎅 🎅 🎅\nHohoho ! Tu es bien inscrit pour le secret santa E-Tacraft !\nTu peux m'envoyer ta lettre en faisant \`\`\`!lettre [tonMessage]\`\`\` ici même\n🎅 🎅 🎅 🎅 🎅")
    }
})

client.on('messageReactionRemove', async(e, user) => {
    if (e.message.id === inscriptionMessageID && e.emoji.identifier === '%F0%9F%8E%85') {
        user.send("Oh 🎅 ! Tu es bien désinscrit du secret santa E-Tacraft.")
        delete participants[user.id]
    }
})