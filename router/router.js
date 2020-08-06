const Router = require('koa-router')
const router = new Router()
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const { User, Crowd, Friend, Message, CrowdMember, CrowdMessage, MessageBox, Announcement } = require('../model/model')
const Op = require('sequelize/lib/operators')
const fs = require('fs')
const COS = require('cos-nodejs-sdk-v5')
const { resolve } = require('path')
const { rejects } = require('assert')
const cos = new COS({
  SecretId: 'AKIDDCwWprerXv1rnUlSZQ1MQikVzCj56GTQ',
  SecretKey: 'oMcYFfpivsXv2uUrxDDwKQBguqeCTXL9'
})


router.post('/login', async (ctx, next) => {
  try {
    let [{ dataValues: { password } }] = await User.findAll({ where: { username: ctx.request.body.username }, attributes: ['password'] })
    if(password === ctx.request.body.password) {
      ctx.response.body = JSON.stringify({
        message: '登录成功', 
        status: 200, 
        data: {
          token: jwt.sign({ username: ctx.request.body.username, id: (await User.findAll({ where: { username: ctx.request.body.username } }))[0].dataValues.id, exp: Math.floor(Date.now() / 1000) + 6000 * 30, iat: Math.floor(Date.now() / 1000) }, 'jcx13629787279==', { algorithm: 'HS256' })
        } 
      })
    }else {
      ctx.response.body = JSON.stringify({ message: '用户名或密码错误0', status: 500, data: null })
      return
    }
  }catch(e) {
    ctx.response.body = JSON.stringify({ message: '用户名或密码错误1', status: 500, data: null })
    console.log(e)
    return
  }
})

router.post('/signup', async (ctx, next) => {
  let flagUsername = false
  let flagEmail = false
  try {
    let user = await User.findAll({ where: { username: ctx.request.body.username } })
    if(user.length === 0) {
      flagUsername = true
    }
  }catch(e) {
    console.log(e)
  }
  try {
    let email = await User.findAll({ where: { email: ctx.request.body.email } })
    if(email.length === 0) {
      flagEmail = true
    }
  }catch(e) {
    console.log(e)
  }
  if(flagEmail && flagUsername) {
    await User.create({ username: ctx.request.body.username, password: ctx.request.body.password, email: ctx.request.body.email, avatar: 'https://contact-1301049202.cos.ap-chongqing.myqcloud.com/73539711_p0_master1200.jpg', nickname: '#未设置#', gender: 0, birthday: new Date(0), phone: '#未设置#', signature: '#未设置#' })
    ctx.response.body = JSON.stringify({
      message: '注册成功', 
      status: 200, 
      data: {
        username: 1,
        email: 1,
        token: jwt.sign({ username: ctx.request.body.username, id: (await User.findAll({ where: { username: ctx.request.body.username } }))[0].dataValues.id, exp: Math.floor(Date.now() / 1000) + 600 * 30, iat: Math.floor(Date.now() / 1000) }, 'jcx13629787279==', { algorithm: 'HS256' })
      } 
    })
    try {
      let transporter = nodemailer.createTransport({
        service: 'qq',
        auth: {
          user: '68338615@qq.com',
          pass: 'fgohhmiycoukcbca' //授权码
        }
      })
      let options = {
        from: '68338615@qq.com',
        to: ctx.request.body.email,
        subject: '名十分幸运遇到你!',
        text: `你是名的第${(await User.findAll({ where: { username: ctx.request.body.username } }))[0].dataValues.id}名用户`
      }
      let info = await transporter.sendMail(options)
    }catch(e) {
      console.log(e)
    }
  }else {
    ctx.response.body = JSON.stringify({ message: '注册失败', status: 500, data: {
      username: flagUsername ? 1 : -1,
      email: flagEmail ? 1 : -1
    } })
  }
})

router.post('/userInfomation', async (ctx, next) => {
  ctx.response.body = JSON.stringify({ message: '请求数据成功', status: 200, data: (await User.findAll({ where: { username: ctx.request.token.username }, attributes: { exclude: ['password'] } }))[0].dataValues })
})

