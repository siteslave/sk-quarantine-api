import * as knex from 'knex';

export class FileModel {

  save(db: knex, file: any) {
    return db('image_users')
      .insert(file)
  }

  update(db: knex, userId: any, file: any) {
    return db('image_users')
      .update({ file_name: file })
      .where('user_id', userId)
  }

  getInfo(db: knex, userId: any) {
    return db('image_users')
      .where('user_id', userId)
  }

}