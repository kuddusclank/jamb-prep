/** Optional webpack build fallback for environments that prohibit Turbopack's local IPC port. */
const path = require('node:path');
const { compile } = require('@tailwindcss/node');
const { Scanner } = require('@tailwindcss/oxide');
module.exports = function(source) {
  const callback = this.async();
  const scanner = new Scanner({sources:[{base:this.rootContext,pattern:'src/**/*.{ts,tsx,css}',negated:false}]});
  compile(source,{base:path.dirname(this.resourcePath),from:this.resourcePath,shouldRewriteUrls:true,onDependency:file=>this.addDependency(file)}).then(compiler=>{
    const candidates=scanner.scan();
    for(const file of scanner.files)this.addDependency(file);
    callback(null,compiler.build(candidates));
  }).catch(callback);
};
