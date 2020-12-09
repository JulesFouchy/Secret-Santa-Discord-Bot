// Include
if (process.env.DEBUG)
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
// --- Database---
// ---------------

const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectID
const mongoClient = new MongoClient(process.env.DB_CONNECTION, { useNewUrlParser: true, useUnifiedTopology: true }).connect()

const dbRequest = async (req) => {
    try {
        await mongoClient.then( async (mongoClient) => {
            const db = mongoClient.db('Secret-Santacraft')
            await req(db)
        })
    }
    catch(err) {
        console.log('-----Error while connecting to database-----')
        console.log(err)
        console.log('--------------------------------------------')
    }
}

const DBaddParticipant = async (user) => {
    await dbRequest(db => 
            db.collection('participants')
            .insertOne({
                lettre: '',
                user,
                userid: user.id,
            })
    )
}

const DBremoveParticipant = async (user) => {
    await dbRequest(db => 
            db.collection('participants')
            .remove({
                userid: {$eq: user.id}
            })
    )
}

// ---------------
let inscriptionMessageID
let inscriptionMessageLink
let participants = {}
let associations = {}

let areInscriptionsStillOpen = true
const inscriptionsStillOpen = () => {
    return areInscriptionsStillOpen
}

const closeInscriptions = () => {
    createAssociations()
    Object.keys(participants).forEach(id => sendTargetInfo(id))
    areInscriptionsStillOpen = false
}

const alreadyParticipating = (id) => {
    return participants[id] !== undefined
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
    user.send("🎅 Hohoho ! 🎅\nCette année tu seras le Père Noël pour :")
    user.send(userProfile(associations[id]))
    user.send("Voici la lettre qu'iel t'a laissé.e :")
    sendLettre(associations[id], id)
}

client.on('ready', () => {
    client.channels.cache.get(process.env.CHANNEL_ID)
        .send(
`🎅 Hohoho ! 🎅
Je suis le Père Noël cubique de la E-Taverne ! Je suis ici pour vous proposer de vous échanger des cadeaux entre vous dans **Minecraft**.
:eyes: Pour participer il suffit de réagir avec 🎅 à ce message.
:clock: Les inscriptions se terminent le ${inscriptionEndDateStr}.
:teddy_bear: À ce moment là, vous recevrez tous le nom d'une personne qu'il vous incombera de remplir de joie en lui offrant une magnifique surprise !
En attendant, soyez sages et ne brûlez pas la maison de vos amis :wink: :fire:`)
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
            msg.channel.send("🎅 Hohoho ! 🎅\nLes participants actuellement inscrits au Secret Santa E-Tacraft sont : ")
            Object.keys(participants).forEach(id =>
                msg.channel.send(new Discord.MessageEmbed()
                        .setColor(RED)
                        .setTitle(participants[id].user.username)
                )
            )
            msg.channel.send(
`Vous pouvez vous inscrire sur ce message : 
${inscriptionMessageLink}
🎅 Attention 🎅 Les inscriptions ferment le ${inscriptionEndDateStr}`
            )
        }
    }
    // Read DMs
    if (msg.channel.type === 'dm' && msg.author !== process.env.BOT_ID) {
        if (alreadyParticipating(msg.author.id)) {
            if (msg.content.startsWith("!lettre ")) {
                if (inscriptionsStillOpen()) {
                    const lettre = msg.content.substr(8)
                    participants[msg.author.id].lettre = lettre
                    msg.author.send(`Merci, j'ai bien reçu ta lettre ! 🎅 Tu peux la modifier jusqu'au lancement de l'évènement qui aura lieu le ${inscriptionEndDateStr}.`)
                    sendLettre(msg.author.id, msg.author.id)
                }
                else {
                    msg.author.send("Oh 🎅 ! Les inscriptions sont terminées et ta lettre a déjà été envoyée, tu ne peux plus la modifier !")
                }
            }
            else {
                msg.author.send("Oh 🎅 ! Je ne connais pas cette commande. À vrai dire je connais uniquement la commande !lettre")
            }
        }
        else {
            msg.author.send("Avant toute chose, tu dois t'inscrire en réagissant \"🎅\" sur mon message dans le channel E-Tacraft de la E-Taverne : " + inscriptionMessageLink + ".")
        }
    }
})

client.on('messageReactionAdd', async(e, user) => {
    if (e.message.id === inscriptionMessageID && e.emoji.identifier === '%F0%9F%8E%85') {
        if (inscriptionsStillOpen()) {
            DBaddParticipant(user)
            user.send("🎅 Hohoho ! 🎅\nTu es bien inscrit pour le Secret Santa E-Tacraft !\nTu peux m'envoyer ta lettre ici-même en faisant \`\`\`!lettre [tonMessage]\`\`\`Elle sera transmise à ton Père Noël attitré afin de l'aider dans sa quête :gift:\nPense bien à indiquer les coordonnées de ta base pour une livraison réussie ! :balloon:")
        }
        else {
            if (participants[user.id] === undefined)
                user.send("Oh 🎅 ! Malheureusement les inscriptions sont terminées et les Pères Noëls ont déjà été attribués.\nContacte Nahjkag (Jules Fouchy#9268) pour arranger ça :wink:")
        }
    }
})

client.on('messageReactionRemove', async(e, user) => {
    if (e.message.id === inscriptionMessageID && e.emoji.identifier === '%F0%9F%8E%85') {
        if (inscriptionsStillOpen()) {
            DBremoveParticipant(user)
            user.send("Oh 🎅 ! Tu es bien désinscrit du Secret Santa E-Tacraft.")
        }
        else {
            user.send(`Oh 🎅 ! L'évènement a été lancé, tu ne peux plus te désinscrire ! **${participants[associations[user.id]].user.username}** compte sur toi !`)
        }
    }
})

const checkDate = () => {
    if (new Date() < inscriptionEndDate) {
        setTimeout(checkDate, 60 * 1000)
    }
    else {
        closeInscriptions()
    }
}

checkDate()