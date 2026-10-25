export class OCRWasm { async extract(f:File){ return [{type:'text', content:{text:'sample'}, style:{bbox:[0,0,100,100]}, provenance:{file:f.name, page:1, confidence:0.98}}]; } }
