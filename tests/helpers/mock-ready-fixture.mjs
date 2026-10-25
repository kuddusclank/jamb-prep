import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const ROOT = process.cwd();

function resolveCandidateFile(basePath) {
  for (const ext of ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.js']) {
    const candidate = basePath + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@supabase/ssr') {
      return {
        url: 'data:text/javascript,export function createBrowserClient() { return {}; } export function createServerClient() { return {}; }',
        shortCircuit: true,
      };
    }
    if (context.parentURL && context.parentURL.includes('/node_modules/')) {
      return nextResolve(specifier, context);
    }
    if (specifier.startsWith('@/')) {
      const target = resolveCandidateFile(path.join(ROOT, 'src', specifier.slice(2)));
      if (target) {
        return nextResolve(pathToFileURL(target).href, context);
      }
    }
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !path.extname(specifier) && context.parentURL) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const target = resolveCandidateFile(path.resolve(parentDir, specifier));
      if (target) {
        return nextResolve(pathToFileURL(target).href, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const raw = fs.readFileSync(fileURLToPath(url), 'utf8');
      return {
        format: 'module',
        shortCircuit: true,
        source: `export default ${raw};`,
      };
    }
    if (url.endsWith('.ts') || url.endsWith('.tsx')) {
      const source = fs.readFileSync(fileURLToPath(url), 'utf8');
      const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
        fileName: fileURLToPath(url),
      });
      return { format: 'module', shortCircuit: true, source: outputText };
    }
    return nextLoad(url, context);
  },
});

export function readySubjectRows(subjects) {
 return subjects.map(subject=>({...subject,blueprint:{id:subject.id,total_questions:subject.is_compulsory?60:40,overlap_limit:.5,difficulty_targets:{medium:100}},cells:[{id:subject.id,code:'fixture',kind:'single',required_count:subject.is_compulsory?60:40,position:0}],candidates:Array.from({length:subject.is_compulsory?60:40},(_,index)=>({id:`${subject.id}-${index}`,cell_id:subject.id,topic_id:'fixture',difficulty:'medium',content_family:`${subject.id}-${index}`,seen:0,previous:false,rank:String(index)}))}));
}
