
import { generate } from './subtitles.js';
import fs from "fs"
import {mdToPdf} from "md-to-pdf";



const CONFIG = {
    "title": "svenska nyheter", // "lätt nyheter"
    "subtractDays": 0, //0 = today, 1 = yesterday, etc
    "source": "https://ed6.cdn.svt.se/ed12/d0/world/20221021/f02e307f-9032-48b3-bc9d-cc962fac51d8/text/text-0.vtt"
}

var d = new Date();
d.setDate(d.getDate() - CONFIG.subtractDays); // Yesterday?
const s: string = CONFIG.source
const out_s: string = "/"+CONFIG.title.replaceAll(" ","_")+"_"+d.toISOString().slice(0,10)
const vtt = await generate(s)

console.log("result written to" + process.env.OUT_PATH + out_s + ".md")
fs.writeFileSync(
    process.env.OUT_PATH + out_s + ".md" || "",
    "# Translated Subtitles\n"+vtt+"\n\n from "+ s || ""
  );
mdToPdf({path: process.env.OUT_PATH + out_s + ".md" || ""}, {dest: process.env.OUT_PATH + out_s + ".pdf" || ""})