router.post('/updateInformation', async (ctx, next) => {
  switch(ctx.request.body.mode) {
    case 'avatar':
      cos.putObject({
        Bucket: 'contact-1301049202', /* 必须 */
        Region: 'ap-chongqing',    /* 必须 */
        Key: `avatar/${ ctx.request.files.image.path.split('\\')[6] }.jpg`,              /* 必须 */
        StorageClass: 'STANDARD',
        Body: fs.createReadStream(ctx.request.files.image.path), // 上传文件对象
        onProgress: function(progressData) {
            console.log(JSON.stringify(progressData))
        }
      }, function(err, data) {
        if(!err) {
          User.findAll({ where: { id: ctx.request.token.id }, attributes: ['avatar'] }).then((res) => {
            let key = res[0].dataValues.avatar.split('/')[4]
            User.update({ avatar: `https://contact-1301049202.cos.ap-chongqing.myqcloud.com/avatar/${ ctx.request.files.image.path.split('\\')[6] }.jpg` }, { where: { id: ctx.request.token.id } }).then(() => {
              cos.deleteObject({
                Bucket: 'contact-1301049202', /* 必须 */
                Region: 'ap-chongqing',    /* 必须 */
                Key: `avatar/${ key }`      /* 必须 */
              }, function(err, data) {
                console.log(err || data);
              })
            })
          })
        }
      })
      break
    case 'signature':
      await User.update({ signature: ctx.request.body.inputData }, { where: { id: ctx.request.token.id } })
      break
    case 'crowdName':
      await Crowd.update({ crowdName: ctx.request.body.inputData }, { where: { id: ctx.request.body.crowdId } })
      break 
    case 'announcement':
      await Crowd.update({ announcement: ctx.request.body.inputData }, { where: { id: ctx.request.body.crowdId } })
      break
    case 'crowdNickname':
      await CrowdMember.update({ crowdNickname: ctx.request.body.inputData }, { where: { userId: ctx.request.token.id, crowdId: ctx.request.body.crowdId } })
      break
    case 'nickname':
      await User.update({ nickname: ctx.request.body.inputData }, { where: { id: ctx.request.token.id } })
      break
    case 'gender':
      await User.update({ gender: ctx.request.body.inputData === '男' ? 1 : 0 }, { where: { id: ctx.request.token.id } })
      break
    case 'birthday':
      await User.update({ birthday: new Date(ctx.request.body.inputData) }, { where: { id: ctx.request.token.id } })
      break
    case 'phone':
      await User.update({ phone: ctx.request.body.inputData }, { where: { id: ctx.request.token.id } })
      break
    case 'email':
      await User.update({ email: ctx.request.body.inputData }, { where: { id: ctx.request.token.id } })
      break
    case 'password':
      await User.update({ password: ctx.request.body.inputData }, { where: { id: ctx.request.token.id } })
      break
    default:
      break
  }
  ctx.response.body = JSON.stringify({ message: '更新用户数据成功', status: 200, data: null })
})

router.post('/searchByKeyword', async (ctx, next) => {
  let res = await User.findAll({
    where: { [Op.and]: [
      { username: { [Op.like]: `%${ ctx.request.body.keyword }%` } },
      { username: { [Op.ne]: ctx.request.token.username } }
    ] },
    attributes: { exclude: ['password'] }
  })
  let id = ctx.request.token.id
  for(let item of res) {
    let isFollow = (await Friend.findAll({ where: { [Op.and]: [{ userId: id },  { friendId: item.dataValues.id }] } })).length
    let isFan = (await Friend.findAll({ where: { [Op.and]: [{ userId: item.dataValues.id },  { friendId: id }] } })).length
    if(isFollow && isFan) {
      item.dataValues.friendStatus = 3 //双方都未关注对方0，自己单方关注他1，他单方关注自己2，互相关注3
    }else if(isFollow !== 0 && isFan === 0) {
      item.dataValues.friendStatus = 1
    }else if(isFollow === 0 && isFan !== 0) {
      item.dataValues.friendStatus = 2
    }else {
      item.dataValues.friendStatus = 0
    }
  }
  res = res.map((item) => {
    return item.dataValues
  })

  let res1 = []
  if(Number(ctx.request.body.keyword)) {
    let crowd = (await Crowd.findAll({ where: { id: Number(ctx.request.body.keyword) } }))[0].dataValues
    let isMember = ((await CrowdMember.findAll({ where: { crowdId: crowd.id, userId: ctx.request.token.id } })).length === 1)
    res1.push({ ...crowd, isMember: isMember })
  }
  let crowd = await Crowd.findAll({ where: { crowdName: { [Op.like]: `%${ ctx.request.body.keyword }%` } } })
  for(let item of crowd) {
    let isMember = ((await CrowdMember.findAll({ where: { crowdId: item.dataValues.id, userId: ctx.request.token.id } })).length === 1)
    res1.push({ ...item.dataValues, isMember: isMember })
  }
  ctx.response.body = JSON.stringify({ message: '请求成功', status: 200, data: { userInformation: res, groupInformation: res1 } })
})

