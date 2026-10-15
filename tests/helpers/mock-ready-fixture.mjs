export function readySubjectRows(subjects) {
 return subjects.map(subject=>({...subject,blueprint:{id:subject.id,total_questions:subject.is_compulsory?60:40,overlap_limit:.5,difficulty_targets:{medium:100}},cells:[{id:subject.id,code:'fixture',kind:'single',required_count:subject.is_compulsory?60:40,position:0}],candidates:Array.from({length:subject.is_compulsory?60:40},(_,index)=>({id:`${subject.id}-${index}`,cell_id:subject.id,topic_id:'fixture',difficulty:'medium',content_family:`${subject.id}-${index}`,seen:0,previous:false,rank:String(index)}))}));
}

