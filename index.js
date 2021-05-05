//@ts-check

const Discord = require('discord.js')
const dbservice = require('./database-service')
const { readUserData, createNewUser } = require('./database-service')
const Blackjack = require('./game-logic')

const prefix = '!'
const client = new Discord.Client()
const token = process.env.TOKEN

/**
 * @typedef User 
 * @property {String} uid
 * @property {String} gid
 * @property {Number} wins
 * @property {Number} loses
 * @property {Boolean} dailyClaims
 * @property {Number} chips
 * @property {String} username
 * 
 * @typedef Player
 * @property {User} user
 * @property {Blackjack} game
 * 
 * @typedef GuildData
 * @property {String} gid
 * @property {String} channelID
 * @property {String} name
*/

/**@type {Array.<Player>} */
var playing_players = []

const dailyChipsGiven = 300

const emoji = {
    hit: '839144640523141130',
    stand: '839142811730968666',
    dd: '839143634128863312'
}

setInterval(() => {
    var date = new Date()

    if(date.getHours()=== 0 && date.getMinutes() === 0){
        dbservice.dailyResetClaims()
        client.guilds.cache.forEach(guild=>{

        })

        // clie.channel.send(new Discord.MessageEmbed()
        //     .setTitle('Claim your free chips!')
        //     .setDescription(
        //         '```' +
        //         'Get your free 300 chips everyday after 12:00am by typing command #claim\n\n' +
        //         'Happy Gambling :D' +
        //         '```'
        //     ))
    }

}, 60000);

client.on('guildCreate', async (guild)=>{
    var channel = await guild.channels.create('play-blackjack', 
        {
            type:'text',
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
                }
            ]
        }
    )

    /**@type {GuildData} */
    const guildData = {
        gid: guild.id,
        name: guild.name,
        channelID: channel.id
    }
    
    dbservice.registeringNewServer(guildData)

    channel.send(
        `Welcome to BlackJack where you can play blackjack and compete for ranking with your friends within this server\n\n`+
        'For starter, everyone will receive 500 initial chips in their wallet to play BlackJack\n\n' +
        `Type ${prefix}command] and use the available command here:\n` +
        '1.\tblackjack [space] [amount of bet] - to start playing blackjack\n' +
        '2.\tblackjack [space] rules - to show rules of playing BlackJack\n' +
        '3.\tclaim - to claim your daily 300 chips\n' +
        '4.\twallet - to check available chips in your wallet\n' +
        '5.\tranking - to see BlackJack Hall of Fame within the server\n' +
        '6.\tglobal-ranking - to see BlackJack Hall of Fame top 3 globally\n' +
        '\nHappy Gambling peepoWide!'
    )
})

//TODO
//1. rules
//2. wallet

