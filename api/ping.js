// GET /api/ping — touche la base (mini-requête) pour éviter la mise en pause Supabase.
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async (req, res) => {
  try {
    await fetch(`${SB}/rest/v1/drivers?select=id&limit=1`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
    });
    res.status(200).json({ ok: true, ts: Date.now() });
  } catch (e) {
    res.status(200).json({ ok: false });
  }
};
