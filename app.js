// api token을 이용하여 Riot Api서버에서 데이터를 받아온후 커스텀 마이징 후 노드서버에서 요청시 json 반환
// 순서 :
// 0. app.get()
// 1. getSummoner()
// 2. getMatchId()
// 3. getMatch()

const express = require("express");
const app = express();
const port = 8080;
const request = require("request");
const axios = require("axios");
const { get } = require("request");
const cors = require("cors");
const { json } = require("express");

app.use(cors());
app.use(express.json());

const api_token = "RGAPI-2fad9422-3366-4af1-8b1c-ad5fd15b1077";

// 0. get 요청 - 미국 서버 데이터
app.get("/america/api/allinfo", async (req, res) => {
  console.log("america api server connected");
  const id = req.query.id;
  var region = ["la1", "americas"];
  const summoner = await getSummoner(id, region[0]);
  const matchIdList = await getMatchId(
    `${summoner.puuid}/ids?start=0&count=20`,
    region[1]
  );

  const matchList = [];

  for (const matchId of matchIdList) {
    try {
      matchList.push(await getMatch(matchId, summoner, region[1]));
    } catch (e) {
      console.log("에러났어요");
    }
  }
  res.header("Access-Control-Allow-Origin", "*");
  res.json(matchList);
});

// 0. get 요청 - 한국 서버 데이터
app.get("/kr/api/allinfo", async (req, res) => {
  console.log("korea api server connected");
  const id = req.query.id;
  var region = ["kr", "asia"];
  const summoner = await getSummoner(id, region[0]);
  const matchIdList = await getMatchId(
    `${summoner.puuid}/ids?start=0&count=20`,
    region[1]
  );

  const matchList = [];

  for (const matchId of matchIdList) {
    try {
      matchList.push(await getMatch(matchId, summoner, region[1]));
    } catch (e) {
      console.log("에러났어요");
    }
  }
  res.header("Access-Control-Allow-Origin", "*");
  res.json(matchList);
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});

// 1. puuid 요청하는 함수
getSummoner = async (name, region) => {
  const url = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${name}`;
  // 인코딩
  const encoded = encodeURI(url);
  const summoner = await axios.get(encoded, {
    headers: {
      "X-Riot-Token": api_token,
    },
  });
  return summoner.data;
};

// 2. 최근전적 20개 matchid 요청하는 함수   ex) ["1232141","123141421" ... ]
getMatchId = async (puuid, region) => {
  const matchId = await axios.get(
    `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}`,
    {
      headers: {
        "X-Riot-Token": api_token,
      },
    }
  );

  return matchId.data;
};

// 3. riot api 에서 한 아이디에 대해 데이터를 요청 후 데이터를 커스텀마이징
getMatch = async (matchId, summoner, region) => {
  const matchInfo = await axios.get(
    `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}`,
    {
      headers: {
        "X-Riot-Token": api_token,
      },
    }
  );
  const participants = matchInfo.data.info.participants;
  let championName = null;
  let win = null;
  let stat = null;
  let kda = null;

  let summonerLevel = null;
  let timePlayed = null;
  let killParticipation = null;
  let summonerCs = null;

  let summonerItem = [];
  let summonerRunes = [];

  let myteamlist = [];
  let notmyteamlist = [];

  // 입력받은 유저의 정보
  participants.forEach((x, index) => {
    if (x.puuid == summoner.puuid) {
      championName = x.championName;
      win = x.win ? "승" : "패";
      stat = x.kills + "/" + x.deaths + "/" + x.assists;
      summonerLevel = x.summonerLevel;
      timePlayed = x.timePlayed;
      killParticipation = Math.round(x.challenges.killParticipation * 100);
      summonerCs = x.totalMinionsKilled;
      kda = x.challenges.kda.toFixed(2);

      summonerItem.push(x.item0);
      summonerItem.push(x.item1);
      summonerItem.push(x.item2);
      summonerItem.push(x.item3);
      summonerItem.push(x.item4);
      summonerItem.push(x.item5);
      summonerItem.push(x.item6);
      summonerRunes.push(x.perks.styles[0].selections[0].perk);
      summonerRunes.push(x.perks.styles[1].style);
    }
  });

  // 우리팀 적팀 구분
  participants.forEach((x, index) => {
    if (x.teamId == "100") {
      myteamlist.push({ champ: x.championName, name: x.summonerName });
    } else if (x.teamId == "200") {
      notmyteamlist.push({ champ: x.championName, name: x.summonerName });
    }
  });

  // 게임모드 영->한
  if (matchInfo.data.info.gameMode == "ARAM") {
    matchInfo.data.info.gameMode = "칼바람나락";
  } else if (matchInfo.data.info.gameMode == "CLASSIC") {
    matchInfo.data.infogameMode = "소환사의 협곡";
  }

  let allInfo = {
    gameType: matchInfo.data.info.gameMode,
    gameResult: win,
    champName: championName,
    summonerLevel: summonerLevel,
    timePlayed: timePlayed,
    summonerItem: summonerItem,
    summonerKda: kda,
    summonerCS: summonerCs,
    summonerRunes: summonerRunes,

    gameStat: stat,
    killParticipation: killParticipation,

    myTeam: myteamlist,
    notmyTeam: notmyteamlist,
  };
  return allInfo;
};

// talk gg 데이터 요청 반환 주소 및 함수
app.get("/talkgg", async (req, res) => {
  console.log("api 서버 연결");
  const data = await getTalkgg();
  res.send(data);
});

getTalkgg = async () => {
  console.log("getApi 실행");
  const url = "https://op.gg/api/v1.0/internal/bypass/community";
  const data = [];
  const dataReq = await axios.get(url);
  data.push(dataReq.data);
  return data[0].data;
};
