import type { QueryExecutor } from '@/lib/db/transaction';

export const milestoneRepository = {
  async findById(query: QueryExecutor, id: string) {
    const { rows } = await query('SELECT * FROM milestones WHERE id = $1 FOR UPDATE', [id]);
    return rows[0] ?? null;
  },

  async findMaxPosition(query: QueryExecutor, questId: string) {
    const { rows } = await query(
      'SELECT position FROM milestones WHERE quest_id = $1 ORDER BY position DESC LIMIT 1',
      [questId]
    );
    return rows[0]?.position ?? 0;
  },

  async insert(
    query: QueryExecutor,
    data: { quest_id: string; title: string; position: number; created_by: string }
  ) {
    const { rows } = await query(
      `INSERT INTO milestones (quest_id, title, position, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.quest_id, data.title, data.position, data.created_by]
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
      `UPDATE milestones SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return rows[0] ?? null;
  },

  async updateStatus(
    query: QueryExecutor,
    milestoneId: string,
    status: string
  ) {
    const { rows } = await query(
      'UPDATE milestones SET status = $1 WHERE id = $2 RETURNING *',
      [status, milestoneId]
    );
    return rows[0] ?? null;
  },

  async delete(query: QueryExecutor, id: string) {
    const { rows } = await query('DELETE FROM milestones WHERE id = $1 RETURNING *', [id]);
    return rows[0] ?? null;
  },

  async countActions(query: QueryExecutor, milestoneId: string) {
    const { rows } = await query(
      'SELECT COUNT(*)::int as count FROM actions WHERE milestone_id = $1',
      [milestoneId]
    );
    return rows[0]?.count ?? 0;
  },

  async reindex(query: QueryExecutor, questId: string) {
    const { rows } = await query(
      'SELECT id FROM milestones WHERE quest_id = $1 ORDER BY position ASC',
      [questId]
    );
    for (let i = 0; i < rows.length; i++) {
      await query('UPDATE milestones SET position = $1 WHERE id = $2', [i + 1, rows[i].id]);
    }
  },
};
