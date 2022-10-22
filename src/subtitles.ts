import { translateSave_SV_EN } from './translate.js';

type Timestamp = {
  startTime: {
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
  };
  endTime: {
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
  };
}
class Subtitle_line {
  constructor(timestamp: Timestamp, text: string, isFirstLine: boolean) {
    this.timestamp = timestamp;
    this.text = text;
    this.isFirstLine = isFirstLine;
  }
  timestamp: Timestamp
  text: string;
  isFirstLine: boolean;
}
class Subtitle_with_translation extends Subtitle_line {
  constructor(timestamp: Timestamp, text: string, translation: string, isFirstLine: boolean) {
    super(timestamp, text, isFirstLine);
    this.translation = translation;
  }
  translation: string;
}
function toSubtitles(vtt: string): Subtitle_line[] {
  //split by \n
  function getSubtitles(match: RegExpMatchArray): Subtitle_line[] {
    const text = match[9];
    return text.split("\n").map((t,idx )=> new Subtitle_line(
      {
        startTime: {
          hours: parseInt(match[1]),
          minutes: parseInt(match[2]),
          seconds: parseInt(match[3]),
          milliseconds: parseInt(match[4]),
        },
        endTime: {
          hours: parseInt(match[5]),
          minutes: parseInt(match[6]),
          seconds: parseInt(match[7]),
          milliseconds: parseInt(match[8]),
        },
      },
      t,
      idx == 0
    ));
  }
  const regex =
    /(\d\d):(\d\d):(\d\d).(\d\d\d) --> (\d\d):(\d\d):(\d\d).(\d\d\d)\n(([^\n]+\n)*[^\n]+)/gm;
  return [...vtt.matchAll(regex)].map(getSubtitles).flat();
}

async function translateAll(subtitles: Subtitle_line[]): Promise<Subtitle_with_translation[]|null> {
  const text = subtitles.map((s) => s.text);
  return translateSave_SV_EN(text).then((translations) => {
    if (translations === null) return null;
    return subtitles.map((s, i) => new Subtitle_with_translation(s.timestamp, s.text, translations[i], s.isFirstLine));
  });
}
function formatSimple(subtitles: Subtitle_with_translation[]): string {
  function pad(num: number, size: number) {
    var num_s: string = num.toString();
    while (num_s.length < size) num_s = "0" + num_s;
    return num_s;
}

  const simpleHeader = "| time | translation | original | \n | ---: | --- | --- |\n";
  return simpleHeader + subtitles.map((s) => `| ${s.isFirstLine ? s.timestamp.startTime.minutes + ":" + pad(s.timestamp.startTime.seconds, 2) : ""} | ${s.translation} | ${s.text} |`).join("\n");
}
async function generate(url: string): Promise<string|null> {
  return fetch(url)
    .then((response) => response.text())
    .then((vtt) => toSubtitles(vtt))
    .then(translateAll)
    .then(t => t === null ? null : formatSimple(t))
}
export { generate };