router.post('/addFriend', async (ctx, next) => {
  try {
    if((await Friend.findAll({ where: { userId: ctx.request.token.id, friendId: ctx.request.body.friendId } })).length === 0) {
      await Friend.create({ userId: ctx.request.token.id, friendId: ctx.request.body.friendId })
    }
    ctx.response.body = JSON.stringify({ message: '关注成功', status: 200, data: null })
  }catch(e) {
    console.log(e)
    ctx.response.body = JSON.stringify({ message: '关注异常', status: 500, data: null })
  }
})

router.post('/deleteFriend', async (ctx, next) => {
  try {
    await Friend.destroy({ where: { [Op.and]: [
      { userId: ctx.request.token.id }, 
      { friendId: ctx.request.body.friendId }
    ] } })
    ctx.response.body = JSON.stringify({ message: '取消关注成功', status: 200, data: null })
  }catch(e) {
    console.log(e)
    ctx.response.body = JSON.stringify({ message: '取消关注异常', status: 500, data: null })
  }
})

router.post('/followList', async (ctx, next) => {
  let id = ctx.request.token.id
  let res = await Friend.findAll({ where: { userId: id } })
  for(let [index, item] of res.entries()) {
    res[index] = (await User.findAll({ where: { id: item.dataValues.friendId }, attributes: { exclude: ['password'] } }))[0]
  }
  for(let item of res) {
    let isFollow = (await Friend.findAll({ where: { [Op.and]: [{ userId: id },  { friendId: item.dataValues.id }] } })).length
    let isFan = (await Friend.findAll({ where: { [Op.and]: [{ userId: item.dataValues.id },  { friendId: id }] } })).length
    if(isFollow && isFan) {
      item.dataValues.friendStatus = 3 //双方都未关注对方0，自己单方关注他1，他单方关注自己2，互相关注3
    }else if(isFollow !== 0 && isFan === 0) {
      item.dataValues.friendStatus = 1
    }else if(isFollow === 0 && isFan !== 0) {
      item.dataValues.friendStatus = 2
    }else {
      item.dataValues.friendStatus = 0
    }
  }
  res = res.map((item) => {
    return item.dataValues
  })
  ctx.response.body = JSON.stringify({ message: '请求关注列表成功', status: 200, data: res })
})

router.post('/fanList', async (ctx, next) => {
  if(ctx.request.body.hasOwnProperty('crowdId')) {
    let memberList = (await CrowdMember.findAll({ where: { crowdId: ctx.request.body.crowdId } })).map(item => item.dataValues.userId)
    let fanList = (await Friend.findAll({ where: { friendId: ctx.request.token.id } }))
    for(let [index, item] of fanList.entries()) {
      let res = (await User.findOne({ where: { id: item.dataValues.userId } })).dataValues
      delete res.password
      fanList[index] = res
    }
    fanList = fanList.filter(item => {
      return memberList.indexOf(item.id) === -1
    })
    ctx.response.body = JSON.stringify({ message: '请求粉丝列表成功', status: 200, data: fanList })
  }else {
    let id = ctx.request.token.id
    let res = await Friend.findAll({ where: { friendId: id } })
    for(let [index, item] of res.entries()) {
      res[index] = (await User.findAll({ where: { id: item.dataValues.userId }, attributes: { exclude: ['password'] } }))[0]
    }
    for(let item of res) {
      let isFollow = (await Friend.findAll({ where: { [Op.and]: [{ userId: id },  { friendId: item.dataValues.id }] } })).length
      let isFan = (await Friend.findAll({ where: { [Op.and]: [{ userId: item.dataValues.id },  { friendId: id }] } })).length
      if(isFollow && isFan) {
        item.dataValues.friendStatus = 3 //双方都未关注对方0，自己单方关注他1，他单方关注自己2，互相关注3
      }else if(isFollow !== 0 && isFan === 0) {
        item.dataValues.friendStatus = 1
      }else if(isFollow === 0 && isFan !== 0) {
        item.dataValues.friendStatus = 2
      }else {
        item.dataValues.friendStatus = 0
      }
    }
    res = res.map((item) => {
      return item.dataValues
    })
    ctx.response.body = JSON.stringify({ message: '请求粉丝列表成功', status: 200, data: res })
  }
})

