// Include
require('dotenv').config()
const Discord = require('discord.js')
const client = new Discord.Client()
client.login(process.env.TOKEN)

// ---------------
// -- Parameters--
// ---------------
const event_start_date = '15 décembre'
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

const sendTargetInfo = (id) => {
    const user = participants[id].user
    const target = participants[associations[id]].user
    user.send("🎅 Hohoho ! Cette année tu seras le Père Noël pour :")
    user.send(new Discord.MessageEmbed()
        .setColor(RED)
        .setTitle(target.tag)
        .setImage(target.avatarURL())
    )
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
    // Read DMs
    if (msg.channel.type === 'dm' && msg.author !== process.env.BOT_ID) {
        if (alreadyParticipating(msg.author.id)) {
            if (msg.content.startsWith("!lettre ")) {
                const lettre = msg.content.substr(8)
                participants[msg.author.id].lettre = lettre
                msg.author.send(`Merci, j'ai bien reçu ta lettre ! Tu peux la modifier jusqu'au lancement de l'évènement le ${event_start_date}`)
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
        console.log(participants)
    }
})

client.on('messageReactionRemove', async(e, user) => {
    if (e.message.id === inscriptionMessageID && e.emoji.identifier === '%F0%9F%8E%85') {
        user.send("Oh 🎅 ! Tu es bien désinscrit du secret santa E-Tacraft.")
        delete participants[user.id]
        console.log(participants)
    }
})