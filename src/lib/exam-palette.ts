export function subjectPalette<T extends {subjectCode:string}>(questions:T[], currentIndex:number) {
 const subject=questions[currentIndex]?.subjectCode;
 return questions.map((question,globalIndex)=>({question,globalIndex})).filter(item=>item.question.subjectCode===subject).map((item,index)=>({...item,number:index+1}));
}
