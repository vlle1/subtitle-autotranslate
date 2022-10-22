import * as deepl from "deepl-node";
import dotenv from "dotenv";
import readline from "readline";
import fs from "fs";
import { AuthorizationError } from "deepl-node";
dotenv.config(); //set deepl api key!

async function translateSave_SV_EN(text: string[]): Promise<string[] | null> {
  if (process.env.DEEPL_API_KEY === undefined)
    console.warn("DEEPL_API_KEY not set in .env");
  const translator = new deepl.Translator(process.env.DEEPL_API_KEY || "");
  //try to process from known translations:
  const f = fs.readFileSync(
    process.env.KNOWN_TRANSLATIONS_SV_EN_PATH || "",
    "utf8"
  );
  const magic_translations_dict = JSON.parse(f); // format { "sv": "en" }
  var deep: string[] = [];
  var auto: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (magic_translations_dict[text[i]] !== undefined) {
      auto.push(magic_translations_dict[text[i]]);
    } else {
      deep.push(text[i]);
    }
  }
  //then eventually proccess using deepl.
  if (deep.length == 0) {
    console.log("***Known translation*** performed automatically.");
    return auto;
  }
  const deepjoin = deep.join(" ").replaceAll("\n", " ");
  const content_summary =
    deepjoin.length < 70
      ? `»${deepjoin}«`
      : `»${deepjoin.slice(0, 30)} [...] ${deepjoin.slice(-30)}«`;
  const msg: string = `***DEEPL-Assisted-Translation***\nknown: ${
    auto.join(" ").split(/ |\n/gm).length
  } words (${auto.length} elements) \nrequesting: ${
    deep.join(" ").split(/ |\n/gm).length
  } words (${
    deep.length
  } elements): \n${content_summary}\n\nContinue? (y/N/FAKE)`;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(msg, (ans) => {
      rl.close();
      resolve(ans);
    })
  ).then(async (ans) => {
    if (ans === "y" || ans === "FAKE") {
      console.log("TRANSLATING...");
      //translate: separation tags!
      const separator = "<sep/>";
      const deepl_input = deep.join(separator);
      console.log("[DEEPL-LOG] deepl_input", deepl_input);
      const deepl_output: string =
        ans === "FAKE"
          ? await new Promise((resolve) =>
              resolve(
                deepl_input
                  .split(separator)
                  .map((line) => `<EN>${line}</EN>`)
                  .join(separator)
              )
            )
          : (
              await translator.translateText(deepl_input, "sv", "en-US", {
                tagHandling: "xml",
                formality: "prefer_less",
              })
            ).text;
      console.log("[DEEPL-LOG] deepl_output", deepl_output);

      const translate = deepl_output.split(separator);
      for (let i = 0; i < translate.length; i++) {
        const t = translate[i];
        const o = deep[i];
        magic_translations_dict[o] = t;
      }
      //writeback
      fs.writeFileSync(
        process.env.KNOWN_TRANSLATIONS_SV_EN_PATH || "",
        JSON.stringify(magic_translations_dict)
      );
      console.log("[INFO] Added " + translate.length + " translations to dict in" + process.env.KNOWN_TRANSLATIONS_SV_EN_PATH);
      return text.map((t) => magic_translations_dict[t]);
    } else if (ans === "N" || ans === "n") {
      console.log("ABORTED");
      return null;
    } else {
      console.log("Invalid input");
      return translateSave_SV_EN(deep);
    }
  });
}

export { translateSave_SV_EN };
