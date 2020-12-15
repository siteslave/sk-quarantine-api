import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export default async (fastify: FastifyInstance) => {

  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ message: "Hello world from QUARANTINE ROUTER!" })
  })

  fastify.get('/private', {
    preValidation: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ message: "Protected area!" })
  })

}