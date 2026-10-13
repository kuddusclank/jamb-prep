export interface PracticeEvidence {omitted?:number;reviews?:number;difficulty?:Record<string,{answered:number;correct:number}>;sampleSize:number;sessions:number;correct:number;accuracy:number|null;strength:'unassessed'|'early'|'provisional'|'weak'|'developing'|'strong';}
export interface PracticeTopic extends PracticeEvidence {id:string;slug:string;title:string;parentId:string|null;aliases:string[];available:number;}
export interface PracticeSubject extends PracticeEvidence {id:string;code:string;name:string;isCompulsory:boolean;available:number;topics:PracticeTopic[];}
export interface PracticeCatalogue {isPremium:boolean;dailySessionUsed:boolean;sizes:number[];activeSessionId:string|null;subjects:PracticeSubject[];}
