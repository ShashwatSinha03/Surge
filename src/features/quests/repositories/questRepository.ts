import type { QueryExecutor } from '@/lib/db/transaction';

export const questRepository = {
  async insert(
    query: QueryExecutor,
    data: {
      title: string;
      description: string | null;
      template_type: string;
      owner_id: string;
      status: string;
    }
  ) {
    const { rows } = await query(
      `INSERT INTO quests (title, description, template_type, owner_id, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.title, data.description, data.template_type, data.owner_id, data.status]
    );
    return rows[0];
  },
};
