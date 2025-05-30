// BgKifuParser_class.js
"use strict";

class BgKifuParser {
  constructor(kifuEditor, gamesource) {
//console.log("constructor", kifuEditor, gamesource);
    this.kifuEditor = kifuEditor;
    this.globalKifuData = [];
    this.crawford = false;
    this.cubeBefore = 1; // =2^0
    this.gameLines = [];
    let gamelineflag = false;
    let getplayerflag = false;
    let gameCount = 0;
    let lineno = 0;
    const gamesourceArray = gamesource.split("\n");
    for (const line of gamesourceArray) {
      lineno += 1;
      const linetrim = line.trim();
      if (linetrim.match(/point match/)) {
        //this.matchLength = linetrim.substr(0, linetrim.indexOf(" "));
        this.matchLength = Number(linetrim.substring(0, linetrim.indexOf(" ")));
      }
      if (line.substring(0, 6) == " Game ") {
        gameCount += 1;
console.log("Game ", line, lineno);
        this.gameLines.push(lineno);
        gamelineflag = true;
        continue;
      }
      if (gamelineflag && !getplayerflag) {
        this.separateColumn = this.getSeparateColumn(line);
        const ary = BgUtil.insertStr(line, this.separateColumn, ":").split(":");
        const player1 = ary[2].trim();
        const player2 = ary[0].trim();
        this.kifuEditor.playername = [null, player1, player2]; //上位オブジェクトの変数に登録
        gamelineflag = false;
        getplayerflag = true;
      }
    }

    if (gameCount === 0) {
      alert("Error in parseMatchData - no 'Game' lines in file")
      return false;
    }

console.log("gameCount", gameCount);
    for (let game = 0; game < gameCount; game++) {
      const gameobj = this.parseGameData(gamesource, game);
      if (gameobj === false) {
        alert("Error in parseGameData - no gameplay lines");
        return false;
      }
      this.globalKifuData.push(gameobj);
    }
console.log("this.globalKifuData", JSON.stringify(this.globalKifuData));
console.log("this.globalKifuData.length", this.globalKifuData.length);
    this.kifuEditor.gameCount = gameCount; //上位オブジェクトの変数に登録
    return this.globalKifuData;
  }

  getSeparateColumn(line) {
    const sep1 = line.indexOf("    ") + 1;
    const ary = BgUtil.insertStr(line, sep1, ":").split(":");
    const player1 = ary[2].trim();
    const sep2 = line.indexOf(player1) - 2;　//player1の名前の2文字前(tsuneさんの棋譜エディタの出力に対応)
console.log("getSeparateColumn '"+ line + "'", sep1, player1, sep2);
    return sep2;
  }

  parseGameData(gamesource, gameNo) {
    const gamesourceArray = gamesource.split("\n");
    const gameObj = gamesourceArray.slice(this.gameLines[gameNo], this.gameLines[gameNo +1]);

    const playernameline = gameObj[0]; // Contains player names and score
console.log("gameObj.length ", gameObj.length);
console.log("playernameline ", playernameline);
    const ary = BgUtil.insertStr(playernameline, this.separateColumn, ":").split(":");
    const scr1 = Number(ary[3].trim());
    const scr2 = Number(ary[1].trim());
    this.score = [null, scr1, scr2];

    let gameobject = { game: gameNo, score1: scr1, score2: scr2, };

    const blockStart = BgUtil.findLine(gameObj, "1)");
    if (blockStart < 0) {
      return false;
    }

    // Now create serialised plays array
    const gameBlock = gameObj.slice(blockStart, gameObj.length - 1);
console.log("gameBlock", blockStart, gameObj.length);
    let plays = [];
    for (const line of gameBlock) {
      const indexof = line.indexOf(";");
      const pl = indexof >= 0 ? line.substring(0, indexof) : line;
      const st = line.indexOf(")") + 1;
      plays.push(pl.substring(st, this.separateColumn).trim()); //)の次から
      plays.push(pl.substring(this.separateColumn +1).trim()); //player1の名前から--end
    }
    const playobject = this.parsePlay(plays, gameNo);

    gameobject["playObject"] = playobject;
    return gameobject;
  }

