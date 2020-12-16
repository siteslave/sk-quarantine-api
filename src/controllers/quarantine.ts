import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import * as crypto from 'crypto'

import multer from 'fastify-multer'
import { v4 as uuidv4 } from 'uuid';
import * as fse from 'fs-extra';

import { UserModel } from '../models/user'
import path from 'path'

export default async (fastify: FastifyInstance) => {

  const userModel = new UserModel()
  const db = fastify.db

  const uploadPath = process.env.UPLOAD_DIR || './upload'

  fse.ensureDirSync(uploadPath)

  const storage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
      cb(null, uploadPath)
    },
    filename: (req: any, file: any, cb: any) => {
      const _ext = path.extname(file.originalname) // .jpg
      const filename = uuidv4() + _ext
      cb(null, filename)
    }
  })

  const upload = multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req: any, file: any, cb: any) => {
      console.log(file.mimetype)
      if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png' || file.mimetype == 'application/octet-stream') {
        return cb(null, true)
      }

      cb(new Error('Invalid mimetype!'), false)

    }
  })

  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ message: "Hello world from QUARANTINE ROUTER!" })
  })

  fastify.post('/upload-profile', {
    preValidation: [fastify.authenticate],
    preHandler: upload.single('file')
  }, async (request: FastifyRequest, reply: FastifyReply) => {

    const file = request.file
    const fileInfo: any = {}

    console.log(file)
    reply.send(file)

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