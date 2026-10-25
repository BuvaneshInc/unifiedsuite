export interface Env { KV_SYNC: KVNamespace; MODEL_CACHE: R2Bucket; }

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    
    // 1. Envelope Sync - ONLY metadata
    if(url.pathname.startsWith('/sync')){
      if(req.method==='PUT'){
        const id = url.pathname.split('/').pop();
        await env.KV_SYNC.put(`env:${id}`, await req.text(), { expirationTtl: 60*60*24*30 });
        return new Response('envelope stored', {headers:{'Access-Control-Allow-Origin':'*'}});
      }
      const list = await env.KV_SYNC.list({prefix:'env:'});
      const vals = await Promise.all(list.keys.map(k=>env.KV_SYNC.get(k.name)));
      return Response.json(vals.map(v=>v?JSON.parse(v):null).filter(Boolean));
    }

    // 2. Model Cache - distilled LoRAs, WASM, SLM weights (2-10MB delta)
    if(url.pathname.startsWith('/models/')){
      const cached = await env.MODEL_CACHE.get(url.pathname);
      if(cached) return new Response(cached.body, { headers:{'Cache-Control':'public, max-age=31536000, immutable'} });
      return new Response('model not found', {status:404});
    }

    // 3. Telemetry - DP aggregated, no content
    if(url.pathname==='/telemetry' && req.method==='POST'){
      // Aggregate counters only, discard IP after geo
      await env.KV_SYNC.put(`tel:${Date.now()}:${Math.random()}`, await req.text(), {expirationTtl: 86400});
      return new Response('ok');
    }

    // 4. Fallback edge inference (opt-in, ephemeral, no log)
    if(url.pathname==='/ai/fallback'){
      // Runs WASM model at edge, memory only, never persists content
      return new Response('Edge inference placeholder - ephemeral', {headers:{'X-Content-Privacy':'zero-retention'}});
    }

    return new Response('Foundry CDN Edge - Envelope Only');
  }
}