  parsePlay(plays, gameno) {
    // Now generate the script from the plays[] elements
    let e, s1, s2, dc, mv, af, xg, po, ac, mode;

    let bf = this.firstXgid();
    let playObject = []; //init _playObject

    let i = 0;
    for (const k of plays) {
      const j = (i % 2 == 0) ? 1 : 2;  //bottom side = 2, top side = 1

      switch( this.chkAction(k) ) {
      case "ROLL":
        mode = "roll";
        e = k.indexOf(":");
        dc = k.substr(e-2,2);
        mv = k.substr(e+1).trim();
        if (mv == "") { mv = "????"; }
        xg = this.nextXgid(bf, j, mode, dc, "", 0); // ロール後(ムーブ前)のXGIDを計算する(解析(move action)に渡す用)
        af = this.nextXgid(bf, j, "move", dc, mv, 0); // ムーブ後のXGIDを計算する(画面表示用)
        ac = mv;
        po = this.makePlayObj(j, mode, dc, mv, 0, xg, af, ac, gameno);
        break;
      case "DOUBLE":
        mode = "offer";
        s1 = k.trim();
        s2 = parseInt(s1.substr(s1.lastIndexOf(" ")));
        xg = this.nextXgid(bf, j, mode, "00", "", this.cubeBefore); //解析(cube action)に渡す用
        af = this.nextXgid(bf, j, mode, "D", "", s2); //画面表示用
        ac = " Doubles => " + s2;
        po = this.makePlayObj(j, mode, "D", "", s2, xg, af, ac, gameno);
        break;
      case "TAKE":
        mode = "take";
        af = xg = this.nextXgid(bf, j, mode, "00", "", s2);
        ac = " Takes";
        po = this.makePlayObj(j, mode, "00", "", s2, xg, af, ac, gameno);
        this.cubeBefore = s2;
        break;
      case "DROP":
        mode = "drop";
        af = xg = this.nextXgid(bf, j, mode, "00", "", this.cubeBefore, true);
        ac = " Drops";
        po = this.makePlayObj(j, mode, "00", "", 0, xg, af, ac, gameno);
        break;
      case "OTHER":
        const dropflag = (mode == "drop"); //ここに来る直前のmodeを確認
        mode = "gameend";
        this.cubeBefore = 1; // =2^0
        af = xg = this.nextXgid(bf, j, mode, "00", "", 0, dropflag);
        const xgtmp = new Xgid(xg);
        //const sc = BgUtil.calcCubeVal(xgtmp.cube); // 3 => 8
        const sc = this.calcGamesetScore(dropflag, xgtmp);
        ac = "wins " + sc + " point";
        po = this.makePlayObj(j, mode, "00", "", 0, xg, af, ac, gameno);
        break;
      default: // "NULL"
        ac = "";
        break;
      }
      if (ac != "") {
         bf = af; //change XGID for next turn
         playObject.push(po);
      }
      i++;
    }
    return playObject;
  }

  makePlayObj(tn, mode, dc, mv, cb, xg, af, disp, gameno) {
    const playobj = {
      "turn": tn,
      "mode": mode,
      "dice": dc,
      "cube": cb,
      "move": mv,
      "bfxgid": xg,
      "xgid": af,
      "disp": disp,
      "gameno": gameno,
    };
    return playobj;
  }

  chkAction(play) {
    const p = play.toLowerCase()
    if (BgUtil.isContain(p,""))       { return "NULL"; }
    if (BgUtil.isContain(p,":"))      { return "ROLL"; }
    if (BgUtil.isContain(p,"double")) { return "DOUBLE"; }
    if (BgUtil.isContain(p,"take"))   { return "TAKE"; }
    if (BgUtil.isContain(p,"drop"))   { return "DROP"; }
    return "OTHER";
  }

  firstXgid() {
    const xgid = new Xgid();
    xgid.position = "-b----E-C---eE---c-e----B-";
    xgid.dice = "00";
    xgid.cube = xgid.cubepos = xgid.turn = 0;
    xgid.crawford = this.crawford;
    xgid.sc_me = this.score[1];
    xgid.sc_yu = this.score[2];
    xgid.matchsc = this.matchLength;
    return xgid.xgidstr;
  }

  nextXgid(bf, tn, ac, dc, mv, cb, dropflag = false) {
    const xgid = new Xgid(bf);
    xgid.turn = BgUtil.cvtTurnKv2xg(tn); //tn==1 -> xgid.turn = -1, tn==2 -> xgid.turn = 1
    switch (ac) {
    case "roll":
      xgid.dice = dc;
      break;
    case "move":
      xgid.dice = dc;
      xgid.position = xgid.getMovedPosition(xgid.position, mv, xgid.turn);
      break;
    case "offer":
      xgid.cube = BgUtil.calcCubeValRev(cb); // 8 => 3
      xgid.cubepos = BgUtil.cvtTurnKv2xg(BgUtil.getBdOppo(tn));
      xgid.dbloffer = true;
      break;
    case "take":
      xgid.dbloffer = false;
      break;
    case "drop":
      xgid.cube = BgUtil.calcCubeValRev(cb); // 8 => 3
      xgid.dbloffer = false;
      break;
    case "gameend":
      const mode = "gameend";
      //const cubevalue = BgUtil.calcCubeVal(cb); // 3 => 8
      const sc = this.calcGamesetScore(dropflag, xgid)
      const winnerscr = (tn == 2) ? xgid.sc_me : xgid.sc_yu;
      const loserscr  = (tn == 2) ? xgid.sc_yu : xgid.sc_me;
      this.crawford = xgid.checkCrawford(winnerscr, sc, loserscr);
      xgid.dice = "00";
      if (tn == 2) { xgid.sc_me = xgid.sc_me + sc; }
      else         { xgid.sc_yu = xgid.sc_yu + sc; }
      break;
    default:
      break;
    }
    return xgid.xgidstr;
  }

  calcGamesetScore(dropflag, xgid) {
    const dice = xgid.dice;
    const cubevalue = BgUtil.calcCubeVal(xgid.cube); // 3 => 8
    const xgscr1 = xgid.get_gamesc(1); //me
    const xgscr2 = xgid.get_gamesc(-1); //yu
    const xgscoreme = xgscr1[0] * xgscr1[1];
    const xgscoreyu = xgscr2[0] * xgscr2[1];
    const score = dropflag ? cubevalue : Math.max(xgscoreme, xgscoreyu);
    return score
  }

}
