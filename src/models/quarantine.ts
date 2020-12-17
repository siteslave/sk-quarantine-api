import * as knex from 'knex';

export class Quarantine {

  getList(db: knex, userId: any) {
    return db('quarantine')
      .where('user_id', userId)
      .orderByRaw('serve_date, serve_time')
  }

}