router.post('/groupList', async (ctx, next) => {
  let arr = []
  for(let item of (await CrowdMember.findAll({ where: { userId: ctx.request.token.id } }))) {
    arr.push((await Crowd.findAll({ where: { id: item.dataValues.crowdId } }))[0].dataValues)
  }
  ctx.response.body = JSON.stringify({ message: '请求群组列表成功', status: 200, data: arr })
})

router.post('/getMessageBox', async (ctx, next) => {
  let arr = []
  for(let item of (await MessageBox.findAll({ where: { boxOwnerId: ctx.request.token.id } }))) {
    let message
    try {
      if(item.dataValues.messageSenderType === 0) {
        message = (await Message.findOne({ order: [['createdAt', 'DESC']], where: { [Op.or]: [{ [Op.and]: [{ sendId: item.dataValues.boxOwnerId }, { receiveId: item.dataValues.messageSenderId }] }, { [Op.and]: [{ receiveId: item.dataValues.boxOwnerId }, { sendId: item.dataValues.messageSenderId }] }] } })).dataValues
      }else {
        message = (await CrowdMessage.findOne({ order: [['createdAt', 'DESC']], where: { crowdId: item.dataValues.messageSenderId } })).dataValues
      }
      
    }catch {
      message = { id: -1, message: null, type: 0, status: 1, sendId: null, receiveId: null, createdAt: null, updatedAt: null }
    }
    if(item.dataValues.messageSenderType === 0) {
      let infomation = (await User.findAll({ where: { id: item.dataValues.messageSenderId } }))[0].dataValues
      let count = await Message.count({ where: { sendId: item.dataValues.messageSenderId, receiveId: item.dataValues.boxOwnerId, status: 1 } })
      delete message.id
      delete infomation.createdAt
      delete infomation.updatedAt
      delete infomation.password
      let res = { ...message, ...infomation, count: count }
      arr.push(res)
    }else {
      let infomation = (await Crowd.findAll({ where: { id: item.dataValues.messageSenderId } }))[0].dataValues
      let count = (await CrowdMember.findAll({ where: { crowdId: item.dataValues.messageSenderId, userId: ctx.request.token.id } }))[0].dataValues.unreadCount
      delete message.id
      delete infomation.createdAt
      delete infomation.updatedAt
      let res = { ...message, ...infomation, count: count }
      arr.push(res)
    }
  }
  arr.sort((a, b) => {
    if(a.createdAt < b.createdAt) {
      return 1
    }
    return -1
  })
  ctx.response.body = JSON.stringify({ message: '获取消息盒子成功', status: 200, data: arr })
})

router.post('/insertMessageBox', async (ctx, next) => {
  try {
    let id = ctx.request.body.information.id
    let type
    if(ctx.request.body.information.hasOwnProperty('username')) {
      type = 0
    }else if(ctx.request.body.information.hasOwnProperty('crowdName')) {
      type = 1
    }
    if(ctx.request.body.mode !== 3) {
      if((await MessageBox.findAll({ where: { [Op.and]: [{ boxOwnerId: ctx.request.body.mode === 0 ? ctx.request.token.id : id }, { messageSenderId: ctx.request.body.mode === 0 ? id : ctx.request.token.id }, { messageSenderType: type }] } })).length === 0) {
        await MessageBox.create({ boxOwnerId: ctx.request.body.mode === 0 ? ctx.request.token.id : id, messageSenderId: ctx.request.body.mode === 0 ? id : ctx.request.token.id, messageSenderType: type })
      }
      ctx.response.body = JSON.stringify({ message: '插入消息盒子成功', status: 200, data: null })
    }else {
      for(let item of ctx.request.body.members) {
        await MessageBox.create({ boxOwnerId: item, messageSenderId: id, messageSenderType: type })
      }
      ctx.response.body = JSON.stringify({ message: '插入消息盒子成功', status: 200, data: null })
    }
  } catch (error) {
    console.log(error)
    ctx.response.body = JSON.stringify({ message: '插入消息盒子异常', status: 500, data: null })
  }
})

router.post('/getMessage', async (ctx, next) => {
  let data = (await Message.findAll({ where: { [Op.or]: [{ [Op.and]: [{ sendId: ctx.request.token.id }, { receiveId: ctx.request.body.id }] }, { [Op.and]: [{ sendId: ctx.request.body.id }, { receiveId: ctx.request.token.id }] }] } })).map((item) => {
    return item.dataValues
  })
  ctx.response.body = JSON.stringify({ message: '获取数据成功', status: 200, data: data })
})

