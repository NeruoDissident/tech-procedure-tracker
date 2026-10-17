const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const files=new Set(['index.html','app.js','styles.css','sw.js','icon.svg','manifest.webmanifest']);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(!files.has(name)){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(name)],'Cache-Control':'no-cache'});fs.createReadStream(path.join(__dirname,name)).pipe(res);}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
