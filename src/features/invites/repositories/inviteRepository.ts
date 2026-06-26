import type { QueryExecutor } from '@/lib/db/transaction';

export const inviteRepository = {
  async findById(query: QueryExecutor, id: string) {
    const { rows } = await query('SELECT * FROM invites WHERE id = $1 FOR UPDATE', [id]);
    return rows[0] ?? null;
  },

  async findByTokenHash(query: QueryExecutor, tokenHash: string) {
    const { rows } = await query('SELECT * FROM invites WHERE token_hash = $1 FOR UPDATE', [tokenHash]);
    return rows[0] ?? null;
  },

  async insert(
    query: QueryExecutor,
    data: {
      quest_id: string;
      email: string | null;
      token_hash: string;
      invited_by: string;
      expires_at: string;
    }
  ) {
    const { rows } = await query(
      `INSERT INTO invites (quest_id, email, token_hash, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.quest_id, data.email, data.token_hash, data.invited_by, data.expires_at]
    );
    return rows[0];
  },

  async revoke(query: QueryExecutor, id: string) {
    const { rows } = await query(
      'UPDATE invites SET revoked_at = now() WHERE id = $1 RETURNING *',
      [id]
    );
    return rows[0] ?? null;
  },

  async accept(query: QueryExecutor, id: string) {
    const { rows } = await query(
      'UPDATE invites SET accepted_at = now() WHERE id = $1 RETURNING *',
      [id]
    );
    return rows[0] ?? null;
  },
};
