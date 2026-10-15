import NotFoundClient from './not-found-client';
import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata('Page not found','This page could not be found. Return to JAMBPrep to continue your preparation.','/404/');
export default function NotFound(){return <NotFoundClient/>;}
