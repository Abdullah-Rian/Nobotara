import fs from 'node:fs'; import path from 'node:path';
import dotenv from 'dotenv'; import { GoogleGenAI } from '@google/genai';
const root=process.cwd(); dotenv.config({path:path.join(root,'.env'),quiet:true});
const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
const dir='docs/video/voiceover';
for (const f of fs.readdirSync(dir).filter(x=>x.endsWith('.mp3')).sort()){
  const r=await ai.models.generateContent({model:'gemini-2.5-flash',contents:[{role:'user',parts:[{inlineData:{mimeType:'audio/mpeg',data:fs.readFileSync(path.join(dir,f)).toString('base64')}},{text:'Transcribe this audio verbatim. Output only the words.'}]}]});
  console.log(f+': '+r.text.trim());
}
