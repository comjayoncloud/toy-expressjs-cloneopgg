// api token을 이용하여 Riot Api서버에서 데이터를 받아오는 코드
// 순서 :
// 1. ID를 통해 정보 검색하여 Puuid 정보 get
// 2. Puuid를 통해 matchid 20개 받아옴
// 3. matchid를 통해 게임 데이터를 받아와서 쓰고 싶은 데이터만 포맷하여 respond

const express = require("express");
const app = express();
const port = 8080;
const request = require("request");
const axios = require("axios");
const { get } = require("request");
const cors = require("cors");

app.use(cors());
app.use(express.json());

const api_token = "RGAPI-c8e65936-6ec1-4437-9f04-b6dcac4b7f31";

//test
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
    } catch (e) {}
  }
  res.json(matchList);
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});

//puuid 받아 오는 함수
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

//matchid 받아 오는 함수 ["1232141","123141421" ... ]
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

// api에서 가져온 데이터를 json 형태로 커스텀마이징 하는 함수
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