router.post('/getCrowdMessage', async (ctx, next) => {
  let data = []
  for(let item of (await CrowdMessage.findAll({ where: { crowdId: ctx.request.body.id } }))) {
    let userInfo = (await User.findAll({ where: { id: item.dataValues.sendId } }))[0].dataValues
    delete userInfo.id
    delete userInfo.password
    delete userInfo.createdAt
    delete userInfo.updatedAt
    let crowdNickname = (await CrowdMember.findAll({ where: { crowdId: ctx.request.body.id, userId: item.dataValues.sendId } }))[0].dataValues.crowdNickname
    data.push({ ...item.dataValues, ...userInfo, crowdNickname: crowdNickname })
  }
  ctx.response.body = JSON.stringify({ message: '获取群组数据成功', status: 200, data: data })
})

router.post('/insertMessage', async (ctx, next) => {
  try {
    Message.create({ message: ctx.request.body.message, type: 0, status: 1, sendId: ctx.request.token.id, receiveId: (await User.findAll({ where: { username: ctx.request.body.receiveUsername } }))[0].dataValues.id })
    ctx.response.body = JSON.stringify({ message: '插入数据成功', status: 200, data: null })
  }catch(e) {
    console.log(e)
    ctx.response.body = JSON.stringify({ message: '插入数据异常', status: 500, data: null })
  }
})

router.post('/insertCrowdMessage', async (ctx, next) => {
  try{
    let data = []
    await CrowdMessage.create({ crowdId: ctx.request.body.receiveCrowdId, sendId: ctx.request.token.id, message: ctx.request.body.message, type: 0 })
    for(let item of (await CrowdMember.findAll({ where: { crowdId: ctx.request.body.receiveCrowdId } }))) {
      data.push(item.dataValues.userId)
      await CrowdMember.update({ unreadCount: ++item.dataValues.unreadCount }, { where: { id: item.dataValues.id } })
    }
    ctx.response.body = JSON.stringify({ message: '插入数据成功', status: 200, data: data })
  }catch(e) {
    console.log(e)
    ctx.response.body = JSON.stringify({ message: '插入数据异常', status: 500, data: null })
  }
})

router.post('/changeMessageStatus', async (ctx, next) => {
  Message.update({ status: 0 }, { where: { [Op.and]: [{ sendId: ctx.request.body.mode === 0 ? ctx.request.body.id : ctx.request.token.id }, { receiveId: ctx.request.body.mode === 0 ? ctx.request.token.id : ctx.request.body.id }] } })
  ctx.response.body = JSON.stringify({ message: '改变消息状态成功', status: 200, data: null })
})

router.post('/changeCrowdMessageStatus', async (ctx, next) => {
  CrowdMember.update({ unreadCount: 0 }, { where: { [Op.and]: [{ crowdId: ctx.request.body.crowdId }, { userId: ctx.request.body.userId }] } })
  ctx.response.body = JSON.stringify({ message: '改变消息状态成功', status: 200, data: null })
})

router.post('/insertCrowd', async (ctx, next) => {
  try {
    let data = await new Promise((resolve, rejects) => {
      cos.putObject({
        Bucket: 'contact-1301049202', /* 必须 */
        Region: 'ap-chongqing',    /* 必须 */
        Key: `avatar/${ ctx.request.files.image.path.split('\\')[6] }.jpg`,              /* 必须 */
        StorageClass: 'STANDARD',
        Body: fs.createReadStream(ctx.request.files.image.path), // 上传文件对象
        onProgress: function(progressData) {
            console.log(JSON.stringify(progressData))
        }
      }, function(err, data) {
        if(!err) {
          Crowd.create({ crowdName: ctx.request.body.crowdName, cover: `https://contact-1301049202.cos.ap-chongqing.myqcloud.com/avatar/${ ctx.request.files.image.path.split('\\')[6] }.jpg`, announcement: '#未设置#', ownerId: ctx.request.token.id }).then((res) => {
            new Promise((resolve, rejects) => {
              let i = 0
              User.findAll({ where: { id: ctx.request.token.id } }).then((res2) => {
                CrowdMember.create({ crowdId: res.dataValues.id, userId: ctx.request.token.id, crowdNickname: res2[0].dataValues.nickname, unreadCount: 0, isIgnore: 0 }).then(() => {
                  i++
                  if(i === (ctx.request.body.members.split(',').length + 1)) {
                    resolve(res.dataValues)
                  }
                }).catch(() => {
                  rejects()
                })
              }).catch(() => {
                rejects()
              })
              if(ctx.request.body.members !== '') {
                for(let item of ctx.request.body.members.split(',')) {
                  User.findAll({ where: { id: item } }).then((res1) => {
                    CrowdMember.create({ crowdId: res.dataValues.id, userId: item, crowdNickname: res1[0].dataValues.nickname, unreadCount: 0, isIgnore: 0 }).then(() => {
                      i++
                      if(i === (ctx.request.body.members.split(',').length + 1)) {
                        resolve()
                      }
                    }).catch(() => {
                      rejects()
                    })
                  })
                }
              }else {
                resolve()
              }
            }).then(() => {
              resolve(res.dataValues)
            }).catch(() => {
              rejects()
            })
          })
        }else {
          rejects()
        }
      })
    })
    ctx.response.body = JSON.stringify({ message: '创建群组成功', status: 200, data: data })
  }catch {
    ctx.response.body = JSON.stringify({ message: '创建群组异常', status: 500, data: null })
  }
})

