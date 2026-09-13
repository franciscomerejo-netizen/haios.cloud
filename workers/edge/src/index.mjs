const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body, null, 2), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    ...extra
  }
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return json({
        schema_version: 'haios.edge.v1',
        status: 'METHOD_NOT_ALLOWED',
        allowed: ['GET', 'HEAD']
      }, 405, { allow: 'GET, HEAD' });
    }

    if (url.pathname === '/health') {
      return json({
        schema_version: 'haios.edge.health.v1',
        service: 'haios-edge-api',
        state: 'EDGE_HANDLER_RESPONDED',
        runtime_claim_scope: 'this Worker request only',
        timestamp_utc: new Date().toISOString()
      });
    }

    if (url.pathname === '/version') {
      return json({
        schema_version: 'haios.edge.version.v1',
        service: 'haios-edge-api',
        release_channel: 'pre-production',
        architecture: {
          public_web: 'Cloudflare Pages',
          dynamic_edge: 'Cloudflare Workers'
        },
        truth_rule: 'DESIGNED != TESTED != VERIFIED != AUTHORIZED != ACTIVE'
      });
    }

    return json({
      schema_version: 'haios.edge.v1',
      service: 'haios-edge-api',
      status: 'NOT_FOUND',
      endpoints: ['/health', '/version']
    }, 404);
  }
};
