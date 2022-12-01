
import { generate } from './subtitles.js';
import fs from "fs"
import {mdToPdf} from "md-to-pdf";
import readline from "readline";
import axios from 'axios';

async function laett_svenska_vtt_url(): Promise<string> {
    //get url for subtitles:
    console.log("guessing vtt url of latest lätt nyheter... :o")
    // 1. Get request to https://www.svtplay.se/nyheter-pa-latt-svenska, search for first occurance of "videoSvtId" and get the value
    const latt_nyheter_url = "https://www.svtplay.se/nyheter-pa-latt-svenska"
    const response = await axios.get(latt_nyheter_url)
    const videoId = response.data.matchAll(/videoSvtId\\":\\"([^\\]*)\\"/gm).next().value[1]
    // 2. Get request to https://api.svt.se/video/<id>, vtt url in [JSON OBJECT].subtitleReferences[0].url
    return vtt_url_from_videoSvtId(videoId)
}
async function vtt_url_from_video_url(videoUrl: string): Promise<string | null> {
  //for example: https://www.svtplay.se/video/ePnYXBD/30-minuter/energi--och-naringsminister-ebba-busch?id=ePnYXBD
  let videoSvtId = videoUrl.matchAll(/www\.svtplay\.se\/video\/([a-zA-Z]*)\//gm).next().value[1]
  if (videoSvtId == null) { return null }
  return vtt_url_from_videoSvtId(videoSvtId)
}
async function programTitle_from_video_url(videoUrl: string): Promise<string|null> {
  let videoSvtId = videoUrl.matchAll(/www\.svtplay\.se\/video\/([a-zA-Z]*)\//gm).next().value[1]
  if (videoSvtId == null) { return null }
  const video_url = "https://api.svt.se/video/" + videoSvtId
  const response2 = await axios.get(video_url)
  const title = response2.data.programTitle
  return title
}
async function vtt_url_from_videoSvtId(videoSvtId: string): Promise<string> {
  const video_url = "https://api.svt.se/video/" + videoSvtId
  const response2 = await axios.get(video_url)
  //console.log(response2.data)
  const vtt_url = response2.data.subtitleReferences[0].url
  return vtt_url
}
async function dateStamp(source: string, fallback_subtractDays: number): Promise<string> {
  //try infer date from url:
  var dateStamp: string 
  const maybeMatch = source.matchAll(/\/(\d\d\d\d)(\d\d)(\d\d)\//gm).next()
  if (maybeMatch.value) {
    dateStamp = maybeMatch.value[1] + "-" + maybeMatch.value[2] + "-" + maybeMatch.value[3]
    console.log("inferring date from url: " + dateStamp)
  } else {
    //use date from subtratcDays
    dateStamp = dateStamp_manual(fallback_subtractDays)
    console.log("using date: " + dateStamp + " from 'subtractDays' config")
  }
  return dateStamp
}
function dateStamp_manual(subtractDays: number): string {
  var d = new Date();
  d.setDate(d.getDate() - subtractDays); // Yesterday?
  try {
    return d.toISOString().slice(0,10)
  } catch (error) {
    return "undated"
  }
  
}
async function execute(c: Config) {
  //get subtitles (and translations):
  const vtt = await generate(c.source)
  if (vtt == null) {
    console.log("could not get subtitles from url: " + c.source)
    return
  }
  //write to markdown and pdf files:
  const out_s: string =  process.env.OUT_PATH + "/"+c.title.replaceAll(" ","_")+"_"+ c.dateStamp
  fs.writeFileSync(
      out_s + ".md" || "",
      "# Translated Subtitles\n"+vtt+"\n\n from "+ c.source || ""
    );
  console.log("result written to " + out_s + ".md")
  mdToPdf({path: out_s + ".md" || ""}, {dest: out_s + ".pdf" || ""})
  console.log("result written to " + out_s + ".pdf")
  //open files:
}

type Config = { title: string, dateStamp: string, source: string }

async function configure_interactive(config: Config): Promise<Config> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(`Welcome to Subtitle-autotranslate. Current Configuration:\n\tTitle: "${config.title}",\n\tDate: ${config.dateStamp} \n\tSource: "${config.source}"\nPress...\n[Enter] continue with translation\n[V] specify a different video\n[D] correct date using manual offset\n[S] set vtt source (inferres date)\n[T] set title\n[Ctrl-C] abort\n`, (ans) => {
      rl.close();
      resolve(ans);
    })
  ).then(async (ans) => {
    const rl2 = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    if (ans === "") {
      rl2.close();
      return config
    }
    if (ans == "D") {
      return new Promise((resolve: (value: string) => void ) =>
        rl2.question(`Enter date offset (days) [0: today, 1: yesterday, ...]:`, (ans2) => {
          rl2.close();
          resolve(ans2);
        })
      ).then(async (ans2: string) => await configure_interactive({ ...config, dateStamp: dateStamp_manual(parseInt(ans2)) })) 
    }
    if (ans === "V") {
      const ans2: string = await new Promise((resolve) =>
        rl2.question(`Enter video url [inferres program name, vtt source and date!]:`, (ans2) => {
          rl2.close();
          resolve(ans2);
        })
      )
      const vtt_url = await vtt_url_from_video_url(ans2)
      const title = (await programTitle_from_video_url(ans2))?.replaceAll(" ","_") || "NO TITLE"
      
      if (vtt_url == null) {
        console.log("could not infer vtt source from video url: " + ans2)
        return await configure_interactive(config)
      }
      return await configure_interactive({ ...config, title: title, source: vtt_url, dateStamp: await dateStamp(vtt_url, NaN) })
    }
    if (ans === "S") {
      const ans2: string = await new Promise((resolve) =>
        rl2.question(`Enter vtt source url [inferres date!]:`, (ans2) => {
          rl2.close();
          resolve(ans2);
        })
      )
      return await configure_interactive({ ...config, source: ans2, dateStamp: await dateStamp(ans2, NaN) })
    }
    if (ans === "T") {
      const ans2: string = await new Promise((resolve) =>
        rl2.question(`Enter title:`, (ans2) => {
          rl2.close();
          resolve(ans2);
        })
      )
      return await configure_interactive({ ...config, title: ans2 })
    } 
    console.log("ERROR - unknown command.")
    rl2.close();
    return await configure_interactive(config)
  });
}
let source: string = "not set"
try {
  source = await laett_svenska_vtt_url()
} catch (error) {
  console.log("could not get vtt url from lätt svenska")
}
const BASE_CONFIG: Config = {
  "title": "lätt nyheter", // "lätt nyheter"
  "dateStamp": await dateStamp(source, NaN), //fallback: 0 = today, 1 = yesterday, etc - only needed if date cannot be inferred from url (/YYYYMMDD/)
  "source": source
}
configure_interactive(BASE_CONFIG).then(execute)
