export default {
 async fetch(request) {
  const url = new URL(request.url);
  const upstream = new URL(request.url);
  upstream.hostname = url.pathname.startsWith('/api/') ? 'jambprep-api-foundation.abdulquddus-akanbi.workers.dev' : 'jambprep.pages.dev';
  upstream.protocol = 'https:';
  const response = await fetch(new Request(upstream, request), {redirect:'manual'});
  const headers = new Headers(response.headers);
  const location = headers.get('Location');
  if (location) {
   const target = new URL(location, upstream);
   if (target.hostname === 'jambprep.pages.dev') {target.hostname=url.hostname;headers.set('Location',target.href);}
  }
  headers.set('X-Jambprep-Delivery','pages-native-api');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 }
};