client.on('message', async (message) => {
    if(message.author.bot) return
    if(!message.content.startsWith(prefix)) return
    var guildDetails = await dbservice.findGuildDetails(message.guild.id)
    if(!(message.channel.id === guildDetails.channelID)){
        return message.channel.send(`Please use BlackJack commands only at <#${guildDetails.channelID}>`)
    }
    const commandBody = message.content.slice(1); 
    const args = commandBody.split(' '); 
    const command = args.shift().toLowerCase();

    const baseInfo =  {
        uid: message.author.id,
        gid: message.guild.id,
        username: message.author.username
    }

    const user = await readUserData(baseInfo) ?? await createNewUser(baseInfo)

    if(command === 'blackjack' || command === 'bj'){

        var bet = parseInt(args[0])
        
        /**@type {Player} */
        var player

        // console.log(user)
        player = playing_players.find(player => player.user.uid === user.uid)

        //validating requirements before starts the game

        if(!bet){
            message.channel.send(`Beep boop <@${user.uid}>! Make sure to include your desired bets.\n`
            + '```' + '\ttype #blackjack [bet] and put your bet :)' + '```' )
            return
        }

        if(bet > user.chips){
            message.channel.send(`<@${user.uid}> only have ${user.chips} chips available. Poor player is not allowed to put a bet!`)
            return
        }

        if(player){
            message.channel.send(`<@${player.user.uid}> Please finish your previous game!`)

            player.game.play_the_game(message).then(({bet, win})=>{
                var index = playing_players.findIndex(p => p.user.uid === user.uid)
                playing_players.splice(index, 1)

                if(win !== null){
                    /**@type {User} */
                    var update = {
                        uid: user.uid,
                        gid: user.gid,
                        wins: user.wins += win ? 1 : 0,
                        loses: user.loses += win ? 0 : 1,
                        chips: user.chips += win ? bet : -bet,
                        dailyClaims: user.dailyClaims,
                        username: user.username
                    }
                    dbservice.updateUserDetails(update)
                }
            })
        }else{
            //game starts here
            var game = new Blackjack(user, bet)
            
            /**@type {Player} */
            player = {
                user: user,
                game: new Blackjack(user, bet)
            }
            playing_players.push(player)

            player.game.play_the_game(message).then(({bet, win})=>{
                var index = playing_players.findIndex(p => p.user.uid === user.uid)
                playing_players.splice(index, 1)

                if(win !== null){
                    /**@type {User} */
                    var update = {
                        uid: user.uid,
                        gid: user.gid,
                        wins: user.wins += win ? 1 : 0,
                        loses: user.loses += win ? 0 : 1,
                        chips: user.chips += win ? bet : -bet,
                        dailyClaims: user.dailyClaims,
                        username: user.username
                    }
                    dbservice.updateUserDetails(update)
                }
            })
        }        
    }

    if(command === 'balance'){
        console.log(`${user.chips} chips in db`)
    }

    if(command === 'claim'){
        if(!user.dailyClaims){
            /**@type {User} */
            const update = {
                uid: user.uid,
                gid: user.gid,
                chips: user.chips += dailyChipsGiven,
                dailyClaims: true,
                wins: user.wins,
                loses: user.loses,
                username: user.username
            }
            dbservice.updateUserDetails(update)
            return message.channel.send(new Discord.MessageEmbed()
                .setTitle(`${message.author.username} claimed 300 chips\n\\n`)
                .setDescription(
                    `${message.author.username} now have ${update.chips}\n\n` +
                    'Claim your 300 chips today by typing #claim now'
                )
            )
        }
        return message.channel.send(new Discord.MessageEmbed()
            .setTitle(`${message.author.username} already claimed`)
            .setDescription(
                `${message.author.username}, you have claimed your chips for today, come back tomorrow at 12:00am to claim your chips`
            )
        )
    }

    if(command === 'ranking'){
        var rankers = await dbservice.displayInGuildRanking(message.guild.id)
        var content = ''
        
        rankers.forEach(ranker=>{
            var index = rankers.indexOf(ranker) + 1
            content += `${index}.\t${ranker.username} with ${ranker.chips} chips\n`
        })

        message.channel.send(new Discord.MessageEmbed()
            .setTitle(`BlackJack Hall of Fame (${message.guild.name})`)
            .setDescription(content)
        )
    }
    if(command === 'global-ranking'){
        var rankers = await dbservice.displayGlobalRanking()
        var content = ''
        
        rankers.forEach(ranker=>{
            var index = rankers.indexOf(ranker) + 1
            content += `${index}.\t${ranker.username} with ${ranker.chips} chips\n`
        })

        message.channel.send(new Discord.MessageEmbed()
            .setTitle(`BlackJack Hall of Fame (Global)`)
            .setDescription(content)
        )
    }

    if(command === 'wallet'){
        message.channel.send(new Discord.MessageEmbed()
            .setTitle(`${user.username}'s Wallet`)
            .setDescription(`${user.username}, you have ${user.chips} chips available`)
        )
    }

    if(command === 'rules'){
        message.channel.send(
            '###\tBlackJack Rules\t###\n\n' +
            'To play BlackJack, make sure you have enough chips to bet. Poor player are not allowed to place bets\n' +
            `Type \'${prefix}blackjack 500\' to start the game. 500 is an example amount of bet you can place.\n\n` +
            'Playing BlackJack:\n' +
            '1.\tThe main goal of playing Blackjack is to reach hand value of 21\n' +
            '2.\tAt the start of each round, both you and the dealer will each get a pair of cards\n' +
            '3.\tThe number card has their own face value except for Ace, King, Queen and Jack.\n' +
            '4.\tAce has a value of 11 and 1, while King, Queen and Jack has a value of 10\n' +
            '5.\tIf you have King, Queen or Jack for both hands at the start of the round, you will get BlackJack and win the game. Same goes to the dealer\n' +
            '6.\tAfter receiving your hands, you can make 3 move options whether to Hit, Stand or Double Down your bet\n' +
            `7.\tUse Hit (<:hit:${emoji.hit}>) to add more card into your hands\n` +
            `8.\tUse Stand (<:stand:${emoji.stand}>) to finish your move\n` +
            `9.\tUse Double Down  (<:double:${emoji.dd}>) to add 1 more card and finish your move\n` +
            '10.\tYou can add as many card as you like, but if you exceed 21, you are Busted and lose the game. Same goes to the dealer.\n' +
            '10.\tIf you an Ace in your hand, and your hand value exceeds 21, the Ace value will automatically turn to 1.\n' +
            `\nExample 1: You have a Jack of spades and 9 of hearts. Your hand value is 19\n` +
            'Example 2: You have a Ace of spades, a 9 of hearts and a 10 of hearts. Your hand value supposedly is 30, but since you have ' +
            'an Ace in your hand, your hand value is 20\n\n' +
            'Goodluck and have fun gambling! :D'
        )
    }

})



client.login(token).then(()=>{
    console.log('blackjack is online')
    // client.user.setStatus()
})