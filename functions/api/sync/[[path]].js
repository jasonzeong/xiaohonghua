// 小红花银行 · 同步后端（Pages Function，与 App 同域 xiaohonghua.pages.dev）
// 同源请求：无 CORS、无 workers.dev 国内连通性问题。
// 每个家庭一个随机 id 作为 KV key，数据存为 JSON 文本。
export async function onRequest(context) {
  const { request, env } = context;
  const SYNC = env.SYNC;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  const url = new URL(request.url);
  const sub = url.pathname.replace(/^\/api\/sync\/?/, '');
  try {
    // 创建新家庭：POST /api/sync  -> 返回 {id}
    if (request.method === 'POST' && sub === '') {
      const id = crypto.randomUUID();
      const body = await request.text();
      await SYNC.put(id, body);
      return json({ id: id }, cors);
    }
    // 指定家庭：GET/PUT /api/sync/<code>
    const m = sub.match(/^([a-zA-Z0-9\-]{8,})$/);
    if (!m) return json({ error: 'bad request' }, cors, 400);
    const code = m[1];
    if (request.method === 'GET') {
      const val = await SYNC.get(code);
      if (!val) return json({ error: 'not found' }, cors, 404);
      return new Response(val, {
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
    if (request.method === 'PUT') {
      const body = await request.text();
      await SYNC.put(code, body);
      return json({ ok: true }, cors);
    }
    return new Response('method not allowed', { status: 405, headers: cors });
  } catch (e) {
    return json({ error: String(e) }, cors, 500);
  }
}

function json(obj, cors, status) {
  status = status || 200;
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
