import type { Metadata } from 'next';
export const SITE_URL = 'https://jambprep.lecterniq.com';
export function pageMetadata(title: string, description: string, path: string, index = false): Metadata {
 const url = `${SITE_URL}${path}`;
 return {title,description,alternates:{canonical:url},robots:{index,follow:true},openGraph:{title:`${title} | JAMBPrep`,description,url,siteName:'JAMBPrep by LecternIQ',type:'website',locale:'en_NG',images:[{url:`${SITE_URL}/og-image.png`,width:1200,height:630,alt:'JAMBPrep by LecternIQ — Prepare with confidence'}]},twitter:{card:'summary_large_image',title:`${title} | JAMBPrep`,description,images:[`${SITE_URL}/og-image.png`]}};
}
