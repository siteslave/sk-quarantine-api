import * as knex from 'knex';

export class Quarantine {

  getList(db: knex, userId: any, query: any = null) {
    var sql = db('quarantine')
      .where('user_id', userId);

    if (query) {
      sql.where('temp', '>=', query)
    }

    return sql.orderByRaw('serve_date, serve_time')
  }

  getTempQuery(db: knex, userId: any) {
    return db('quarantine')
      .select('temp')
      .where('user_id', userId)
      .groupBy('temp')
      .orderBy('temp');
  }

  saveTracking(db: knex, data: any) {
    return db('trackings')
      .insert(data);
  }

}