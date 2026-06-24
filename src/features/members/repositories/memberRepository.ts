import type { QueryExecutor } from '@/lib/db/transaction';
import type { MemberRole } from '@/types';

export const memberRepository = {
  async findById(query: QueryExecutor, id: string) {
    const { rows } = await query('SELECT * FROM quest_members WHERE id = $1', [id]);
    return rows[0] ?? null;
  },

  async findByQuestAndUser(query: QueryExecutor, questId: string, userId: string) {
    const { rows } = await query(
      'SELECT * FROM quest_members WHERE quest_id = $1 AND user_id = $2',
      [questId, userId]
    );
    return rows[0] ?? null;
  },

  async insert(
    query: QueryExecutor,
    data: { quest_id: string; user_id: string; role: MemberRole }
  ) {
    const { rows } = await query(
      `INSERT INTO quest_members (quest_id, user_id, role) VALUES ($1, $2, $3) RETURNING *`,
      [data.quest_id, data.user_id, data.role]
    );
    return rows[0];
  },

  async updateRole(query: QueryExecutor, id: string, role: MemberRole) {
    const { rows } = await query(
      'UPDATE quest_members SET role = $1 WHERE id = $2 RETURNING *',
      [role, id]
    );
    return rows[0] ?? null;
  },

  async delete(query: QueryExecutor, id: string) {
    const { rows } = await query('DELETE FROM quest_members WHERE id = $1 RETURNING *', [id]);
    return rows[0] ?? null;
  },
};
