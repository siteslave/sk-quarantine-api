import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import * as crypto from 'crypto'
import * as fs from 'fs';

const gcm = require('node-gcm');

import moment from 'moment';

import multer from 'fastify-multer'
import { v4 as uuidv4 } from 'uuid';
import * as fse from 'fs-extra';

import { UserModel } from '../models/user'
import path from 'path'
import { FileModel } from '../models/file';
import { Quarantine } from '../models/quarantine';

export default async (fastify: FastifyInstance) => {

  const sender = new gcm.Sender('AAAA0GsqMz4:APA91bG4NwjMs1kc8uMpuZyqmLOIDCC1MD5-_EvTIjfBU15iyHSf9EgnWSQ9r-k3BPkAoSaf9bQbpSQT8T4Eh7WDFiBZXthyevCH7NQzKL-xLyPOx_-IYftBcpYIpcWuAFv2W_orhdGe');


  const userModel = new UserModel()
  const fileModel = new FileModel()
  const quarantineModel = new Quarantine()

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
    fileInfo.mimetype = file.mimetype;
    fileInfo.file_name = file.filename;
    fileInfo.user_id = request.user.id;

    // get file info
    const rs: any = await fileModel.getInfo(db, request.user.id);
    if (rs.length > 0) {
      // update
      delete fileInfo.user_id;
      await fileModel.update(db, request.user.id, fileInfo);
    } else {
      // insert
      await fileModel.save(db, fileInfo);
    }

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

  fastify.put('/device-token', {
    preValidation: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id
    const params: any = request.body;
    const deviceToken = params.deviceToken;

    if (deviceToken) {
      const data: any = {};
      data.device_token = deviceToken;

      await userModel.update(db, userId, data)

      reply.send({ ok: true })
    } else {
      reply.send({ ok: false })
    }

  })

  fastify.get('/temp-list', {
    preValidation: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id
    const rsInfo: any = await quarantineModel.getTempQuery(db, userId)

    const items = rsInfo.map((v: any) => {
      v.display = `${v.temp} องศา`;
      v.value = v.temp;
      return v;
    });

    reply.send(items)
  })

  fastify.get('/image-profile', {
    preValidation: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id
    const rsInfo: any = await userModel.getImage(db, userId)

    const imageFileName = rsInfo[0].file_name;
    const imagePath = path.join(uploadPath, imageFileName);
    let profileImage;

    if (fs.existsSync(imagePath)) {
      profileImage = imagePath;
    } else {
      profileImage = path.join(__dirname, '../../public/images/placeholder.png')
    }

    const fileData = fs.readFileSync(profileImage)

    reply.type('image/jpeg')
    reply.send(fileData)
  })

  fastify.get('/screening', {
    preValidation: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id

    // ?query=xxx
    const params: any = request.query;
    const query = params.query || null;

    const rsInfo: any = await quarantineModel.getList(db, userId, query)
    const items = rsInfo.map((v: any) => {
      v.serve_date = moment(v.serve_date).format('YYYY-MM-DD');
      return v;
    })

    reply.send(items)
  })

  fastify.post('/send-notify', {
    preValidation: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {

    const params: any = request.body;
    const userId = params.userId;
    const msg = params.msg;

    const rsInfo: any = await userModel.getInfo(db, userId);

    if (rsInfo.length > 0) {

      var regTokens: any = [];

      const deviceToken = rsInfo[0].device_token;

      regTokens.push(deviceToken); // ['xxxxx']

      var message = new gcm.Message({
        contentAvailable: true,
        collapseKey: 'skcovid',
        priority: 'high',
        notification: {
          title: "SK-COVID",
          icon: "ic_launcher",
          body: msg || 'ข้อความปกติ'
        }
      });

      sender.sendNoRetry(message, { registrationTokens: regTokens }, (err: any, response: any) => {
        if (err) {
          console.log(err);
          reply.send({ ok: false })
        } else {
          console.log(response);
          reply.send({ ok: true })
        };
      });

    } else {
      reply.send({ ok: false, message: 'ไม่พบผู้ใช้งาน' })
    }


  })

  fastify.post('/send-notify-all', {
    preValidation: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {

    const params: any = request.body;
    const msg = params.msg;

    const rsInfo: any = await userModel.getDeviceTokens(db);

    if (rsInfo.length > 0) {

      var regTokens: any = [];

      for (const token of rsInfo) {
        regTokens.push(token.device_token);
      }

      var message = new gcm.Message({
        contentAvailable: true,
        collapseKey: 'skcovid',
        priority: 'high',
        notification: {
          title: "SK-COVID",
          icon: "ic_launcher",
          body: msg || 'ข้อความปกติ'
        }
      });

      sender.sendNoRetry(message, { registrationTokens: regTokens }, (err: any, response: any) => {
        if (err) {
          console.log(err);
          reply.send({ ok: false })
        } else {
          console.log(response);
          reply.send({ ok: true })
        };
      });

    } else {
      reply.send({ ok: false, message: 'ไม่พบผู้ใช้งาน' })
    }


  })


}