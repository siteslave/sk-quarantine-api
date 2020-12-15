import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import * as crypto from 'crypto'

import { UserModel } from '../models/user'

export default async (fastify: FastifyInstance) => {

  const userModel = new UserModel()
  const db = fastify.db

  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ message: "Hello world from QUARANTINE ROUTER!" })
  })

  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const params: any = request.body

    const username = params.username
    const password = params.password
    const encPassword = crypto.createHash('md5').update(password).digest('hex');

    const rs: any = await userModel.login(db, username, encPassword);

    if (rs.length > 0) {
      // success
      const user = rs[0]
      const token = fastify.jwt.sign({ id: user.user_id })
      reply.send({ token })
    } else {
      reply.send({ ok: false, message: 'ชื่อผู้ใช้งาน/รหัสผ่าน ไม่ถูกต้อง' })
    }

    reply.send(rs)
  })

  fastify.get('/info', {
    preValidation: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id
    const rsInfo: any = await userModel.getInfo(db, userId)
    delete rsInfo[0].password
    delete rsInfo[0].username
    reply.send(rsInfo[0])
  })

}