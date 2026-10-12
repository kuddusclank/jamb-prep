import {ApiError} from '../api/errors';
import {readBoundedJsonBody} from '../api/contracts';
import type {RouteDefinition,NativeApiEnv} from '../api/router';
export interface QuestionMediaBucket {
 put(key:string,value:Uint8Array,options:{httpMetadata:{contentType:string}}):Promise<unknown>;
 get(key:string):Promise<{body:ReadableStream;httpEtag:string;httpMetadata?:{contentType?:string}}|null>;
}
export function decodeQuestionImage(encoded:unknown,mime:unknown):Uint8Array {
 if(typeof encoded!=='string'||encoded.length>180000||!['image/png','image/jpeg','image/webp'].includes(String(mime))||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Use a PNG, JPEG or WebP diagram no larger than 128 KB.'});
 let raw:string;try{raw=atob(encoded);}catch{throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Invalid image encoding.'});}
 const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 const png=bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
 const jpg=bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const webp=bytes.length>=12&&new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
 if(bytes.length>131072||!((mime==='image/png'&&png)||(mime==='image/jpeg'&&jpg)||(mime==='image/webp'&&webp)))throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Image content does not match its file type.'});return bytes;
}
export async function serveQuestionMedia(request:Request,env:NativeApiEnv,ctx?:{waitUntil(p:Promise<unknown>):void}):Promise<Response|null> {
 const match=/^\/api\/v1\/media\/([a-f0-9]{64}\.(png|jpeg|webp))$/.exec(new URL(request.url).pathname);if(!match)return null;
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
 if(!env.QUESTION_MEDIA)return new Response(null,{status:503});
 const cache=typeof caches!=='undefined'?(caches as unknown as {default?:Cache}).default:undefined;
 const cacheUrl=new URL(request.url);cacheUrl.search='';const cacheKey=new Request(cacheUrl.href);
 if(cache){try{const hit=await cache.match(cacheKey);if(hit)return request.method==='HEAD'?new Response(null,{headers:hit.headers}):hit;}catch{}}
 if(env.EDGE_RATE_LIMIT && !(await env.EDGE_RATE_LIMIT.limit({key:`media:${request.headers.get('CF-Connecting-IP')??'local'}`})).success)return new Response(null,{status:429});
 let object;try{object=await env.QUESTION_MEDIA.get(match[1]);}catch{return new Response(null,{status:503,headers:{'Retry-After':'3'}});}if(!object)return new Response(null,{status:404});
 const type=`image/${match[2]}`;const response=new Response(request.method==='HEAD'?null:object.body,{headers:{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=31536000, immutable',ETag:object.httpEtag}});
 if(cache&&ctx&&request.method==='GET')ctx.waitUntil(cache.put(cacheKey,response.clone()).catch(()=>{}));
 return response;
}
export const ADMIN_MEDIA_ROUTES:RouteDefinition[]=[{id:'admin.media.upload',method:'POST',pattern:'/api/v1/admin/media',auth:'admin',maxBodyBytes:200000,handler:async ctx=>{
 const {data}=await readBoundedJsonBody(ctx.request,{maxBytes:200000});const input=data as Record<string,unknown>;const bytes=decodeQuestionImage(input.base64,input.mimeType);
 if(!ctx.env.QUESTION_MEDIA)throw new ApiError({status:503,code:'SERVICE_CONFIG_UNAVAILABLE',message:'Diagram storage is unavailable.'});
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer));const key=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('')+'.'+String(input.mimeType).split('/')[1];
 await ctx.env.QUESTION_MEDIA.put(key,bytes,{httpMetadata:{contentType:String(input.mimeType)}});
 await ctx.getDb().sql`INSERT INTO admin_audit_events(actor_id,action,details) VALUES (${ctx.actor!.userId}::uuid,'media.upload',${JSON.stringify({key,bytes:bytes.length})}::jsonb)`;
 const origin=ctx.env.PUBLIC_APP_ORIGIN??'https://jambprep.lecterniq.com';return {status:201,body:{url:`${origin}/api/v1/media/${key}`}};
}}];
