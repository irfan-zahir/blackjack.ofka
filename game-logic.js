//@ts-check
const { Message, MessageEmbed } = require("discord.js");
/**
 * @typedef User 
 * @property {String} uid
 * @property {String} gid
 * @property {String} username
 * @property {Number} wins
 * @property {Number} loses
 * @property {Boolean} dailyClaims
 * @property {Number} chips
 * @typedef CardValue
 * @property {String} card
 * @property {Number} value
 * @typedef SuitedCard
 * @property {CardValue} card
 * @property {String} suit
 */

const emoji = {
    hit: '839144640523141130',
    stand: '839142811730968666',
    dd: '839143634128863312'
}

/**@type {Array.<CardValue>} */
const cards = [ 
    {card: 'A', value: 11}, {card: '2', value: 2},
    {card: '3', value: 3}, {card: '4', value: 4},
    {card: '5', value: 5}, {card: '6', value: 6},
    {card: '7', value: 7}, {card: '8', value: 8},
    {card: '9', value: 9}, {card: '10', value: 10},
    {card: 'J', value: 10}, {card: 'Q', value: 10},
    {card: 'K', value: 10}
]

/**@type {Array.<String>} */
const suits = ['diamonds', 'clubs', 'hearts', 'spades']

module.exports = class Blackjack {

     /**
     * @param {User} player
     * @param {Number} bet
     */

    constructor(player, bet){
        this.player = player
        this.bet = bet
        /**@type {Array.<SuitedCard>} */
        this.deck = []
        /**@type {Array.<SuitedCard>} */
        this.playerHand = []
        /**@type {Array.<SuitedCard>} */
        this.dealerHand = []
        this.playerMove = false
        this.dealerMove = false
        this.gameRunning = false
        this.playerWin = null
        this.reactions = []
    }

    shuffleDeck(){
        
        /**@type {Array.<SuitedCard>} */
        var virDeck = []
        for(var i = 0; i < suits.length; i++){
            for(var j = 0; j < cards.length; j++){
                /**@type {SuitedCard} */
                let card = {card: cards[j], suit: suits[i]}
                virDeck.push(card)
            }
        }

        for(var i = virDeck.length -1 ; i > 0; i--){
            const j = Math.floor(Math.random() * (i + 1));
            [virDeck[i], virDeck[j]] = [virDeck[j], virDeck[i]];
        }

        this.deck = virDeck
    }

    /**
     * @returns {SuitedCard} 
     */
    dealingCard(){
        return this.deck.pop()
    }

    startGame(){
        this.shuffleDeck()
        this.playerMove = true
        this.gameRunning = true
        this.playerHand.push(this.dealingCard())
        this.playerHand.push(this.dealingCard())
        this.dealerHand.push(this.dealingCard())
        this.dealerHand.push(this.dealingCard())
    }

    /**
     * @param {Message} message
     */
    async play_the_game(message){
        var gameResult
        if(!this.gameRunning){
            this.startGame()
        }

        //check any blackjack before entering game loop
        if(this.check_for_blackjack(this.dealerHand)){
            this.gameRunning = false
            this.playerMove = false
            gameResult = 'dbj'
        }

        if(this.check_for_blackjack(this.playerHand)){
            this.gameRunning = false
            this.playerMove = false
            gameResult = 'pbj'
        }

        var sent = message.channel.send(this.display_player_move())
        sent.then(sent=>{
            sent.react(emoji.hit)
            sent.react(emoji.stand)
            sent.react(emoji.dd)
            // if(this.reactions.length > 0)
            // this.reactions.forEach(reaction=>{
            //     sent.react(reaction)
            // })
        })
        var edit = await sent
        
        while (this.playerMove || this.dealerMove) {        
            while (this.playerMove) {                
                var action = await this.get_player_action(await sent);
                // const userReactions = edit.reactions.cache.filter(reaction => reaction.users.cache.has(this.player.uid));
                // for(const reaction of userReactions.values()) await reaction.users.remove(this.player.uid)

                switch (action) {
                    case emoji.hit:
                        this.playerHand.push(this.dealingCard())
                        this.reactions.push(action)
                    break;
    
                    case emoji.stand:
                        this.playerMove = false
                        this.dealerMove = true
                        this.reactions.push(action)
                    break;
    
                    case emoji.dd:
                        const newBet = this.bet * 2
                        if(this.player.chips < newBet){
                            message.channel.send(new MessageEmbed()
                                .setTitle('Cannot put the bet!')
                                .setDescription(
                                    `${this.player.username}, make sure you have enough bet to place. Know your place, poor.`
                                )
                            )
                            break;
                        }
                        this.playerHand.push(this.dealingCard())
                        this.reactions.push(action)
                        this.playerMove = false
                        this.dealerMove = true
                        this.bet = newBet
                    break;
                
                    default:
                        break;
                }        
                edit.edit(this.display_player_move())      
                if(this.count_hand(this.playerHand) > 21) {//check for busted
                    this.playerMove = false
                    gameResult = 'pb' // player busted                    
                }
            }
            if(this.dealerMove){
                this.dealer_move()//when dealer move end, display game result
                //err: dealer's card count = 17 auto end
                this.display_dealer_move(message)
            }
            if(this.count_hand(this.dealerHand) > 21){
                this.gameRunning = false
                gameResult = 'db' // dealer busted   
            }
        }

        if(!gameResult){
            if(this.count_hand(this.playerHand) > this.count_hand(this.dealerHand)) gameResult = 'pw'
    
            if(this.count_hand(this.playerHand) < this.count_hand(this.dealerHand)) gameResult = 'dw'
        }
        this.gameRunning = false
        //update database
        await message.channel.send(this.display_game_result(gameResult))
        var bet = this.bet
        var win = this.playerWin
        return {bet, win}
    }

    /**
     * @param {Message} message
    */
    async get_player_action(message){
        return await message.awaitReactions((react, user)=> user.id === this.player.uid, {max: 1, maxUsers: 1})
            .then(react=>{
                return react.array()[0].emoji.id
            })
    }

    dealer_move(){
        while (this.count_hand(this.dealerHand) < 18) {
            this.dealerHand.push(this.dealingCard())
        }
        this.dealerMove = false
    }

    /**
     * @returns {Number} 
     * @param {Array.<SuitedCard>} hand
     */
    count_hand(hand){//add count soft ace
        var handValue = 0
        var aceExist = hand.some(card=> card.card.card === cards[0].card)
        hand.forEach(card => handValue += card.card.value);
        if(handValue > 21) if(aceExist) handValue -= 10
        return handValue
    }

    /**
     * @param {Array.<SuitedCard>} hand
     */
    check_for_blackjack(hand){
        var highCard = ['K', 'Q', 'J']
        if(hand.length == 2){
            if(highCard.indexOf(hand[0].card.card) > -1 
                && highCard.indexOf(hand[1].card.card) > -1)
            return true // got blackjack
        }
        return false
    }
    
    display_player_move(){//right now player move, dealer still not deal the card
        var embeded = new MessageEmbed();
        var displayMessage = null


        displayMessage = embeded.setTitle(`${this.player.username} ingame right now`)
            .setDescription(
                '```' + 
                `Dealer's hand (card count: ??)` +
                `\n${this.dealerHand[0].card.card} ${this.dealerHand[0].suit} and ??\n` +
                `\n\tGame still running\n` +
                `\n${this.show_all_hand(this.playerHand)}\n`+
                `Player's hand (card count: ${this.count_hand(this.playerHand)})` +
                '```'
            )
        
        return displayMessage
    }

    /**
     * @param {Message} message
     */
    display_dealer_move(message){//right now player move, dealer still not deal the card
        var embeded = new MessageEmbed();
        var displayMessage = null


        displayMessage = embeded.setTitle(`${this.player.username} ingame right now`)
            .setDescription(
                '```' + 
                `Dealer's hand (card count: ${this.count_hand(this.dealerHand)})` +
                `\n${this.show_all_hand(this.dealerHand)}\n` +
                `\n\tGame still running\n` +
                `\n${this.show_all_hand(this.playerHand)}\n`+
                `Player's hand (card count: ${this.count_hand(this.playerHand)})` +
                '```'
            )
        
        return displayMessage
    }

    /**
     * @param {Message} message
     */
    //  async game_still_running(message){
    //     var reaction = await (await this.display_player_move(message))
    //         .awaitReactions((react, user)=> user.id === this.player.uid, {max: 1, maxUsers: 1})
    //         .then(react=>{
    //             return react.array()[0].emoji.id
    //         })
        
    //     this.reactions.push(reaction)
    // }

    /**
     * @param {Array.<SuitedCard>} hand
     */
    show_all_hand(hand){
        var string = ''
        hand.forEach(card=>{
            var index = hand.indexOf(card)
            string += `${card.card.card} ${card.suit}`
            if(index < hand.length - 1) string += ' and '
        })
        return string
    }

    display_game_result(gameResult){
        switch (gameResult) {
            case 'pb': //player busted
            this.playerWin = false
            return this.returnEmbededGameResult(`${this.player.username} BUSTED`, false)              

            case 'db': //dealer busted
            this.playerWin = true
            return this.returnEmbededGameResult(`Dealer's BUSTED`, true)  

            case 'pbj': //player blackjack
            this.playerWin = true
            return this.returnEmbededGameResult(`${this.player.username} BLACKJACK`, true)

            case 'dbj': //dealer blackjack
            this.playerWin = false
            return this.returnEmbededGameResult(`Dealer's BLACKJACK`, false)

            case 'pw': //player win
            this.playerWin = true
            return this.returnEmbededGameResult(`${this.player.username} WIN`, true) 

            case 'dw': //dealer win
            this.playerWin = false
            return this.returnEmbededGameResult(`Dealer's WIN`, false) 
        
            default://split
            return this.returnEmbededGameResult(`SPLIT`, null) 
        }
    }

    returnEmbededGameResult(result, playerWin){
        var embeded = new MessageEmbed();
        var gameRes = `and ${playerWin ? 'WON' : 'LOSE'} ${this.bet} chips`
        return embeded.setTitle(`${this.player.username}, you ${playerWin == null ? 'SPLIT!' : (playerWin ? 'WIN :D' : 'LOSE :(')}`)
            .setDescription(
                '```' +
                'Game Ended\n' +
                `Dealer's hand (card count: ${this.count_hand(this.dealerHand)})` +
                `\n${this.show_all_hand(this.dealerHand)}\n` +
                `\n\t${result}${playerWin == null ? '': gameRes}\n` +
                `\n${this.show_all_hand(this.playerHand)}\n`+
                `Player's hand (card count: ${this.count_hand(this.playerHand)})` +
                '```'
            )   
    }
}
