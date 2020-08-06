const jwt = require('jsonwebtoken');

module.exports = () => async (ctx, next) => {
  if(ctx.request.url !== '/login' && ctx.request.url !== '/signup') {
    try {
      let token = jwt.verify(ctx.request.header.authorization, 'jcx13629787279==', { algorithm: 'HS256' })
      ctx.request.token = token
      await next()
    }catch(e) {
      console.log(e)
      ctx.response.body = JSON.stringify({ message: '授权过期或异常', status: 400, data: null })
    }
  }else {
    await next()
  }
}