router.post('/exitCrowd', async (ctx, next) => {
  try {
    if((await Crowd.findAll({ where: { id: ctx.request.body.crowdId } }))[0].dataValues.ownerId === ctx.request.token.id) {
      await CrowdMember.destroy({ where: { crowdId: ctx.request.body.crowdId, userId: ctx.request.token.id } })
      await MessageBox.destroy({ where: { messageSenderId: ctx.request.body.crowdId, boxOwnerId: ctx.request.token.id, messageSenderType: 1 } })
      let newOwner = (await CrowdMember.findOne({ where: { crowdId: ctx.request.body.crowdId } }))
      if(newOwner) {
        await Crowd.update({ ownerId: newOwner.dataValues.userId }, { where: { id: ctx.request.body.crowdId } })
      }else {
        await Crowd.destroy({ where: { id: ctx.request.body.crowdId } })
      }
    }else {
      await CrowdMember.destroy({ where: { crowdId: ctx.request.body.crowdId, userId: ctx.request.token.id } })
      await MessageBox.destroy({ where: { messageSenderId: ctx.request.body.crowdId, boxOwnerId: ctx.request.token.id, messageSenderType: 1 } })
    }
    ctx.response.body = JSON.stringify({ message: '退出群组成功', status: 200, data: null })
  } catch (e) {
    console.log(e)
    ctx.response.body = JSON.stringify({ message: '退出群组异常', status: 500, data: null })
  }
})

router.post('/getCrowdDetail', async (ctx, next) => {
  try {
    let data = { ...(await Crowd.findAll({ where: { id: ctx.request.body.crowdId } }))[0].dataValues, members: [] }
    for(let item of (await CrowdMember.findAll({ where: { crowdId: ctx.request.body.crowdId }, limit: 7, attributes: { exclude: ['id', 'crowdId', 'unreadCount', 'isIgnore'] } }))) {
      let userInfo = (await User.findAll({ where: { id: item.dataValues.userId }, attributes: { exclude: ['password'] } }))[0].dataValues
      delete item.dataValues.userId
      if(data.ownerId === userInfo.id) {
        data.members.unshift({ ...userInfo, ...item.dataValues })
      }else {
        data.members.push({ ...userInfo, ...item.dataValues })
      }
    }
    ctx.response.body = JSON.stringify({ message: '创建群组成功', status: 200, data: data })
  } catch (error) {
    ctx.response.body = JSON.stringify({ message: '创建群组异常', status: 500, data: data })
  }
})

