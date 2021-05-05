//@ts-check
const mongo = require('./mongodb')
const guildSchema = require('./schema/guild-schema')
const User = require('./schema/user-schema')
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
 * @typedef Ranker
 * @property {User} user
 * @property {string} guildname
 * 
 * @typedef GuildData
 * @property {String} gid
 * @property {String} channelID
 * @property {String} name
*/

/**@returns {Promise<User>} */
const createNewUser = async (user) => {
    return await mongo().then(async (mongoose)=>{
        return await new User(user).save().then((val)=>{
            /**@type {User} */
            var user = {
                uid: val.get('uid'),
                gid: val.get('gid'),
                wins: val.get('wins'),
                loses: val.get('loses'),
                chips: val.get('chips'),
                dailyClaims: val.get('dailyClaims'),
                username: val.get('username')
            }
            return user;
        })
    })
}

/**@returns {Promise<User>} */
const readUserData = async (user) => {
    return await mongo().then( async (mongoose)=>{
        try {
            return await mongoose.connection.db.collection('users').findOne({uid: user.uid, gid: user.gid})
        } catch (error) {
            return `Error occured in \'readUserData()\' : ${error}`
        }finally{
            mongoose.connection.close()
        }
    })
}

const updateUserDetails = async (user) => {
    await mongo().then( async (mongoose)=>{        
        try {
            await mongoose.connection.db.collection('users').updateOne({uid: user.uid, gid: user.gid}, {$set: user}).then(()=>console.log(user))
        } catch (error) {
            return `Error occured in \'updateUserField()\' : ${error}`
        }finally{
            mongoose.connection.close()
        }
    })
}

const dailyResetClaims = async () => {
    await mongo().then( async (mongoose)=>{       
        try {
            await mongoose.connection.db.collection('users').updateMany({},{$set: {dailyClaims: false}}).then(()=>console.log('users claim has been resetted'))
        } catch (error) {
            return `Error occured in \'dailyResetClaims()\' : ${error}`
        }finally{
            mongoose.connection.close()
        }
    })
}

const registeringNewServer = async (guild) => {
    await mongo().then( async (mongoose)=>{       
        try {
            await new guildSchema(guild).save()
        } catch (error) {
            return `Error occured in \'registeringNewServer()\' : ${error}`
        }finally{
            mongoose.connection.close()
        }
    })
}

const findGuildDetails = async (guidlID) => {
    return await mongo().then( async (mongoose)=>{
        try {
            return await mongoose.connection.db.collection('guilds').findOne({gid: guidlID})
        } catch (error) {
            return `Error occured in \'findGuildDetails()\' : ${error}`
        }finally{
            mongoose.connection.close()
        }
    })
}

const getAllGuildData = async () => {
    return await mongo().then( async (mongoose)=>{   
        return await guildSchema.find().then(datas=>{
            /**@type {Array.<GuildData>} */
            var guilds = []
            datas.forEach(data => {
                /**@type {GuildData} */
                var guild = {
                    gid: data.get('gid'),
                    channelID: data.get('channelID'),
                    name: data.get('name')
                }
                guilds.push(guild);
            });
            return guilds
        })
    })
}

//ranking
const displayInGuildRanking = async (guildID) => {
    return await mongo().then( async (mongoose)=>{   
        return await User.find({gid: guildID}).sort({chips:-1}).limit(3).then(datas=>{
            /**@type {Array.<User>} */
            var users = []
            datas.forEach(data => {
                /**@type {User} */
                var user = {
                    uid: data.get('uid'),
                    gid: data.get('gid'),
                    wins: data.get('wins'),
                    loses: data.get('loses'),
                    chips: data.get('chips'),
                    dailyClaims: data.get('dailyClaims'),
                    username: data.get('username')
                }
                users.push( user);
            });
            return users
        })
    })
}

//global ranking
const displayGlobalRanking = async () => {
    return await mongo().then( async (mongoose)=>{  
        return await User.find().sort({chips:-1}).limit(3).then(datas=>{
            /**@type {Array.<User>} */
            var users = []
            datas.forEach(data => {
                /**@type {User} */
                var user = {
                    uid: data.get('uid'),
                    gid: data.get('gid'),
                    wins: data.get('wins'),
                    loses: data.get('loses'),
                    chips: data.get('chips'),
                    dailyClaims: data.get('dailyClaims'),
                    username: data.get('username')
                }
                users.push( user);
            });
            return users
        })
    })
}

module.exports = {createNewUser, readUserData, updateUserDetails, dailyResetClaims, registeringNewServer, displayInGuildRanking, displayGlobalRanking, findGuildDetails, getAllGuildData}