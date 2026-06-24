import type { QueryExecutor } from '@/lib/db/transaction';

export const actionRepository = {
  async findById(query: QueryExecutor, id: string) {
    const { rows } = await query('SELECT * FROM actions WHERE id = $1', [id]);
    return rows[0] ?? null;
  },

  async findByMilestone(query: QueryExecutor, milestoneId: string) {
    const { rows } = await query(
      'SELECT status FROM actions WHERE milestone_id = $1',
      [milestoneId]
    );
    return rows;
  },

  async insert(
    query: QueryExecutor,
    data: {
      quest_id: string;
      milestone_id: string;
      title: string;
      description: string | null;
      created_by: string;
    }
  ) {
    const { rows } = await query(
      `INSERT INTO actions (quest_id, milestone_id, title, description, status, owner_id, created_by)
       VALUES ($1, $2, $3, $4, 'open', NULL, $5)
       RETURNING *`,
      [data.quest_id, data.milestone_id, data.title, data.description, data.created_by]
    );
    return rows[0];
  },

  async update(
    query: QueryExecutor,
    id: string,
    data: Record<string, unknown>
  ) {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    values.push(id);
    const { rows } = await query(
      `UPDATE actions SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return rows[0] ?? null;
  },

  async delete(query: QueryExecutor, id: string) {
    const { rows } = await query('DELETE FROM actions WHERE id = $1 RETURNING *', [id]);
    return rows[0] ?? null;
  },
};
