// Include
require('dotenv').config()
const Discord = require('discord.js')
const client = new Discord.Client()
client.login(process.env.TOKEN)

// ---------------
// -- Parameters--
// ---------------
const event_start_date = '15 décembre'

// ---------------
let participants = {}

const alreadyParticipating = (id) => {
    return participants[id] !== undefined
}

const createParticipantIfNeeded = (id) => {
    if (!alreadyParticipating(id)) {
        participants[id] = {
            lettre: ''
        }
        return true
    }
    return false
}

client.on('message', (msg) => {
    // Read public channel
    if (msg.channel.id === process.env.CHANNEL_ID) {
        // Join the Secret Santa 
        if (msg.content.startsWith("!join")) {
            if (createParticipantIfNeeded(msg.author.id)) {
                msg.author.send("Hello")
            }
            else {
                msg.reply("Merci, mais tu es déjà inscrit comme participant :wink:")
            }
        }
    }
    // Read DMs
    if (msg.channel.type === 'dm' && msg.author !== process.env.BOT_ID) {
        if (alreadyParticipating(msg.author.id)) {
            if (msg.content.startsWith("!lettre ")) {
                const lettre = msg.content.substr(8)
                participants[msg.author.id].lettre = lettre
                msg.author.send(`Merci, j'ai bien reçu ta lettre ! Tu peux la modifier jusqu'au lancement de l'évènement le ${event_start_date}`)
            }
            if (msg.content.startsWith("!info")) {
                msg.author.send(
                    `Ta lettre : 
                ${participants[msg.author.id].lettre}`
                )
            }
        }
        else {
            msg.author.send("Avant toute chose, tu dois t'inscrire à l'évènement en envoyant \"!join\" dans le channel E-Taverne dédié :wink:")
        }
    }
})