const express = require("express");
const app = express();
const port = 8080;
const request = require("request");
const axios = require("axios");
const { get } = require("request");
const cors = require("cors");

app.use(cors());
app.use(express.json());

app.get("/api/allinfo", async (req, res) => {
  console.log("connected");

  const id = req.query.id;
  console.log(req.query);

  const summoner = await getSummoner(id);

  //
  const matchIdList = await getMatchId(
    `${summoner.puuid}/ids?start=0&count=20` //puuid
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

getSummoner = async (name) => {
  // api - axios ver

  const url = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-name/${name}`;
  const encoded = encodeURI(url);
  // puuid 가져오기
  const summoner = await axios.get(encoded, {
    headers: {
      "X-Riot-Token": "RGAPI-465be5ee-01fd-4d84-b9dc-2f4518c22ce8",
    },
  });
  return summoner.data;
};

//matchid 받아오기 ["1232141","123141421"]
getMatchId = async (puuid) => {
  const matchId = await axios.get(
    `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}`,
    {
      headers: {
        "X-Riot-Token": "RGAPI-465be5ee-01fd-4d84-b9dc-2f4518c22ce8",
      },
    }
  );

  return matchId.data;
};

// 게임 내용정보 얻어와서 json 형태로 내가 맘에들게하는중
getMatch = async (s, summoner) => {
  const matchInfo = await axios.get(
    `https://asia.api.riotgames.com/lol/match/v5/matches/${s}`,
    {
      headers: {
        "X-Riot-Token": "RGAPI-465be5ee-01fd-4d84-b9dc-2f4518c22ce8",
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
    gameType: matchInfo.data.info.gameMode, // 확실
    gameResult: win, // 수정 완료 자기자신
    champName: championName, // 수정완료
    gameStat: stat,
    myTeam: myteamlist,
    notmyTeam: notmyteamlist,
  };
  return allInfo;
};
