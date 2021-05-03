const Discord = require('discord.js')
const client = new Discord.Client()
const token = process.env.TOKEN

client.once('ready', ()=>{
    console.log('Blackjack OfKa is now ready!')
})
client.login(token)