router.post('/insertAnnouncement', async (ctx, next) => {
  switch (ctx.request.body.announcementType) {
    case 0:
      try {
        let sendId = ctx.request.token.id
        let senderType = 1
        let receiveId = ctx.request.body.friendId
        let announcementType = ctx.request.body.announcementType
        if((await Announcement.findAll({ where: { sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: null, processType: null } })).length === 0) {
          await Announcement.create({ sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: null, processType: null })
        }
        ctx.response.body = JSON.stringify({ message: '关注成功', status: 200, data: null })
      } catch (error) {
        console.log(error)
        ctx.response.body = JSON.stringify({ message: '关注异常', status: 500, data: null })
      }
      break;
    case 1:
      try {
        let sendId = ctx.request.token.id
        let senderType = 1
        let receiveId = (await Crowd.findAll({ where: { id: ctx.request.body.crowdId } }))[0].dataValues.ownerId
        let processId = ctx.request.body.crowdId
        let processType = 2
        let announcementType = ctx.request.body.announcementType
        if((await Announcement.findAll({ where: { sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType } })).length === 0) {
          await Announcement.create({ sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType })
        }
        ctx.response.body = JSON.stringify({ message: '申请加群成功', status: 200, data: null })
      } catch (error) {
        console.log(error)
        ctx.response.body = JSON.stringify({ message: '申请加群异常', status: 500, data: null })
      }
      break;
    case 2:
      try {
        let sendId = (await Crowd.findAll({ where: { id: ctx.request.body.crowdId } }))[0].dataValues.ownerId
        let senderType = 1
        let announcementType = ctx.request.body.announcementType
        let processId = ctx.request.body.crowdId
        let processType = 2
        for(let item of ctx.request.body.memberList) {
          let receiveId = item
          if((await Announcement.findAll({ where: { sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType } })).length === 0) {
            await Announcement.create({ sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType })
          }
        }
        ctx.response.body = JSON.stringify({ message: '邀请成功', status: 200, data: null })
      } catch (error) {
        console.log(error)
        ctx.response.body = JSON.stringify({ message: '邀请异常', status: 500, data: null })
      }
      break;
    case 3:
      try {
        let sendId = ctx.request.token.id
        let senderType = 1
        let announcementType = ctx.request.body.announcementType
        let processId = ctx.request.body.crowdId
        let processType = 2
        let receiveId = (await Crowd.findAll({ where: { id: ctx.request.body.crowdId } }))[0].dataValues.ownerId
        if((await Announcement.findAll({ where: { sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType } })).length === 0) {
          await Announcement.create({ sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType })
        }
        ctx.response.body = JSON.stringify({ message: '退群成功', status: 200, data: null })
      } catch (error) {
        console.log(error)
        ctx.response.body = JSON.stringify({ message: '退群异常', status: 500, data: null })
      }
      break;
    case 4:
      
      break;
    case 5:
        
      break;  
    default:
      break;
  }
})

router.post('/getAnnouncement', async (ctx, next) => {
  try {
    let announcementList = (await Announcement.findAll({ where: { receiveId: ctx.request.token.id } })).map((item) => {
      return item.dataValues
    })
    for(let [index, item] of announcementList.entries()) {
      let senderInfo = {}
      let processInfo = {}
      if(item.senderType === 1) {
        senderInfo = (await User.findOne({ where: { id: item.sendId } })).dataValues
        delete senderInfo.id
        delete senderInfo.password
      }else if(item.senderType === 2) {
        senderInfo = (await Crowd.findOne({ where: { id: item.sendId } })).dataValues
        delete senderInfo.id
      }
      if(item.processType === 1) {
        processInfo = (await User.findOne({ where: { id: item.processId } })).dataValues
        delete processInfo.id
        delete processInfo.password
      }else if(item.processType === 2) {
        processInfo = (await Crowd.findOne({ where: { id: item.processId } })).dataValues
        delete processInfo.id
      }
      announcementList[index] = { ...item, sender: { ...senderInfo }, process: { ...processInfo } }
    }
    ctx.response.body = JSON.stringify({ message: '获取通知成功', status: 200, data: announcementList })
  } catch (error) {
    console.log(error)
    ctx.response.body = JSON.stringify({ message: '获取通知异常', status: 500, data: null })
  }
})

