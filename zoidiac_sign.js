const { getEnv } = require("./config");
const appUrl = getEnv("APP_URL");
const zodiac_signs = [
  {
    id: "41deecc8-5f25-4dc7-906a-bf8a9ef1281d",
    name:"Aquarius",
    url: appUrl + "/signs/1-Aquarius.png",
    other_url: appUrl + "/signs/signs/1_Aquarius.png",
  },
  {
    id: "6608f780-fd55-47d1-b7e8-fb5ee0c582f3",
    name:"Pisces",
    url: appUrl + "/signs/2-Pisces.png",
    other_url: appUrl + "/signs/signs/2_Pisces.png",
  },
  {
    id: "2fb344f5-1fae-4bce-80a6-715b6be43569",
    name:"Aries",
    url: appUrl + "/signs/3-Aries.png",
    other_url: appUrl + "/signs/signs/3_Aries.png",
  },
  {
    id: "e7260d1b-798a-4410-a0ad-974af4cd5a0b",
    name:"Taurus",
    url: appUrl + "/signs/4-Taurus.png",
    other_url: appUrl + "/signs/signs/4_Taurus.png",
  },
  {
    id: "3bc79c68-65c5-4dd0-bb76-65dcc65c748d",
    name:"Gemini",
    url: appUrl + "/signs/5-Gemini.png",
    other_url: appUrl + "/signs/signs/5_Gemini.png",
  },
  {
    id: "0cd36f07-fc3c-4fb6-a276-8f3dab4e4b6b",
    name:"Cancer",
    url: appUrl + "/signs/6-Cancer.png",
    other_url: appUrl + "/signs/signs/6_Cancer.png",
  },
  {
    id: "820f4dd1-9051-4281-afcc-698234554d80",
    name:"Leo",
    url: appUrl + "/signs/7-Leo.png",
    other_url: appUrl + "/signs/signs/7_Leo.png",
  },
  {
    id: "f8a21333-411d-46b1-b8d3-efa0d3e35941",
    name:"Virgo",
    url: appUrl + "/signs/8-Virgo.png",
    other_url: appUrl + "/signs/signs/8_Virgo.png",
  },
  {
    id: "fab5564d-74e8-46ee-b719-f216af21a642",
    name:"Libra",
    url: appUrl + "/signs/9-Libra.png",
    other_url: appUrl + "/signs/signs/9_Libra.png",
  },
  {
    id: "325ce7c5-4d9d-4e21-962b-d188e58f5df0",
    name:"Scorpio",
    url: appUrl + "/signs/10-Scorpio.png",
    other_url: appUrl + "/signs/signs/10_Scorpio.png",
  },
  {
    id: "325cf7e5-4d9a-4e21-962c-d188f58e5af0",
    name:"Sagittarius",
    url: appUrl + "/signs/11-Sagittarius.png",
    other_url: appUrl + "/signs/signs/11_Sagittarius.png",
  },
  {
    id: "325fa7c5-4d9c-4f21-962a-c184a54f4dd0",
    name:"Capricorn",
    url: appUrl + "/signs/12-Capricorn.png",
    other_url: appUrl + "/signs/signs/12_Capricorn.png",
  },
];

module.exports.zodiac_signs = zodiac_signs;
