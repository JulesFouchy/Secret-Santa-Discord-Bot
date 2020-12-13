// Include
if (process.env.DEBUG)
    require('dotenv').config()
const Discord = require('discord.js')
const client = new Discord.Client()
client.login(process.env.TOKEN)

// ---------------
// -- Parameters--
// ---------------
const inscriptionEndDate = new Date('December 13, 2020 23:59:59')
const inscriptionEndDateStr = 'Dimanche 13 décembre à 23h59'
const RED = '#C40808'

// ---------------
// --- Database---
// ---------------

const MongoClient = require('mongodb').MongoClient
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

const DBaddTarget = async (participant, target) => {
    await dbRequest(db => 
            db.collection('participants')
            .updateOne({
                userid: {$eq: participant.userid}
            },
            {
                $set: {targetid: target.userid}
            })
)
}

const DBapplyToParticipants = (cb) => {
    return dbRequest(db => 
        db.collection('participants').find({}).toArray( (err, result) => {
            if (err) {
                console.log('ERR')
                console.log(err)
            }
            else {
                result.forEach(participant => cb(participant))
            }
        })
    )
}

const DBapplyToParticipantsArray = (cb) => {
    return dbRequest(db => 
        db.collection('participants').find({}).toArray( (err, result) => {
            if (err) {
                console.log('ERR')
                console.log(err)
            }
            else {
                cb(result)
            }
        })
    )
}

const DBwithParticipant = (userid, cb) => {
    return dbRequest(db => 
            db.collection('participants').findOne({userid: {$eq: userid}}).then(participant => cb(participant))
    )
}

const DBifParticipating = (userid, cb) => {
    return dbRequest(db => 
            db.collection('participants').findOne({userid: {$eq: userid}}).then(participant => cb(participant !== null))
    )
}

const DBwithMessageInfos = (cb) => {
    return dbRequest(db => 
            db.collection('infos').findOne({}).then(cb)
    )
}

const DBputMessageInfos = async (id, link) => {
    await dbRequest(db => 
        db.collection('infos')
        .insertOne({
            inscriptionMessageID: id,
            inscriptionMessageLink: link,
        })
    )
}

const DBputLettre = async (userid, lettre) => {
    await dbRequest(db => 
        db.collection('participants')
        .updateOne({
            userid: {$eq: userid}
        },
        {
            $set: {lettre: lettre}
        })
    )
}

// ---------------

const areInscriptionsStillOpen = () => {
    return new Date() < inscriptionEndDate
}

const closeInscriptions = async () => {
    createAssociations().then(() => {
        DBapplyToParticipants(participant => {
            sendTargetInfo(participant)
        })
    })
}

