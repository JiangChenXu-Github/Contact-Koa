const { Sequelize, DataTypes, Model } = require('sequelize');


const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database/database.sqlite',
  define: {
    freezeTableName: true
  },
  logging: false
});

// 用户表
class User extends Model {};
User.init({
  username: DataTypes.STRING(256),          // 用户名
  password: DataTypes.STRING(256),          // 密码
  avatar: DataTypes.STRING(256),            // 头像
  nickname: DataTypes.STRING(256),          // 昵称
  email: DataTypes.STRING(256),             // 邮箱
  gender: DataTypes.INTEGER,                // 性别（0女，1男）
  birthday: DataTypes.DATE,                 // 生日
  phone: DataTypes.STRING(256),             // 手机
  signature: DataTypes.STRING(256)          // 签名
}, { sequelize });

// 群表
class Crowd extends Model {};
Crowd.init({
  crowdName: DataTypes.STRING(256),         // 群名
  cover: DataTypes.STRING(256),             // 封面
  announcement: DataTypes.STRING(256),      // 公告
  ownerId: DataTypes.INTEGER,               // 群主id（外键User.id）
}, { sequelize });

// 好友表
class Friend extends Model {};
Friend.init({
  userId: DataTypes.INTEGER,                // 用户id（外键User.id）
  friendId: DataTypes.INTEGER               // 好友id（外键User.id）
}, { sequelize });

// 消息表
class Message extends Model {};
Message.init({
  message: DataTypes.STRING(256),           // 消息主体
  type: DataTypes.INTEGER,                  // 消息类型（0文字，1图片，2音频，3视频，4定位）
  status: DataTypes.INTEGER,                // 是否已读（0已读，1未读）
  sendId: DataTypes.INTEGER,                // 发送者id（外键User.id）          
  receiveId: DataTypes.INTEGER              // 接收者id（外键User.id）      
}, { sequelize });

// 群成员表
class CrowdMember extends Model {};
CrowdMember.init({
  crowdId: DataTypes.INTEGER,               // 群id（外键Crowd.id）
  userId: DataTypes.INTEGER,                // 用户id（外键User.id）
  crowdNickname: DataTypes.STRING(256),     // 用户群昵称
  unreadCount: DataTypes.INTEGER,           // 未读消息数
  isIgnore: DataTypes.INTEGER               // 是否屏蔽群消息（0不屏蔽，1屏蔽）
}, { sequelize });

// 群消息表
class CrowdMessage extends Model {};
CrowdMessage.init({
  crowdId: DataTypes.INTEGER,               // 群id（外键Crowd.id）
  sendId: DataTypes.INTEGER,                // 发送者id（外键User.id）
  message: DataTypes.STRING(256),           // 消息主体
  type: DataTypes.INTEGER,                  // 消息类型（0文字，1图片，2音频，3视频，4定位）
}, { sequelize });

// 消息盒子表
class MessageBox extends Model {};
MessageBox.init({
  boxOwnerId: DataTypes.INTEGER,            // 盒子拥有者id（外键User.id）
  messageSenderId: DataTypes.INTEGER,       // 消息发送者id（外键User.id或Crowd.id）
  messageSenderType: DataTypes.INTEGER,     // 消息发送者类型(0用户, 1群组)
}, { sequelize });

// 消息盒子表
class Announcement extends Model {};
Announcement.init({
  sendId: DataTypes.INTEGER,                // 触发通知者id（0表示系统触发）
  senderType: DataTypes.INTEGER,            // 触发通知者类型（0表示系统, 1表示User, 2表示Crowd）
  receiveId: DataTypes.INTEGER,             // 通知接受者id（外键User.id）
  announcementType: DataTypes.INTEGER,      // 通知类型(0被关注, 1申请加群, 2邀请加群, 3退群, 4批准了加群申请, 5接受了加群邀请...)
  processId: DataTypes.INTEGER,
  processType: DataTypes.INTEGER
}, { sequelize });

(async () => {
  await sequelize.sync({ alter: true })
})().catch((err) => { console.log(err) });

module.exports = {
  User: User,
  Crowd: Crowd,
  Friend: Friend,
  Message: Message,
  CrowdMember: CrowdMember,
  CrowdMessage: CrowdMessage,
  MessageBox: MessageBox,
  Announcement: Announcement
}
