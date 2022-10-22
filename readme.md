# Generate file with translations from subtitles of online videos (for example for SVTplay.se)
## setup:
- [get free deepl api key](https://www.deepl.com/pro-api?cta=header-pro-api/) (Authorization with credit card!)
> npm i
- setup .env in root folder of project:
```
DEEPL_API_KEY = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx
KNOWN_TRANSLATIONS_SV_EN_PATH = ./translations/SV_EN.json
OUT_PATH = ./out
```
## run:
- manually configure source, ... in main.ts
- usually the .vtt resource can be found observing requests using the Network tab of a browser developer console while turning subtitles off and on.
> npm start