const shuffle = (_arr) => {
    let arr = [..._arr]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

const createAssociations = async () => {
    await DBapplyToParticipantsArray(async participants => {
        const shuffled = shuffle(participants)
        for (let k = 0; k < participants.length; ++k) {
            await DBaddTarget(shuffled[k], shuffled[(k+1)%shuffled.length])
        }
    })
}

const userProfile = (user) => {
    return new Discord.MessageEmbed()
        .setColor(RED)
        .setTitle(user.tag)
        .setImage(user.avatarURL())
}

const sendLettre = (user, lettre) => {
    user.send(new Discord.MessageEmbed()
        .setColor(RED)
        .setDescription(lettre)
    )
}

const sendTargetInfo = (participant) => {
    DBwithParticipant(participant.targetid, target => {
        client.users.fetch(participant.userid).then(user => {
            client.users.fetch(target.userid).then(targetUser => {
                user.send("🎅 Hohoho ! 🎅\nCette année tu seras le Père Noël pour :")
                user.send(userProfile(targetUser))
                user.send("Voici la lettre qu'iel t'a laissé.e :")
                sendLettre(user, target.lettre)
            })
        })
    })
}

let inscriptionMessageID
let inscriptionMessageLink

const sendPresentationMessage = () => {
    client.channels.cache.get(process.env.CHANNEL_ID)
        .send(
`🎅 Hohoho ! 🎅
Je suis le Père Noël cubique de la E-Taverne ! Je suis ici pour vous proposer de vous échanger des cadeaux entre vous dans **Minecraft**.
:eyes: Pour participer il suffit de réagir avec 🎅 à ce message. Je t'enverrai alors un message de confirmation.
:clock: Les inscriptions se terminent le ${inscriptionEndDateStr}.
:teddy_bear: À ce moment là, vous recevrez tous le nom d'une personne qu'il vous incombera de remplir de joie en lui offrant une magnifique surprise !
En attendant, soyez sages et ne brûlez pas la maison de vos amis :wink: :fire:`)
        .then(msg => {
            inscriptionMessageID = msg.id 
            inscriptionMessageLink = msg.url
            DBputMessageInfos(inscriptionMessageID, inscriptionMessageLink)
        })
}

const checkDate = () => {
    if (areInscriptionsStillOpen()) {
        setTimeout(checkDate, 60 * 1000)
    }
    else {
        closeInscriptions()
    }
}

client.on('ready', () => {
    DBwithMessageInfos(infos => {
        if (infos === null) {
            sendPresentationMessage()
        }
        else {
            inscriptionMessageID = infos.inscriptionMessageID
            inscriptionMessageLink = infos.inscriptionMessageLink
            client.channels.cache.get(process.env.CHANNEL_ID).messages.fetch(inscriptionMessageID)
        }
    })
    checkDate()
})

client.on('message', (msg) => {
    // Read DMs
    if (msg.channel.type === 'dm' && msg.author !== process.env.BOT_ID) {
        DBifParticipating(msg.author.id, isParticipating => {
            if (isParticipating) {
                if (msg.content.startsWith("!lettre ")) {
                    if (areInscriptionsStillOpen()) {
                        const lettre = msg.content.substr(8)
                        DBputLettre(msg.author.id, lettre)
                        msg.author.send(`Merci, j'ai bien reçu ta lettre ! 🎅 Tu peux la modifier jusqu'au lancement de l'évènement qui aura lieu le ${inscriptionEndDateStr}.`)
                        sendLettre(msg.author, lettre)
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
        })
    }
})


client.on('messageReactionAdd', async(e, user) => {
    if (e.message.id === inscriptionMessageID && e.emoji.identifier === '%F0%9F%8E%85') {
        if (areInscriptionsStillOpen()) {
            DBaddParticipant(user)
            user.send("🎅 Hohoho ! 🎅\nTu es bien inscrit pour le Secret Santa E-Tacraft !\nTu peux m'envoyer ta lettre ici-même en faisant \`\`\`!lettre [tonMessage]\`\`\`Elle sera transmise à ton Père Noël attitré afin de l'aider dans sa quête :gift:\nPense bien à indiquer les coordonnées de ta base pour une livraison réussie ! :balloon:")
        }
        else {
            user.send("Oh 🎅 ! Malheureusement les inscriptions sont terminées et les Pères Noëls ont déjà été attribués.\nContacte Nahjkag (Jules Fouchy#9268) pour arranger ça :wink:")
        }
    }
})

client.on('messageReactionRemove', async(e, user) => {
    if (e.message.id === inscriptionMessageID && e.emoji.identifier === '%F0%9F%8E%85') {
        if (areInscriptionsStillOpen()) {
            DBremoveParticipant(user)
            user.send("Oh 🎅 ! Tu es bien désinscrit du Secret Santa E-Tacraft.")
        }
        else {
            DBwithParticipant(user.id, participant => {
                DBwithParticipant(participant.targetid, target => {
                    client.users.fetch(target.userid).then(targetUser => {
                        user.send(`Oh 🎅 ! L'évènement a été lancé, tu ne peux plus te désinscrire ! **${targetUser.username}** compte sur toi !`)
                    })
                })
            })
        }
    }
})