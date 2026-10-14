/** Legacy import compatibility: unknown or ambiguous topics must stop before writes. */
export function resolveExactImportTopic(topics, name) {
 const key=String(name??'').trim().toLowerCase();
 const matches=topics.filter(t=>String(t.title).trim().toLowerCase()===key||String(t.slug).trim().toLowerCase()===key);
 const ids=[...new Set(matches.map(t=>t.id))];
 if(!key||ids.length!==1)throw new Error(`Import topic is ${ids.length>1?'ambiguous':'unknown'}: ${String(name??'').slice(0,160)}. Resolve it through the reviewed admin topic catalogue before importing.`);
 return ids[0];
}