router.post('/handelAnnouncement', async (ctx, next) => {
  switch (ctx.request.body.announcementType) {
    case 0:
      try {
        let sendId = ctx.request.body.sendId
        let senderType = ctx.request.body.senderType
        let announcementType = ctx.request.body.announcementType
        let processId = ctx.request.body.processId
        let processType = ctx.request.body.processType
        let receiveId = ctx.request.body.receiveId
        if((await Announcement.findAll({ where: { sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType } })).length === 1) {
          await Announcement.destroy({ where: { sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType } })
        }
        ctx.response.body = JSON.stringify({ message: '处理成功', status: 200, data: null })
      } catch (error) {
        console.log(error)
        ctx.response.body = JSON.stringify({ message: '处理异常', status: 500, data: null })
      }
      break;
    case 1:
      try {
        let sendId = ctx.request.body.sendId
        let senderType = ctx.request.body.senderType
        let announcementType = ctx.request.body.announcementType
        let processId = ctx.request.body.processId
        let processType = ctx.request.body.processType
        let receiveId = ctx.request.body.receiveId
        if((await Announcement.findAll({ where: { sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType } })).length === 1) {
          await Announcement.destroy({ where: { sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType } })
        }
        if(ctx.request.body.operation === 'deny') {
          ctx.response.body = JSON.stringify({ message: '处理成功', status: 200, data: null })
        }else {
          if((await CrowdMember.findAll({ where: { crowdId: ctx.request.body.processId, userId: ctx.request.body.sendId } })).length === 0) {
            await CrowdMember.create({ crowdId: ctx.request.body.processId, userId: ctx.request.body.sendId, crowdNickname: (await User.findOne({ where: { id: ctx.request.body.sendId } })).dataValues.nickname, unreadCount: 0, isIgnore: 0 })
          }
          ctx.response.body = JSON.stringify({ message: '处理成功', status: 200, data: null })
        }
      } catch (error) {
        console.log(error)
        ctx.response.body = JSON.stringify({ message: '处理异常', status: 500, data: null })
      }
      break;
    case 2:
      try {
        let sendId = ctx.request.body.sendId
        let senderType = ctx.request.body.senderType
        let announcementType = ctx.request.body.announcementType
        let processId = ctx.request.body.processId
        let processType = ctx.request.body.processType
        let receiveId = ctx.request.body.receiveId
        if((await Announcement.findAll({ where: { sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType } })).length === 1) {
          await Announcement.destroy({ where: { sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType } })
        }
        if(ctx.request.body.operation === 'deny') {
          ctx.response.body = JSON.stringify({ message: '处理成功', status: 200, data: null })
        }else {
          if((await CrowdMember.findAll({ where: { crowdId: ctx.request.body.processId, userId: ctx.request.body.sendId } })).length === 0) {
            await CrowdMember.create({ crowdId: ctx.request.body.processId, userId: ctx.request.body.receiveId, crowdNickname: (await User.findOne({ where: { id: ctx.request.body.receiveId } })).dataValues.nickname, unreadCount: 0, isIgnore: 0 })
          }
          ctx.response.body = JSON.stringify({ message: '处理成功', status: 200, data: null })
        }
      } catch (error) {
        console.log(error)
        ctx.response.body = JSON.stringify({ message: '处理异常', status: 500, data: null })
      }
      break;
    case 3:
      try {
        let sendId = ctx.request.body.sendId
        let senderType = ctx.request.body.senderType
        let announcementType = ctx.request.body.announcementType
        let processId = ctx.request.body.processId
        let processType = ctx.request.body.processType
        let receiveId = ctx.request.body.receiveId
        if((await Announcement.findAll({ where: { sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType } })).length === 1) {
          await Announcement.destroy({ where: { sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType } })
        }
        ctx.response.body = JSON.stringify({ message: '处理成功', status: 200, data: null })
      } catch (error) {
        console.log(error)
        ctx.response.body = JSON.stringify({ message: '处理异常', status: 500, data: null })
      }
      break;
    case 4:
      try {
        let sendId = ctx.request.body.sendId
        let senderType = ctx.request.body.senderType
        let announcementType = ctx.request.body.announcementType
        let processId = ctx.request.body.processId
        let processType = ctx.request.body.processType
        let receiveId = ctx.request.body.receiveId
        if((await Announcement.findAll({ where: { sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType } })).length === 1) {
          await Announcement.destroy({ where: { sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType } })
        }
        ctx.response.body = JSON.stringify({ message: '处理成功', status: 200, data: null })
      } catch (error) {
        console.log(error)
        ctx.response.body = JSON.stringify({ message: '处理异常', status: 500, data: null })
      }
      break;
    case 5:
      try {
        let sendId = ctx.request.body.sendId
        let senderType = ctx.request.body.senderType
        let announcementType = ctx.request.body.announcementType
        let processId = ctx.request.body.processId
        let processType = ctx.request.body.processType
        let receiveId = ctx.request.body.receiveId
        if((await Announcement.findAll({ where: { sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType } })).length === 1) {
          await Announcement.destroy({ where: { sendId: sendId, senderType: senderType, receiveId: receiveId, announcementType: announcementType, processId: processId, processType: processType } })
        }
        ctx.response.body = JSON.stringify({ message: '处理成功', status: 200, data: null })
      } catch (error) {
        console.log(error)
        ctx.response.body = JSON.stringify({ message: '处理异常', status: 500, data: null })
      }
      break;              
    default:
      break;
  }
})

module.exports = () => router.routes()