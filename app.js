// api token을 이용하여 Riot Api서버에서 데이터를 받아온후 커스텀 마이징 후 노드서버에서 요청시 json 반환
// 순서 :
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

app.use(cors());
app.use(express.json());

const api_token = "RGAPI-a41dc6b5-ab79-49a9-954b-117fc6980ffa";

// get 요청왔을때 respond 하는 함수

app.get("/api/allinfo", async (req, res) => {
  console.log("connected");

  const id = req.query.id;

  const summoner = await getSummoner(id);

  const matchIdList = await getMatchId(
    `${summoner.puuid}/ids?start=0&count=20` //puuid /ids?start=0&count=20`
  );

  const matchList = [];

  for (const matchId of matchIdList) {
    try {
      matchList.push(await getMatch(matchId, summoner));
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

//puuid 요청하는 함수
getSummoner = async (name) => {
  const url = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-name/${name}`;
  const encoded = encodeURI(url);
  const summoner = await axios.get(encoded, {
    headers: {
      "X-Riot-Token": api_token,
    },
  });
  return summoner.data;
};

//matchid 요청하는 함수  ex) ["1232141","123141421" ... ]
getMatchId = async (puuid) => {
  const matchId = await axios.get(
    `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}`,
    {
      headers: {
        "X-Riot-Token": api_token,
      },
    }
  );
  return matchId.data;
};

// riot api 에서 한 아이디에 대해 데이터를 요청 후 데이터를 커스텀마이징
getMatch = async (s, summoner) => {
  const matchInfo = await axios.get(
    `https://asia.api.riotgames.com/lol/match/v5/matches/${s}`,
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
  let myteamlist = [];
  let notmyteamlist = [];

  participants.forEach((x, index) => {
    if (x.puuid == summoner.puuid) {
      championName = x.championName;
      win = x.win ? "승" : "패";
      stat = x.kills + "/" + x.deaths + "/" + x.assists;
    }
  });

  participants.forEach((x, index) => {
    if (x.teamId == "100") {
      myteamlist.push({ champ: x.championName, name: x.summonerName });
    } else if (x.teamId == "200") {
      notmyteamlist.push({ champ: x.championName, name: x.summonerName });
    }
  });

  if (matchInfo.data.info.gameMode == "ARAM") {
    matchInfo.data.info.gameMode = "무작위총력전";
  }

  let allInfo = {
    gameType: matchInfo.data.info.gameMode,
    gameResult: win,
    champName: championName,
    gameStat: stat,
    myTeam: myteamlist,
    notmyTeam: notmyteamlist,
  };
  return allInfo;
};
