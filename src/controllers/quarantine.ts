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

    reply.send(rs)
  })

  fastify.get('/private', {
    preValidation: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ message: "Protected area!" })
  })

}