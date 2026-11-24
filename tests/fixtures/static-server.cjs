'use strict';
const fs=require('fs'),path=require('path');
module.exports=function handler(root,basePath,requests=[]){return (req,res)=>{
 res.on('finish',()=>requests.push({url:req.url,method:req.method,range:req.headers.range,status:res.statusCode}));
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 if(!pathname.startsWith(basePath)){res.writeHead(404).end();return;}
 const file=path.resolve(root,pathname.slice(basePath.length)||'index.html');
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
 const size=fs.statSync(file).size,type={'.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.webm':'audio/webm','.m4a':'audio/mp4','.png':'image/png'}[path.extname(file)]||'application/octet-stream';
 const headers={'Content-Type':type,'Content-Length':size,'Accept-Ranges':'bytes','Cache-Control':'no-store'};
 let start=0,end=size-1,status=200;
 if(req.headers.range&&!req.headers.range.includes(',')){
  const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if(!m||(!m[1]&&!m[2])){res.writeHead(416,{'Content-Range':'bytes */'+size}).end();return;}
  start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2]));end=m[1]&&m[2]?Math.min(size-1,Number(m[2])):size-1;
  if(start>=size||start>end||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)){res.writeHead(416,{'Content-Range':'bytes */'+size}).end();return;}
  status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;headers['Content-Length']=end-start+1;
 }
 res.writeHead(status,headers);if(req.method==='HEAD'||!size){res.end();return;}fs.createReadStream(file,{start,end}).pipe(res);
};};
