import { useState, useEffect } from "react";

interface Viewport {
  x: number;
  y: number;
}

interface Condition {
  id: number;
  type: string;
  payload: any;
  negated?: boolean;
}

interface CastMember {
  id: number;
  name: string;
  x: number;
  y: number;
  facing: number;
}

interface Command {
  id: number;
  type: string;
  payload: any;
}

interface QuestionOption {
  id: number;
  label: string;
  commands: Command[];
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("darkMode");
      if (saved !== null) {
        return JSON.parse(saved);
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [showImport, setShowImport] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>("");

  const [exportAsCP, setExportAsCP] = useState<boolean>(() => {
    const saved = localStorage.getItem("defaultExportAsCP");
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [isSkippable, setIsSkippable] = useState<boolean>(() => {
    const saved = localStorage.getItem("defaultSkippable");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [eventId, setEventId] = useState<string>(() => {
    const saved = localStorage.getItem("defaultEventId");
    return saved !== null ? JSON.parse(saved) : "{{ModId}}_Event01";
  });

  const [location, setLocation] = useState<string>(() => {
    const saved = localStorage.getItem("defaultLocation");
    return saved !== null ? JSON.parse(saved) : "Railroad";
  });

  const [conditions, setConditions] = useState<Condition[]>([
    {
      id: Date.now(),
      type: "Time",
      payload: { min: 600, max: 1200 },
      negated: false,
    },
  ]);

  const [music, setMusic] = useState<string>("continue");
  const [viewport, setViewport] = useState<Viewport>({ x: -1000, y: -1000 });
  const [cast, setCast] = useState<CastMember[]>([
    { id: Date.now(), name: "farmer", x: 0, y: 0, facing: 0 },
  ]);

  const [timeline, setTimeline] = useState<Command[]>([]);
  const [outputString, setOutputString] = useState<string>("");

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
  }, [isDarkMode]);

  useEffect(() => {
    compileEvent();
  }, [
    eventId,
    location,
    conditions,
    music,
    viewport,
    cast,
    timeline,
    exportAsCP,
    isSkippable,
  ]);

  const compileSingleCommand = (cmd: Command): string => {
    const safeText = cmd.payload.text?.replace(/"/g, '\\"');
    switch (cmd.type) {
      case "speak":
        return `speak ${cmd.payload.actor} \\"${safeText}\\"`;
      case "message":
        return `message \\"${safeText}\\"`;
      case "textAboveHead":
        return `textAboveHead ${cmd.payload.actor} \\"${safeText}\\"`;
      case "move":
        const moveStrs = cmd.payload.movements.map(
          (m: any) => `${m.actor} ${m.x} ${m.y} ${m.facing}`
        );
        return `move ${moveStrs.join(" ")}${
          cmd.payload.isAsync ? " true" : ""
        }`;
      case "viewportMove":
        return `viewport move ${cmd.payload.x} ${cmd.payload.y} ${cmd.payload.duration}`;
      case "pause":
        return `pause ${cmd.payload.duration}`;
      case "faceDirection":
        return `faceDirection ${cmd.payload.actor} ${cmd.payload.facing}${
          cmd.payload.isAsync ? " true" : ""
        }`;
      case "emote":
        return `emote ${cmd.payload.actor} ${cmd.payload.emoteId}${
          cmd.payload.isAsync ? " true" : ""
        }`;
      case "warp":
        return `warp ${cmd.payload.actor} ${cmd.payload.x} ${cmd.payload.y}`;
      case "shake":
        return `shake ${cmd.payload.actor} ${cmd.payload.duration}`;
      case "addTemporaryActor":
        return `addTemporaryActor ${cmd.payload.sprite} ${cmd.payload.w} ${cmd.payload.h} ${cmd.payload.x} ${cmd.payload.y} ${cmd.payload.facing} true Character ${cmd.payload.name}`;
      case "addObject":
        return `addObject ${cmd.payload.x} ${cmd.payload.y} ${cmd.payload.itemId}`;
      case "addBigProp":
        return `addBigProp ${cmd.payload.x} ${cmd.payload.y} ${cmd.payload.itemId}`;
      case "removeObject":
        return `removeObject ${cmd.payload.x} ${cmd.payload.y}`;
      case "removeTemporarySprites":
        return "removeTemporarySprites";
      case "friendship":
        return `friendship ${cmd.payload.actor} ${cmd.payload.amount}`;
      case "addItem":
        return `addItem ${cmd.payload.itemId} ${cmd.payload.count}`;
      case "money":
        return `money ${cmd.payload.amount}`;
      case "mail":
        return `mail ${cmd.payload.letterId}`;
      case "mailReceived":
        return `mailReceived ${cmd.payload.letterId} ${
          cmd.payload.add ? "true" : "false"
        }`;
      case "playSound":
        return `playSound ${cmd.payload.soundId}`;
      case "stopSound":
        return `stopSound ${cmd.payload.soundId}`;
      case "playMusic":
        return `playMusic ${cmd.payload.trackId}`;
      case "stopMusic":
        return "stopMusic";
      case "globalFade":
        return `globalFade${cmd.payload.isAsync ? " 0.007 true" : ""}`;
      case "end":
        return cmd.payload.style;
      case "fork":
        return `fork ${cmd.payload.targetId}`;
      case "question":
        return `question ${cmd.payload.forkId} \\"${
          cmd.payload.prompt
        }#${cmd.payload.options.join("#")}\\"`;
      case "quickQuestion":
        const qqPrompt = `${cmd.payload.prompt}#${cmd.payload.options
          .map((o: QuestionOption) => o.label)
          .join("#")}`;
        const qqBranches = cmd.payload.options
          .map((o: QuestionOption) => {
            return o.commands.map(compileSingleCommand).join("\\\\");
          })
          .join("(break)");
        return `quickQuestion ${qqPrompt}(break)${qqBranches}`;
      case "customAction":
        return cmd.payload.text;
      default:
        return "";
    }
  };

  const compileEvent = () => {
    const conditionsString = conditions
      .map((cond) => {
        const prefix = cond.negated ? "!" : "";
        switch (cond.type) {
          case "Time":
            return `${prefix}Time ${cond.payload.min} ${cond.payload.max}`;
          case "Friendship":
            return `${prefix}Friendship ${cond.payload.actor} ${
              cond.payload.hearts * 250
            }`;
          case "Season":
            return `${prefix}Season ${cond.payload.season}`;
          case "Weather":
            return `${prefix}Weather ${cond.payload.weather}`;
          case "Custom":
            return `${prefix}${cond.payload.text}`;
          default:
            return "";
        }
      })
      .filter((c) => c !== "")
      .join("/");

    let key = `${eventId}`;
    if (conditionsString !== "") key += `/${conditionsString}`;

    let val = `${music}/${viewport.x} ${viewport.y}/`;
    const castString = cast
      .map((actor) => `${actor.name} ${actor.x} ${actor.y} ${actor.facing}`)
      .join(" ");
    val += `${castString}/`;

    if (isSkippable) {
      val += "skippable/";
    }

    const timelineString = timeline.map(compileSingleCommand).join("/");
    const finalEvent = `"${key}": "${val}${timelineString}"`;

    if (exportAsCP) {
      setOutputString(
        `{\n  "Action": "EditData",\n  "Target": "Data/Events/${location}",\n  "Entries": {\n    ${finalEvent}\n  }\n}`
      );
    } else {
      setOutputString(finalEvent);
    }
  };

  const handleSaveDefaults = () => {
    localStorage.setItem("defaultEventId", JSON.stringify(eventId));
    localStorage.setItem("defaultLocation", JSON.stringify(location));
    localStorage.setItem("defaultExportAsCP", JSON.stringify(exportAsCP));
    localStorage.setItem("defaultSkippable", JSON.stringify(isSkippable));
    setIsMenuOpen(false);
    alert(
      "Current Event ID, Target Location, Export Format, and Skippable preference have been saved as your defaults!"
    );
  };

  const parseSingleCommandString = (
    cmdStr: string,
    index: number
  ): Command | null => {
    const ts = Date.now() + index;
    if (!cmdStr) return null;

    if (cmdStr.startsWith("speak ")) {
      const firstSpace = cmdStr.indexOf(" ");
      const secondSpace = cmdStr.indexOf(" ", firstSpace + 1);
      const actor = cmdStr.substring(firstSpace + 1, secondSpace);
      const text = cmdStr.substring(secondSpace + 1).replace(/^\\"|\\"$/g, "");
      return { id: ts, type: "speak", payload: { actor, text } };
    } else if (cmdStr.startsWith("message ")) {
      const text = cmdStr.substring(8).replace(/^\\"|\\"$/g, "");
      return { id: ts, type: "message", payload: { text } };
    } else if (cmdStr.startsWith("textAboveHead ")) {
      const firstSpace = cmdStr.indexOf(" ");
      const secondSpace = cmdStr.indexOf(" ", firstSpace + 1);
      const actor = cmdStr.substring(firstSpace + 1, secondSpace);
      const text = cmdStr.substring(secondSpace + 1).replace(/^\\"|\\"$/g, "");
      return { id: ts, type: "textAboveHead", payload: { actor, text } };
    } else if (cmdStr.startsWith("viewport move ")) {
      const parts = cmdStr.split(" ");
      return {
        id: ts,
        type: "viewportMove",
        payload: {
          x: parseInt(parts[2]) || 0,
          y: parseInt(parts[3]) || 0,
          duration: parseInt(parts[4]) || 1000,
        },
      };
    } else if (cmdStr.startsWith("addTemporaryActor ")) {
      const parts = cmdStr.split(" ");
      return {
        id: ts,
        type: "addTemporaryActor",
        payload: {
          sprite: parts[1],
          w: parseInt(parts[2]) || 16,
          h: parseInt(parts[3]) || 32,
          x: parseInt(parts[4]) || 0,
          y: parseInt(parts[5]) || 0,
          facing: parseInt(parts[6]) || 2,
          name: parts[9] || parts[1],
        },
      };
    } else if (cmdStr.startsWith("addObject ")) {
      const parts = cmdStr.split(" ");
      return {
        id: ts,
        type: "addObject",
        payload: {
          x: parseInt(parts[1]) || 0,
          y: parseInt(parts[2]) || 0,
          itemId: parts[3] || "0",
        },
      };
    } else if (cmdStr.startsWith("addBigProp ")) {
      const parts = cmdStr.split(" ");
      return {
        id: ts,
        type: "addBigProp",
        payload: {
          x: parseInt(parts[1]) || 0,
          y: parseInt(parts[2]) || 0,
          itemId: parts[3] || "0",
        },
      };
    } else if (
      cmdStr.startsWith("removeObject ") ||
      cmdStr.startsWith("removeSprite ")
    ) {
      const parts = cmdStr.split(" ");
      return {
        id: ts,
        type: "removeObject",
        payload: { x: parseInt(parts[1]) || 0, y: parseInt(parts[2]) || 0 },
      };
    } else if (cmdStr === "removeTemporarySprites") {
      return { id: ts, type: "removeTemporarySprites", payload: {} };
    } else if (cmdStr.startsWith("mail ")) {
      const parts = cmdStr.split(" ");
      return { id: ts, type: "mail", payload: { letterId: parts[1] || "" } };
    } else if (cmdStr.startsWith("mailReceived ")) {
      const parts = cmdStr.split(" ");
      return {
        id: ts,
        type: "mailReceived",
        payload: { letterId: parts[1] || "", add: parts[2] !== "false" },
      };
    } else if (cmdStr.startsWith("move ")) {
      const parts = cmdStr.split(" ");
      const isAsync = parts[parts.length - 1] === "true";
      const limit = isAsync ? parts.length - 1 : parts.length;
      const movements = [];
      for (let j = 1; j < limit; j += 4) {
        if (parts[j]) {
          movements.push({
            actor: parts[j],
            x: parseInt(parts[j + 1]) || 0,
            y: parseInt(parts[j + 2]) || 0,
            facing: parseInt(parts[j + 3]) || 0,
          });
        }
      }
      return {
        id: ts,
        type: "move",
        payload: {
          movements:
            movements.length > 0
              ? movements
              : [{ actor: "", x: 0, y: 0, facing: 0 }],
          isAsync,
        },
      };
    } else if (cmdStr.startsWith("pause ")) {
      const parts = cmdStr.split(" ");
      return {
        id: ts,
        type: "pause",
        payload: { duration: parseInt(parts[1]) || 1000 },
      };
    } else if (cmdStr.startsWith("faceDirection ")) {
      const parts = cmdStr.split(" ");
      const isAsync = parts[parts.length - 1] === "true";
      return {
        id: ts,
        type: "faceDirection",
        payload: { actor: parts[1], facing: parseInt(parts[2]) || 0, isAsync },
      };
    } else if (cmdStr.startsWith("warp ")) {
      const parts = cmdStr.split(" ");
      return {
        id: ts,
        type: "warp",
        payload: {
          actor: parts[1],
          x: parseInt(parts[2]) || 0,
          y: parseInt(parts[3]) || 0,
        },
      };
    } else if (cmdStr.startsWith("shake ")) {
      const parts = cmdStr.split(" ");
      return {
        id: ts,
        type: "shake",
        payload: { actor: parts[1], duration: parseInt(parts[2]) || 1000 },
      };
    } else if (cmdStr.startsWith("emote ")) {
      const parts = cmdStr.split(" ");
      const isAsync = parts[parts.length - 1] === "true";
      return {
        id: ts,
        type: "emote",
        payload: { actor: parts[1], emoteId: parseInt(parts[2]) || 8, isAsync },
      };
    } else if (cmdStr.startsWith("friendship ")) {
      const parts = cmdStr.split(" ");
      return {
        id: ts,
        type: "friendship",
        payload: { actor: parts[1], amount: parseInt(parts[2]) || 250 },
      };
    } else if (cmdStr.startsWith("addItem ")) {
      const parts = cmdStr.split(" ");
      return {
        id: ts,
        type: "addItem",
        payload: { itemId: parts[1] || "", count: parseInt(parts[2]) || 1 },
      };
    } else if (cmdStr.startsWith("money ")) {
      const parts = cmdStr.split(" ");
      return {
        id: ts,
        type: "money",
        payload: { amount: parseInt(parts[1]) || 0 },
      };
    } else if (cmdStr.startsWith("playSound ")) {
      return {
        id: ts,
        type: "playSound",
        payload: { soundId: cmdStr.substring(10) },
      };
    } else if (cmdStr.startsWith("stopSound ")) {
      return {
        id: ts,
        type: "stopSound",
        payload: { soundId: cmdStr.substring(10) },
      };
    } else if (cmdStr.startsWith("playMusic ")) {
      return {
        id: ts,
        type: "playMusic",
        payload: { trackId: cmdStr.substring(10) },
      };
    } else if (cmdStr === "stopMusic") {
      return { id: ts, type: "stopMusic", payload: {} };
    } else if (cmdStr.startsWith("globalFade")) {
      const parts = cmdStr.split(" ");
      const isAsync = parts[parts.length - 1] === "true";
      return { id: ts, type: "globalFade", payload: { isAsync } };
    } else if (cmdStr.startsWith("end")) {
      return { id: ts, type: "end", payload: { style: cmdStr } };
    } else if (cmdStr.startsWith("fork ")) {
      const parts = cmdStr.split(" ");
      return { id: ts, type: "fork", payload: { targetId: parts[1] } };
    } else if (cmdStr.startsWith("question ")) {
      const firstSpace = cmdStr.indexOf(" ");
      const secondSpace = cmdStr.indexOf(" ", firstSpace + 1);
      const forkId = cmdStr.substring(firstSpace + 1, secondSpace);
      const textBlock = cmdStr
        .substring(secondSpace + 1)
        .replace(/^\\"|\\"$/g, "");
      const parts = textBlock.split("#");
      return {
        id: ts,
        type: "question",
        payload: { forkId, prompt: parts[0], options: parts.slice(1) },
      };
    } else if (cmdStr.startsWith("quickQuestion ")) {
      const content = cmdStr.substring(14);
      const branchParts = content.split("(break)");
      const headerParts = branchParts[0].split("#");
      const prompt = headerParts[0];
      const options: QuestionOption[] = [];

      for (let i = 1; i < headerParts.length; i++) {
        const branchStr = branchParts[i] || "";
        const rawNested = branchStr.split(/\\\\|\\/).filter((x) => x);
        const parsedNested = rawNested
          .map((rn, rIndex) => parseSingleCommandString(rn.trim(), rIndex))
          .filter((x) => x !== null) as Command[];
        options.push({
          id: ts + i * 1000,
          label: headerParts[i],
          commands: parsedNested,
        });
      }
      return { id: ts, type: "quickQuestion", payload: { prompt, options } };
    } else {
      return { id: ts, type: "customAction", payload: { text: cmdStr } };
    }
  };

  const handleImport = () => {
    try {
      let rawText = importText.trim();

      if (rawText.startsWith("{") && rawText.endsWith("}")) {
        rawText = rawText.slice(1, -1).trim();
      }

      const parts = rawText.split('": "');
      if (parts.length < 2) {
        alert(
          'Invalid format! Please paste a full line like: "EventID/Time 600": "music/viewport/cast/commands..."'
        );
        return;
      }

      let rawKey = parts[0].replace(/^"/, "").trim();
      let rawScript = parts[1].replace(/,$/, "").replace(/"$/, "").trim();

      const keyTokens = rawKey.split("/");
      setEventId(keyTokens[0] || "Imported_Event");

      const parsedConditions: Condition[] = [];
      for (let i = 1; i < keyTokens.length; i++) {
        let p = keyTokens[i].trim();
        if (!p) continue;

        const isNegated = p.startsWith("!");
        const pCore = isNegated ? p.substring(1).trim() : p;

        if (pCore.startsWith("Time ") || pCore.startsWith("t ")) {
          const partsArray = pCore.split(" ");
          parsedConditions.push({
            id: Date.now() + i,
            type: "Time",
            payload: {
              min: parseInt(partsArray[1]),
              max: parseInt(partsArray[2]),
            },
            negated: isNegated,
          });
        } else if (pCore.startsWith("Friendship ") || pCore.startsWith("f ")) {
          const partsArray = pCore.split(" ");
          parsedConditions.push({
            id: Date.now() + i,
            type: "Friendship",
            payload: {
              actor: partsArray[1],
              hearts: Math.floor(parseInt(partsArray[2]) / 250),
            },
            negated: isNegated,
          });
        } else if (pCore.startsWith("Season ") || pCore.startsWith("z ")) {
          const partsArray = pCore.split(" ");
          parsedConditions.push({
            id: Date.now() + i,
            type: "Season",
            payload: { season: partsArray[1] },
            negated: isNegated,
          });
        } else if (pCore.startsWith("Weather ") || pCore.startsWith("w ")) {
          const partsArray = pCore.split(" ");
          parsedConditions.push({
            id: Date.now() + i,
            type: "Weather",
            payload: { weather: partsArray[1] },
            negated: isNegated,
          });
        } else if (pCore.startsWith("Spouse ") || pCore.startsWith("O ")) {
          const partsArray = pCore.split(" ");
          parsedConditions.push({
            id: Date.now() + i,
            type: "Custom",
            payload: { text: `Spouse ${partsArray[1]}` },
            negated: isNegated,
          });
        } else {
          parsedConditions.push({
            id: Date.now() + i,
            type: "Custom",
            payload: { text: pCore },
            negated: isNegated,
          });
        }
      }
      setConditions(parsedConditions);

      const scriptTokens: string[] = [];
      let currentToken = "";
      let inQuotes = false;

      for (let i = 0; i < rawScript.length; i++) {
        const char = rawScript[i];
        const prevChar = i > 0 ? rawScript[i - 1] : "";
        if (char === '"' && prevChar === "\\") {
          inQuotes = !inQuotes;
        }
        if (char === "/" && !inQuotes) {
          scriptTokens.push(currentToken.trim());
          currentToken = "";
        } else {
          currentToken += char;
        }
      }
      if (currentToken) scriptTokens.push(currentToken.trim());

      if (scriptTokens.length >= 3) {
        setMusic(scriptTokens[0]);
        const vp = scriptTokens[1].split(" ");
        setViewport({ x: parseInt(vp[0]) || 0, y: parseInt(vp[1]) || 0 });

        const castList = scriptTokens[2].split(" ").filter((x) => x);
        const parsedCast: CastMember[] = [];
        for (let i = 0; i < castList.length; i += 4) {
          if (castList[i]) {
            parsedCast.push({
              id: Date.now() + i,
              name: castList[i],
              x: parseInt(castList[i + 1]) || 0,
              y: parseInt(castList[i + 2]) || 0,
              facing: parseInt(castList[i + 3]) || 0,
            });
          }
        }
        setCast(parsedCast);

        const parsedTimeline: Command[] = [];
        let foundSkippable = false;

        for (let i = 3; i < scriptTokens.length; i++) {
          const cmdStr = scriptTokens[i];
          if (cmdStr === "skippable") {
            foundSkippable = true;
            continue;
          }
          const parsedCmd = parseSingleCommandString(cmdStr, i);
          if (parsedCmd) {
            parsedTimeline.push(parsedCmd);
          }
        }
        setTimeline(parsedTimeline);
        setIsSkippable(foundSkippable);
        setShowImport(false);
        setImportText("");
        alert("Event successfully imported!");
      }
    } catch (error) {
      console.error(error);
      alert(
        "Failed to parse event. Make sure it matches the exact Stardew Valley JSON format."
      );
    }
  };

  const handleReset = () => {
    if (
      window.confirm(
        "Are you sure you want to clear the entire event? This cannot be undone."
      )
    ) {
      const savedEventId = localStorage.getItem("defaultEventId");
      const savedLocation = localStorage.getItem("defaultLocation");
      const savedExportAsCP = localStorage.getItem("defaultExportAsCP");
      const savedSkippable = localStorage.getItem("defaultSkippable");

      setEventId(
        savedEventId !== null ? JSON.parse(savedEventId) : "{{ModId}}_Event01"
      );
      setLocation(
        savedLocation !== null ? JSON.parse(savedLocation) : "Railroad"
      );
      setExportAsCP(
        savedExportAsCP !== null ? JSON.parse(savedExportAsCP) : false
      );
      setIsSkippable(
        savedSkippable !== null ? JSON.parse(savedSkippable) : true
      );

      setConditions([
        {
          id: Date.now(),
          type: "Time",
          payload: { min: 600, max: 1200 },
          negated: false,
        },
      ]);
      setMusic("continue");
      setViewport({ x: -1000, y: -1000 });
      setCast([{ id: Date.now(), name: "farmer", x: 0, y: 0, facing: 0 }]);
      setTimeline([]);
      setImportText("");
      setShowImport(false);
    }
  };

  const addCondition = (type: string) => {
    let payload: any = {};
    switch (type) {
      case "Time":
        payload = { min: 600, max: 2600 };
        break;
      case "Friendship":
        payload = { actor: cast.length > 1 ? cast[1].name : "", hearts: 1 };
        break;
      case "Season":
        payload = { season: "Spring" };
        break;
      case "Weather":
        payload = { weather: "sunny" };
        break;
      case "Custom":
        payload = { text: "" };
        break;
      default:
        break;
    }
    setConditions([
      ...conditions,
      { id: Date.now(), type, payload, negated: false },
    ]);
  };

  const updateCondition = (id: number, field: string, value: any) => {
    setConditions(
      conditions.map((cond) =>
        cond.id === id
          ? { ...cond, payload: { ...cond.payload, [field]: value } }
          : cond
      )
    );
  };

  const toggleConditionNegation = (id: number, negated: boolean) => {
    setConditions(
      conditions.map((cond) => (cond.id === id ? { ...cond, negated } : cond))
    );
  };

  const removeCondition = (id: number) => {
    setConditions(conditions.filter((cond) => cond.id !== id));
  };

  const addCastMember = () =>
    setCast([
      ...cast,
      { id: Date.now(), name: "NewActor", x: 0, y: 0, facing: 2 },
    ]);

  const updateCastMember = (id: number, field: string, value: any) =>
    setCast(cast.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const removeCastMember = (id: number) => {
    if (cast.find((c) => c.id === id)?.name === "farmer") return;
    setCast(cast.filter((c) => c.id !== id));
  };

  const getDefaultPayloadForType = (type: string) => {
    const defaultActor = cast.length > 0 ? cast[0].name : "";
    switch (type) {
      case "speak":
        return { actor: defaultActor, text: "" };
      case "message":
        return { text: "" };
      case "textAboveHead":
        return { actor: defaultActor, text: "" };
      case "move":
        return {
          movements: [{ actor: defaultActor, x: 0, y: 0, facing: 2 }],
          isAsync: false,
        };
      case "viewportMove":
        return { x: 1, y: 1, duration: 1000 };
      case "pause":
        return { duration: 1000 };
      case "faceDirection":
        return { actor: defaultActor, facing: 2, isAsync: false };
      case "emote":
        return { actor: defaultActor, emoteId: 8, isAsync: false };
      case "warp":
        return { actor: defaultActor, x: 0, y: 0 };
      case "shake":
        return { actor: defaultActor, duration: 1000 };
      case "addTemporaryActor":
        return {
          sprite: "ActorName",
          w: 16,
          h: 32,
          x: 0,
          y: 0,
          facing: 2,
          name: "ActorName",
        };
      case "addObject":
        return { x: 0, y: 0, itemId: "0" };
      case "addBigProp":
        return { x: 0, y: 0, itemId: "0" };
      case "removeObject":
        return { x: 0, y: 0 };
      case "removeTemporarySprites":
        return {};
      case "friendship":
        return { actor: defaultActor, amount: 250 };
      case "addItem":
        return { itemId: "0", count: 1 };
      case "money":
        return { amount: 100 };
      case "mail":
        return { letterId: "" };
      case "mailReceived":
        return { letterId: "", add: true };
      case "playSound":
        return { soundId: "" };
      case "stopSound":
        return { soundId: "" };
      case "playMusic":
        return { trackId: "" };
      case "stopMusic":
        return {};
      case "end":
        return { style: "end" };
      case "fork":
        return { targetId: "EventID" };
      case "question":
        return { forkId: "null", prompt: "", options: ["Yes", "No"] };
      case "quickQuestion":
        return {
          prompt: "",
          options: [
            { id: Date.now() + 1, label: "Option 1", commands: [] },
            { id: Date.now() + 2, label: "Option 2", commands: [] },
          ],
        };
      case "customAction":
        return { text: "" };
      case "globalFade":
        return { isAsync: false };
      default:
        return {};
    }
  };

  const insertCommand = (type: string, index: number) => {
    const newCommand: Command = {
      id: Date.now(),
      type,
      payload: getDefaultPayloadForType(type),
    };
    const newTimeline = [...timeline];
    newTimeline.splice(index, 0, newCommand);
    setTimeline(newTimeline);
  };

  const updateCommand = (id: number, field: string, value: any) =>
    setTimeline(
      timeline.map((cmd) =>
        cmd.id === id
          ? { ...cmd, payload: { ...cmd.payload, [field]: value } }
          : cmd
      )
    );

  const moveCommand = (index: number, direction: number) => {
    if (index + direction < 0 || index + direction >= timeline.length) return;
    const newTimeline = [...timeline];
    const temp = newTimeline[index];
    newTimeline[index] = newTimeline[index + direction];
    newTimeline[index + direction] = temp;
    setTimeline(newTimeline);
  };

  const removeCommand = (id: number) =>
    setTimeline(timeline.filter((cmd) => cmd.id !== id));

  const insertNestedCommand = (
    cmdId: number,
    optionId: number,
    type: string,
    index: number
  ) => {
    setTimeline(
      timeline.map((cmd) => {
        if (cmd.id === cmdId && cmd.type === "quickQuestion") {
          return {
            ...cmd,
            payload: {
              ...cmd.payload,
              options: cmd.payload.options.map((opt: QuestionOption) => {
                if (opt.id === optionId) {
                  const newCmd = {
                    id: Date.now(),
                    type,
                    payload: getDefaultPayloadForType(type),
                  };
                  const newCmds = [...opt.commands];
                  newCmds.splice(index, 0, newCmd);
                  return { ...opt, commands: newCmds };
                }
                return opt;
              }),
            },
          };
        }
        return cmd;
      })
    );
  };

  const updateNestedCommand = (
    cmdId: number,
    optionId: number,
    nestedCmdId: number,
    field: string,
    value: any
  ) => {
    setTimeline(
      timeline.map((cmd) => {
        if (cmd.id === cmdId && cmd.type === "quickQuestion") {
          return {
            ...cmd,
            payload: {
              ...cmd.payload,
              options: cmd.payload.options.map((opt: QuestionOption) => {
                if (opt.id === optionId) {
                  return {
                    ...opt,
                    commands: opt.commands.map((nCmd) =>
                      nCmd.id === nestedCmdId
                        ? {
                            ...nCmd,
                            payload: { ...nCmd.payload, [field]: value },
                          }
                        : nCmd
                    ),
                  };
                }
                return opt;
              }),
            },
          };
        }
        return cmd;
      })
    );
  };

  const moveNestedCommand = (
    cmdId: number,
    optionId: number,
    index: number,
    direction: number
  ) => {
    setTimeline(
      timeline.map((cmd) => {
        if (cmd.id === cmdId && cmd.type === "quickQuestion") {
          return {
            ...cmd,
            payload: {
              ...cmd.payload,
              options: cmd.payload.options.map((opt: QuestionOption) => {
                if (opt.id === optionId) {
                  if (
                    index + direction < 0 ||
                    index + direction >= opt.commands.length
                  )
                    return opt;
                  const newCmds = [...opt.commands];
                  const temp = newCmds[index];
                  newCmds[index] = newCmds[index + direction];
                  newCmds[index + direction] = temp;
                  return { ...opt, commands: newCmds };
                }
                return opt;
              }),
            },
          };
        }
        return cmd;
      })
    );
  };

  const removeNestedCommand = (
    cmdId: number,
    optionId: number,
    nestedCmdId: number
  ) => {
    setTimeline(
      timeline.map((cmd) => {
        if (cmd.id === cmdId && cmd.type === "quickQuestion") {
          return {
            ...cmd,
            payload: {
              ...cmd.payload,
              options: cmd.payload.options.map((opt: QuestionOption) => {
                if (opt.id === optionId) {
                  return {
                    ...opt,
                    commands: opt.commands.filter(
                      (nCmd) => nCmd.id !== nestedCmdId
                    ),
                  };
                }
                return opt;
              }),
            },
          };
        }
        return cmd;
      })
    );
  };

  const addOptionToQuickQuestion = (cmdId: number) => {
    setTimeline(
      timeline.map((cmd) => {
        if (cmd.id === cmdId && cmd.type === "quickQuestion") {
          return {
            ...cmd,
            payload: {
              ...cmd.payload,
              options: [
                ...cmd.payload.options,
                { id: Date.now(), label: "New Option", commands: [] },
              ],
            },
          };
        }
        return cmd;
      })
    );
  };

  const updateOptionLabel = (
    cmdId: number,
    optionId: number,
    value: string
  ) => {
    setTimeline(
      timeline.map((cmd) => {
        if (cmd.id === cmdId && cmd.type === "quickQuestion") {
          return {
            ...cmd,
            payload: {
              ...cmd.payload,
              options: cmd.payload.options.map((opt: QuestionOption) =>
                opt.id === optionId ? { ...opt, label: value } : opt
              ),
            },
          };
        }
        return cmd;
      })
    );
  };

  const removeOptionFromQuickQuestion = (cmdId: number, optionId: number) => {
    setTimeline(
      timeline.map((cmd) => {
        if (cmd.id === cmdId && cmd.type === "quickQuestion") {
          return {
            ...cmd,
            payload: {
              ...cmd.payload,
              options: cmd.payload.options.filter(
                (opt: QuestionOption) => opt.id !== optionId
              ),
            },
          };
        }
        return cmd;
      })
    );
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputString);
    alert("Event copied to clipboard!");
  };

  const renderConditionInputs = (cond: Condition) => {
    switch (cond.type) {
      case "Time":
        return (
          <div className="flex items-center gap-2">
            <span>Between</span>
            <input
              type="number"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-20 rounded"
              value={cond.payload.min}
              onChange={(e) =>
                updateCondition(cond.id, "min", Number(e.target.value))
              }
            />
            <span>and</span>
            <input
              type="number"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-20 rounded"
              value={cond.payload.max}
              onChange={(e) =>
                updateCondition(cond.id, "max", Number(e.target.value))
              }
            />
          </div>
        );
      case "Friendship":
        return (
          <div className="flex items-center gap-2">
            <span>Actor:</span>
            <select
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 rounded"
              value={cond.payload.actor}
              onChange={(e) =>
                updateCondition(cond.id, "actor", e.target.value)
              }
            >
              <option value="">Select...</option>
              {cast
                .filter((c) => c.name !== "farmer")
                .map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
            </select>
            <span>Needs</span>
            <input
              type="number"
              min="1"
              max="14"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cond.payload.hearts}
              onChange={(e) =>
                updateCondition(cond.id, "hearts", Number(e.target.value))
              }
            />
            <span>Hearts</span>
          </div>
        );
      case "Season":
        return (
          <div className="flex items-center gap-2">
            <span>Must be:</span>
            <select
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 rounded"
              value={cond.payload.season}
              onChange={(e) =>
                updateCondition(cond.id, "season", e.target.value)
              }
            >
              <option value="Spring">Spring</option>
              <option value="Summer">Summer</option>
              <option value="Fall">Fall</option>
              <option value="Winter">Winter</option>
            </select>
          </div>
        );
      case "Weather":
        return (
          <div className="flex items-center gap-2">
            <span>Must be:</span>
            <select
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 rounded"
              value={cond.payload.weather}
              onChange={(e) =>
                updateCondition(cond.id, "weather", e.target.value)
              }
            >
              <option value="sunny">Sunny</option>
              <option value="rainy">Rainy</option>
            </select>
          </div>
        );
      case "Custom":
        return (
          <div className="flex items-center gap-2 w-full">
            <span>Raw String:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 rounded flex-grow"
              value={cond.payload.text}
              onChange={(e) => updateCondition(cond.id, "text", e.target.value)}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const renderCommandInputs = (
    cmd: Command,
    isNested: boolean = false,
    parentOptionId?: number,
    parentCmdId?: number
  ) => {
    const actorDropdown = (
      <select
        className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 mx-2 rounded"
        value={cmd.payload.actor}
        onChange={(e) =>
          isNested
            ? updateNestedCommand(
                parentCmdId!,
                parentOptionId!,
                cmd.id,
                "actor",
                e.target.value
              )
            : updateCommand(cmd.id, "actor", e.target.value)
        }
      >
        {cast.map((c) => (
          <option key={c.id} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
    );

    const facingDropdown = (
      <select
        className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 mx-2 rounded"
        value={cmd.payload.facing}
        onChange={(e) =>
          isNested
            ? updateNestedCommand(
                parentCmdId!,
                parentOptionId!,
                cmd.id,
                "facing",
                Number(e.target.value)
              )
            : updateCommand(cmd.id, "facing", Number(e.target.value))
        }
      >
        <option value={0}>Up</option>
        <option value={1}>Right</option>
        <option value={2}>Down</option>
        <option value={3}>Left</option>
      </select>
    );

    switch (cmd.type) {
      case "speak":
        return (
          <div className="flex flex-col gap-2 w-full mt-2">
            <div>
              <span>Actor:</span> {actorDropdown}
            </div>
            <textarea
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-2 rounded w-full h-20"
              value={cmd.payload.text}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "text",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "text", e.target.value)
              }
            />
            <span
              className={`text-sm ${
                cmd.payload.text?.length > 177
                  ? "text-red-500 font-bold"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Characters: {cmd.payload.text?.length || 0} / 177
            </span>
          </div>
        );
      case "message":
        return (
          <div className="flex flex-col gap-2 w-full mt-2">
            <textarea
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-2 rounded w-full h-20"
              value={cmd.payload.text}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "text",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "text", e.target.value)
              }
              placeholder="Message text (no portrait)"
            />
          </div>
        );
      case "textAboveHead":
        return (
          <div className="flex flex-col gap-2 w-full mt-2">
            <div>
              <span>Actor:</span> {actorDropdown}
            </div>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-2 rounded w-full"
              value={cmd.payload.text}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "text",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "text", e.target.value)
              }
              placeholder="Short text above head"
            />
          </div>
        );
      case "move":
        return (
          <div className="flex flex-col gap-2 w-full mt-2">
            {cmd.payload.movements.map((m: any, mIndex: number) => (
              <div key={mIndex} className="flex flex-wrap items-center gap-2">
                <span>Actor:</span>
                <select
                  className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 mx-2 rounded"
                  value={m.actor}
                  onChange={(e) => {
                    const newMv = [...cmd.payload.movements];
                    newMv[mIndex].actor = e.target.value;
                    isNested
                      ? updateNestedCommand(
                          parentCmdId!,
                          parentOptionId!,
                          cmd.id,
                          "movements",
                          newMv
                        )
                      : updateCommand(cmd.id, "movements", newMv);
                  }}
                >
                  {cast.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span>X Offset:</span>
                <input
                  type="number"
                  className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
                  value={m.x}
                  onChange={(e) => {
                    const newMv = [...cmd.payload.movements];
                    newMv[mIndex].x = Number(e.target.value);
                    isNested
                      ? updateNestedCommand(
                          parentCmdId!,
                          parentOptionId!,
                          cmd.id,
                          "movements",
                          newMv
                        )
                      : updateCommand(cmd.id, "movements", newMv);
                  }}
                />
                <span>Y Offset:</span>
                <input
                  type="number"
                  className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
                  value={m.y}
                  onChange={(e) => {
                    const newMv = [...cmd.payload.movements];
                    newMv[mIndex].y = Number(e.target.value);
                    isNested
                      ? updateNestedCommand(
                          parentCmdId!,
                          parentOptionId!,
                          cmd.id,
                          "movements",
                          newMv
                        )
                      : updateCommand(cmd.id, "movements", newMv);
                  }}
                />
                <span>Facing:</span>
                <select
                  className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 mx-2 rounded"
                  value={m.facing}
                  onChange={(e) => {
                    const newMv = [...cmd.payload.movements];
                    newMv[mIndex].facing = Number(e.target.value);
                    isNested
                      ? updateNestedCommand(
                          parentCmdId!,
                          parentOptionId!,
                          cmd.id,
                          "movements",
                          newMv
                        )
                      : updateCommand(cmd.id, "movements", newMv);
                  }}
                >
                  <option value={0}>Up</option>
                  <option value={1}>Right</option>
                  <option value={2}>Down</option>
                  <option value={3}>Left</option>
                </select>
                {cmd.payload.movements.length > 1 && (
                  <button
                    onClick={() => {
                      const newMv = cmd.payload.movements.filter(
                        (_: any, idx: number) => idx !== mIndex
                      );
                      isNested
                        ? updateNestedCommand(
                            parentCmdId!,
                            parentOptionId!,
                            cmd.id,
                            "movements",
                            newMv
                          )
                        : updateCommand(cmd.id, "movements", newMv);
                    }}
                    className="text-red-400 hover:text-red-600 font-bold px-2"
                  >
                    X
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center gap-4 mt-1 border-t border-slate-200 dark:border-slate-700 pt-2">
              <button
                onClick={() => {
                  const newMv = [
                    ...cmd.payload.movements,
                    {
                      actor: cast.length > 0 ? cast[0].name : "",
                      x: 0,
                      y: 0,
                      facing: 2,
                    },
                  ];
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "movements",
                        newMv
                      )
                    : updateCommand(cmd.id, "movements", newMv);
                }}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 px-2 py-1 rounded"
              >
                + Add Actor
              </button>
              <label className="flex items-center gap-1 text-sm cursor-pointer text-slate-600 dark:text-slate-400 font-semibold">
                <input
                  type="checkbox"
                  checked={cmd.payload.isAsync}
                  onChange={(e) =>
                    isNested
                      ? updateNestedCommand(
                          parentCmdId!,
                          parentOptionId!,
                          cmd.id,
                          "isAsync",
                          e.target.checked
                        )
                      : updateCommand(cmd.id, "isAsync", e.target.checked)
                  }
                  className="accent-emerald-500 rounded"
                />
                Continue Event (Async)
              </label>
            </div>
          </div>
        );
      case "viewportMove":
        return (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span>Pan X:</span>
            <input
              type="number"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.x}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "x",
                      Number(e.target.value)
                    )
                  : updateCommand(cmd.id, "x", Number(e.target.value))
              }
            />
            <span>Pan Y:</span>
            <input
              type="number"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.y}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "y",
                      Number(e.target.value)
                    )
                  : updateCommand(cmd.id, "y", Number(e.target.value))
              }
            />
            <span>Time (ms):</span>
            <input
              type="number"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-20 rounded"
              value={cmd.payload.duration}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "duration",
                      Number(e.target.value)
                    )
                  : updateCommand(cmd.id, "duration", Number(e.target.value))
              }
            />
          </div>
        );
      case "pause":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Duration (ms):</span>
            <input
              type="number"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-24 rounded"
              value={cmd.payload.duration}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "duration",
                      Number(e.target.value)
                    )
                  : updateCommand(cmd.id, "duration", Number(e.target.value))
              }
            />
          </div>
        );
      case "faceDirection":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Actor:</span> {actorDropdown}
            <span>Facing:</span> {facingDropdown}
            <label className="flex items-center gap-1 text-sm cursor-pointer text-slate-600 dark:text-slate-400 font-semibold ml-4">
              <input
                type="checkbox"
                checked={cmd.payload.isAsync}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "isAsync",
                        e.target.checked
                      )
                    : updateCommand(cmd.id, "isAsync", e.target.checked)
                }
                className="accent-emerald-500 rounded"
              />
              Continue Event (Async)
            </label>
          </div>
        );
      case "emote":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Actor:</span> {actorDropdown}
            <span>Emote:</span>
            <select
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 mx-2 rounded"
              value={cmd.payload.emoteId}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "emoteId",
                      Number(e.target.value)
                    )
                  : updateCommand(cmd.id, "emoteId", Number(e.target.value))
              }
            >
              <option value={8}>Question Mark</option>
              <option value={12}>Angry</option>
              <option value={16}>Exclamation</option>
              <option value={20}>Heart</option>
              <option value={24}>Sleepy</option>
              <option value={28}>Sad / Sweat</option>
              <option value={32}>Happy Smile</option>
              <option value={40}>Dots (...)</option>
            </select>
            <label className="flex items-center gap-1 text-sm cursor-pointer text-slate-600 dark:text-slate-400 font-semibold ml-4">
              <input
                type="checkbox"
                checked={cmd.payload.isAsync}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "isAsync",
                        e.target.checked
                      )
                    : updateCommand(cmd.id, "isAsync", e.target.checked)
                }
                className="accent-emerald-500 rounded"
              />
              Continue Event (Async)
            </label>
          </div>
        );
      case "warp":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Actor:</span> {actorDropdown}
            <span>X:</span>
            <input
              type="number"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.x}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "x",
                      Number(e.target.value)
                    )
                  : updateCommand(cmd.id, "x", Number(e.target.value))
              }
            />
            <span>Y:</span>
            <input
              type="number"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.y}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "y",
                      Number(e.target.value)
                    )
                  : updateCommand(cmd.id, "y", Number(e.target.value))
              }
            />
          </div>
        );
      case "shake":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Actor:</span> {actorDropdown}
            <span>Duration (ms):</span>
            <input
              type="number"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-20 rounded"
              value={cmd.payload.duration}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "duration",
                      Number(e.target.value)
                    )
                  : updateCommand(cmd.id, "duration", Number(e.target.value))
              }
            />
          </div>
        );
      case "addTemporaryActor":
        return (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex flex-wrap items-center gap-2">
              <span>Name/ID:</span>
              <input
                type="text"
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-24 rounded"
                value={cmd.payload.name}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "name",
                        e.target.value
                      )
                    : updateCommand(cmd.id, "name", e.target.value)
                }
              />
              <span>Sprite Sheet:</span>
              <input
                type="text"
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-32 rounded"
                value={cmd.payload.sprite}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "sprite",
                        e.target.value
                      )
                    : updateCommand(cmd.id, "sprite", e.target.value)
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span>X:</span>
              <input
                type="number"
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
                value={cmd.payload.x}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "x",
                        Number(e.target.value)
                      )
                    : updateCommand(cmd.id, "x", Number(e.target.value))
                }
              />
              <span>Y:</span>
              <input
                type="number"
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
                value={cmd.payload.y}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "y",
                        Number(e.target.value)
                      )
                    : updateCommand(cmd.id, "y", Number(e.target.value))
                }
              />
              <span>Facing:</span> {facingDropdown}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span>W:</span>
              <input
                type="number"
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
                value={cmd.payload.w}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "w",
                        Number(e.target.value)
                      )
                    : updateCommand(cmd.id, "w", Number(e.target.value))
                }
              />
              <span>H:</span>
              <input
                type="number"
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
                value={cmd.payload.h}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "h",
                        Number(e.target.value)
                      )
                    : updateCommand(cmd.id, "h", Number(e.target.value))
                }
              />
            </div>
          </div>
        );
      case "addObject":
      case "addBigProp":
        return (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span>Item/Prop ID:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-24 rounded"
              value={cmd.payload.itemId}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "itemId",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "itemId", e.target.value)
              }
            />
            <span>X:</span>
            <input
              type="number"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.x}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "x",
                      Number(e.target.value)
                    )
                  : updateCommand(cmd.id, "x", Number(e.target.value))
              }
            />
            <span>Y:</span>
            <input
              type="number"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.y}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "y",
                      Number(e.target.value)
                    )
                  : updateCommand(cmd.id, "y", Number(e.target.value))
              }
            />
          </div>
        );
      case "removeObject":
        return (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span>Tile X:</span>
            <input
              type="number"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.x}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "x",
                      Number(e.target.value)
                    )
                  : updateCommand(cmd.id, "x", Number(e.target.value))
              }
            />
            <span>Tile Y:</span>
            <input
              type="number"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.y}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "y",
                      Number(e.target.value)
                    )
                  : updateCommand(cmd.id, "y", Number(e.target.value))
              }
            />
          </div>
        );
      case "removeTemporarySprites":
        return (
          <div className="text-slate-600 dark:text-slate-400 italic mt-2">
            Clears all active temporary sprites.
          </div>
        );
      case "friendship":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Actor:</span> {actorDropdown}
            <span>Amount:</span>
            <input
              type="number"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-24 rounded"
              value={cmd.payload.amount}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "amount",
                      Number(e.target.value)
                    )
                  : updateCommand(cmd.id, "amount", Number(e.target.value))
              }
            />
          </div>
        );
      case "addItem":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Item ID:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-24 rounded"
              value={cmd.payload.itemId}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "itemId",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "itemId", e.target.value)
              }
            />
            <span>Count:</span>
            <input
              type="number"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.count}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "count",
                      Number(e.target.value)
                    )
                  : updateCommand(cmd.id, "count", Number(e.target.value))
              }
            />
          </div>
        );
      case "money":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Amount:</span>
            <input
              type="number"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-32 rounded"
              value={cmd.payload.amount}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "amount",
                      Number(e.target.value)
                    )
                  : updateCommand(cmd.id, "amount", Number(e.target.value))
              }
            />
          </div>
        );
      case "playSound":
      case "stopSound":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Sound ID:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-48 rounded"
              value={cmd.payload.soundId}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "soundId",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "soundId", e.target.value)
              }
            />
          </div>
        );
      case "playMusic":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Track ID:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-48 rounded"
              value={cmd.payload.trackId}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "trackId",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "trackId", e.target.value)
              }
            />
          </div>
        );
      case "stopMusic":
        return (
          <div className="text-slate-600 dark:text-slate-400 italic mt-2">
            Stops currently playing music.
          </div>
        );
      case "mail":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Letter ID:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 rounded w-48"
              value={cmd.payload.letterId}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "letterId",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "letterId", e.target.value)
              }
              placeholder="MailID"
            />
            <span className="text-xs text-slate-500">(Sent Tomorrow)</span>
          </div>
        );
      case "mailReceived":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Letter ID:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 rounded w-48"
              value={cmd.payload.letterId}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "letterId",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "letterId", e.target.value)
              }
              placeholder="MailID"
            />
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={cmd.payload.add}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "add",
                        e.target.checked
                      )
                    : updateCommand(cmd.id, "add", e.target.checked)
                }
              />
              <span>Add Flag</span>
            </label>
          </div>
        );
      case "fork":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Target Event ID:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 rounded"
              value={cmd.payload.targetId}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "targetId",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "targetId", e.target.value)
              }
            />
          </div>
        );
      case "question":
        return (
          <div className="flex flex-col gap-2 w-full mt-2">
            <div className="flex items-center gap-2">
              <span>Fork Type:</span>
              <select
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 rounded"
                value={cmd.payload.forkId}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "forkId",
                        e.target.value
                      )
                    : updateCommand(cmd.id, "forkId", e.target.value)
                }
              >
                <option value="null">null (No Effect)</option>
                <option value="fork0">fork0</option>
                <option value="fork1">fork1</option>
                <option value="fork2">fork2</option>
              </select>
            </div>
            <div>
              <span>Prompt:</span>
              <input
                type="text"
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-full rounded mt-1"
                value={cmd.payload.prompt}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "prompt",
                        e.target.value
                      )
                    : updateCommand(cmd.id, "prompt", e.target.value)
                }
              />
            </div>
            <div>
              <span className="block mb-1">Options:</span>
              {cmd.payload.options.map((opt: string, i: number) => (
                <div key={i} className="flex gap-2 mb-1">
                  <input
                    type="text"
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 flex-grow rounded"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...cmd.payload.options];
                      newOpts[i] = e.target.value;
                      isNested
                        ? updateNestedCommand(
                            parentCmdId!,
                            parentOptionId!,
                            cmd.id,
                            "options",
                            newOpts
                          )
                        : updateCommand(cmd.id, "options", newOpts);
                    }}
                  />
                  <button
                    onClick={() => {
                      const newOpts = cmd.payload.options.filter(
                        (_: string, idx: number) => idx !== i
                      );
                      isNested
                        ? updateNestedCommand(
                            parentCmdId!,
                            parentOptionId!,
                            cmd.id,
                            "options",
                            newOpts
                          )
                        : updateCommand(cmd.id, "options", newOpts);
                    }}
                    className="text-red-400 hover:text-red-600 font-bold px-2"
                  >
                    X
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newOpts = [...cmd.payload.options, "New Option"];
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "options",
                        newOpts
                      )
                    : updateCommand(cmd.id, "options", newOpts);
                }}
                className="text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded mt-1"
              >
                + Add Option
              </button>
            </div>
          </div>
        );
      case "quickQuestion":
        return (
          <div className="flex flex-col gap-4 w-full mt-2 border-t border-slate-300 dark:border-slate-600 pt-3">
            <div>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Question Prompt:
              </span>
              <input
                type="text"
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-2 w-full rounded mt-1"
                value={cmd.payload.prompt}
                onChange={(e) =>
                  updateCommand(cmd.id, "prompt", e.target.value)
                }
              />
            </div>

            <div className="flex flex-col gap-4">
              {cmd.payload.options.map((opt: QuestionOption) => (
                <div
                  key={opt.id}
                  className="border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/20 p-3 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-bold text-indigo-700 dark:text-indigo-400">
                      Answer Label:
                    </span>
                    <input
                      type="text"
                      className="border border-indigo-300 dark:border-indigo-700 dark:bg-slate-800 dark:text-white p-1 flex-grow rounded"
                      value={opt.label}
                      onChange={(e) =>
                        updateOptionLabel(cmd.id, opt.id, e.target.value)
                      }
                    />
                    <button
                      onClick={() =>
                        removeOptionFromQuickQuestion(cmd.id, opt.id)
                      }
                      className="text-red-400 hover:text-red-600 font-bold px-2"
                    >
                      Remove Option
                    </button>
                  </div>

                  <div className="pl-4 border-l-2 border-indigo-300 dark:border-indigo-700 flex flex-col gap-2">
                    {opt.commands.map((nestedCmd, index) => (
                      <div
                        key={nestedCmd.id}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded flex gap-2"
                      >
                        <div className="flex flex-col gap-1 mt-1">
                          <button
                            onClick={() =>
                              moveNestedCommand(cmd.id, opt.id, index, -1)
                            }
                            disabled={index === 0}
                            className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 text-xs"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() =>
                              moveNestedCommand(cmd.id, opt.id, index, 1)
                            }
                            disabled={index === opt.commands.length - 1}
                            className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 text-xs"
                          >
                            ▼
                          </button>
                        </div>
                        <div className="flex-grow">
                          <div className="font-bold text-[10px] text-white bg-indigo-400 inline-block px-1 rounded uppercase tracking-wider">
                            {nestedCmd.type}
                          </div>
                          {renderCommandInputs(nestedCmd, true, opt.id, cmd.id)}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <button
                            onClick={() =>
                              removeNestedCommand(cmd.id, opt.id, nestedCmd.id)
                            }
                            className="text-red-400 hover:text-red-600 font-bold px-1 text-xs"
                          >
                            X
                          </button>
                          <select
                            className="text-[10px] border border-slate-300 dark:border-slate-600 rounded p-1 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                insertNestedCommand(
                                  cmd.id,
                                  opt.id,
                                  e.target.value,
                                  index + 1
                                );
                                e.target.value = "";
                              }
                            }}
                          >
                            <option value="" disabled>
                              + Insert
                            </option>
                            <optgroup label="Dialogue">
                              <option value="speak">Speak</option>
                              <option value="message">Message</option>
                              <option value="textAboveHead">
                                Text Above Head
                              </option>
                              <option value="emote">Emote</option>
                            </optgroup>
                            <optgroup label="Move & Camera">
                              <option value="move">Move</option>
                              <option value="faceDirection">Turn</option>
                              <option value="warp">Warp</option>
                              <option value="pause">Pause</option>
                              <option value="viewportMove">Pan Camera</option>
                              <option value="shake">Shake</option>
                            </optgroup>
                            <optgroup label="Scene & Items">
                              <option value="addTemporaryActor">
                                Add Temp Actor
                              </option>
                              <option value="addObject">Add Object</option>
                              <option value="addBigProp">Add Big Prop</option>
                              <option value="removeObject">
                                Remove Object
                              </option>
                              <option value="removeTemporarySprites">
                                Clear Temp Sprites
                              </option>
                            </optgroup>
                            <optgroup label="Audio">
                              <option value="playSound">Play Sound</option>
                              <option value="stopSound">Stop Sound</option>
                              <option value="playMusic">Play Music</option>
                              <option value="stopMusic">Stop Music</option>
                            </optgroup>
                            <optgroup label="Logic & Rewards">
                              <option value="friendship">Friendship</option>
                              <option value="addItem">Add Item</option>
                              <option value="money">Money</option>
                              <option value="mail">Queue Mail</option>
                              <option value="mailReceived">
                                Set Mail Flag
                              </option>
                              <option value="customAction">Custom</option>
                            </optgroup>
                          </select>
                        </div>
                      </div>
                    ))}
                    <div className="mt-2">
                      <select
                        className="text-xs border border-indigo-400 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 font-bold rounded p-1 bg-indigo-100 dark:bg-indigo-900/50"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            insertNestedCommand(
                              cmd.id,
                              opt.id,
                              e.target.value,
                              opt.commands.length
                            );
                            e.target.value = "";
                          }
                        }}
                      >
                        <option value="" disabled>
                          + Add Action to Branch
                        </option>
                        <optgroup label="Dialogue">
                          <option value="speak">Speak</option>
                          <option value="message">Message</option>
                          <option value="textAboveHead">Text Above Head</option>
                          <option value="emote">Emote</option>
                        </optgroup>
                        <optgroup label="Move & Camera">
                          <option value="move">Move</option>
                          <option value="faceDirection">Turn</option>
                          <option value="warp">Warp</option>
                          <option value="pause">Pause</option>
                          <option value="viewportMove">Pan Camera</option>
                          <option value="shake">Shake</option>
                        </optgroup>
                        <optgroup label="Scene & Items">
                          <option value="addTemporaryActor">
                            Add Temp Actor
                          </option>
                          <option value="addObject">Add Object</option>
                          <option value="addBigProp">Add Big Prop</option>
                          <option value="removeObject">Remove Object</option>
                          <option value="removeTemporarySprites">
                            Clear Temp Sprites
                          </option>
                        </optgroup>
                        <optgroup label="Audio">
                          <option value="playSound">Play Sound</option>
                          <option value="stopSound">Stop Sound</option>
                          <option value="playMusic">Play Music</option>
                          <option value="stopMusic">Stop Music</option>
                        </optgroup>
                        <optgroup label="Logic & Rewards">
                          <option value="friendship">Friendship</option>
                          <option value="addItem">Add Item</option>
                          <option value="money">Money</option>
                          <option value="mail">Queue Mail</option>
                          <option value="mailReceived">Set Mail Flag</option>
                          <option value="customAction">Custom Action</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => addOptionToQuickQuestion(cmd.id)}
              className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-bold py-2 px-4 rounded transition-colors self-start"
            >
              + Add Another Option
            </button>
          </div>
        );
      case "globalFade":
        return (
          <div className="flex flex-col gap-2 mt-2">
            <div className="text-slate-600 dark:text-slate-400 italic">
              Screen will fade to black.
            </div>
            <label className="flex items-center gap-1 text-sm cursor-pointer text-slate-600 dark:text-slate-400 font-semibold">
              <input
                type="checkbox"
                checked={cmd.payload.isAsync}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "isAsync",
                        e.target.checked
                      )
                    : updateCommand(cmd.id, "isAsync", e.target.checked)
                }
                className="accent-emerald-500 rounded"
              />
              Continue Event (Async)
            </label>
          </div>
        );
      case "end":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Ending Type:</span>
            <select
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 mx-2 rounded"
              value={cmd.payload.style}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "style",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "style", e.target.value)
              }
            >
              <option value="end">Standard</option>
              <option value="end warpOut">Exit Location</option>
              <option value="end invisible">End Invisible</option>
              <option value="end newDay">End Day</option>
            </select>
          </div>
        );
      case "customAction":
        return (
          <div className="flex items-center gap-2 mt-2 w-full">
            <span>Raw Code:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 rounded flex-grow"
              value={cmd.payload.text}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "text",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "text", e.target.value)
              }
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-8 pb-48 font-sans text-slate-800 dark:text-slate-200 transition-colors">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
              Stardew Event Builder
            </h1>
            <a
              href="https://stardewvalleywiki.com/Modding:Event_data"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-emerald-600 dark:text-emerald-500 hover:underline mt-1 inline-block font-semibold"
            >
              Wiki: Event Data Documentation ↗
            </a>
          </div>
          <div className="flex gap-2 items-start relative">
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 px-4 rounded transition-colors"
              >
                ⚙️ Settings
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-lg z-50 flex flex-col overflow-hidden">
                  <button
                    onClick={() => {
                      setIsDarkMode(false);
                      setIsMenuOpen(false);
                    }}
                    className="px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
                  >
                    Light Mode {!isDarkMode && "✓"}
                  </button>
                  <button
                    onClick={() => {
                      setIsDarkMode(true);
                      setIsMenuOpen(false);
                    }}
                    className="px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
                  >
                    Dark Mode {isDarkMode && "✓"}
                  </button>
                  <div className="border-t border-slate-200 dark:border-slate-700"></div>
                  <button
                    onClick={handleSaveDefaults}
                    className="px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-medium"
                  >
                    💾 Save Current as Default
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleReset}
              className="bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 font-bold py-2 px-4 rounded transition-colors"
            >
              Reset All
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 px-4 rounded transition-colors"
            >
              {showImport ? "Close Import" : "Import Existing Event"}
            </button>
          </div>
        </div>

        {showImport && (
          <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
            <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-2">
              Import from Content.json
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
              Paste a full event line here. (e.g.,{" "}
              <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
                "MyEvent/Time 600": "continue/-1000 -1000/farmer 0 0 0/pause
                1000/end"
              </code>
              )
            </p>
            <textarea
              className="w-full border border-amber-300 dark:border-amber-700 dark:bg-slate-800 dark:text-white p-2 rounded h-24 mb-2 font-mono text-sm"
              placeholder='"EventId/Condition": "music/x y/actor data/commands..."'
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <button
              onClick={handleImport}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded w-full"
            >
              Parse & Load Event
            </button>
          </div>
        )}

        <section className="mb-8 border-b border-slate-200 dark:border-slate-700 pb-6">
          <h2 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-300">
            1. Event Details
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                Event ID (Unique Name)
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                Target Location (Map Name)
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold mb-3 text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Required Conditions to Trigger
            </h3>
            {conditions.map((cond) => (
              <div
                key={cond.id}
                className="flex gap-4 mb-3 items-center bg-white dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-700 rounded"
              >
                <div className="flex flex-col gap-1 w-24">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {cond.type}
                  </span>
                  <label className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!cond.negated}
                      onChange={(e) =>
                        toggleConditionNegation(cond.id, e.target.checked)
                      }
                      className="accent-rose-500 rounded"
                    />
                    NOT (!)
                  </label>
                </div>
                <div className="flex-grow">{renderConditionInputs(cond)}</div>
                <button
                  onClick={() => removeCondition(cond.id)}
                  className="text-red-400 hover:text-red-600 font-bold px-2"
                >
                  X
                </button>
              </div>
            ))}
            <div className="flex gap-2 mt-4">
              <span className="text-sm text-slate-500 dark:text-slate-400 self-center mr-2">
                Add Requirement:
              </span>
              <button
                onClick={() => addCondition("Time")}
                className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded text-sm font-bold"
              >
                + Time
              </button>
              <button
                onClick={() => addCondition("Friendship")}
                className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded text-sm font-bold"
              >
                + Friendship
              </button>
              <button
                onClick={() => addCondition("Season")}
                className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded text-sm font-bold"
              >
                + Season
              </button>
              <button
                onClick={() => addCondition("Weather")}
                className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded text-sm font-bold"
              >
                + Weather
              </button>
              <button
                onClick={() => addCondition("Custom")}
                className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded text-sm font-bold"
              >
                + Custom Condition
              </button>
            </div>
          </div>
        </section>

        <section className="mb-8 border-b border-slate-200 dark:border-slate-700 pb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">
              2. Scene Setup & Cast List
            </h2>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-3 py-1.5 rounded">
              <input
                type="checkbox"
                checked={isSkippable}
                onChange={(e) => setIsSkippable(e.target.checked)}
                className="accent-emerald-500 w-4 h-4 cursor-pointer"
              />
              Event is Skippable
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                Background Music
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                value={music}
                onChange={(e) => setMusic(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="w-1/2">
                <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                  Camera X
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                  value={viewport.x}
                  onChange={(e) =>
                    setViewport({ ...viewport, x: Number(e.target.value) })
                  }
                />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                  Camera Y
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                  value={viewport.y}
                  onChange={(e) =>
                    setViewport({ ...viewport, y: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold mb-3 text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Starting Actors
            </h3>
            {cast.map((actor) => (
              <div key={actor.id} className="flex gap-2 mb-2 items-center">
                <input
                  type="text"
                  className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-2 w-1/3 rounded"
                  placeholder="Actor Name"
                  value={actor.name}
                  disabled={actor.name === "farmer"}
                  onChange={(e) =>
                    updateCastMember(actor.id, "name", e.target.value)
                  }
                />
                <span className="text-slate-400 text-sm">X:</span>
                <input
                  type="number"
                  className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-2 w-16 rounded"
                  value={actor.x}
                  onChange={(e) =>
                    updateCastMember(actor.id, "x", Number(e.target.value))
                  }
                />
                <span className="text-slate-400 text-sm">Y:</span>
                <input
                  type="number"
                  className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-2 w-16 rounded"
                  value={actor.y}
                  onChange={(e) =>
                    updateCastMember(actor.id, "y", Number(e.target.value))
                  }
                />
                <select
                  className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-2 rounded ml-2"
                  value={actor.facing}
                  onChange={(e) =>
                    updateCastMember(actor.id, "facing", Number(e.target.value))
                  }
                >
                  <option value={0}>Up</option>
                  <option value={1}>Right</option>
                  <option value={2}>Down</option>
                  <option value={3}>Left</option>
                </select>
                {actor.name !== "farmer" && (
                  <button
                    onClick={() => removeCastMember(actor.id)}
                    className="text-red-400 hover:text-red-600 font-bold ml-2"
                  >
                    X
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addCastMember}
              className="mt-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded text-sm font-bold"
            >
              + Add Character
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-300">
            3. Timeline Workspace
          </h2>
          <div className="flex flex-col gap-3">
            {timeline.map((cmd, index) => (
              <div
                key={cmd.id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50 shadow-sm flex items-start gap-4 transition-colors"
              >
                <div className="flex flex-col gap-1 mt-1">
                  <button
                    onClick={() => moveCommand(index, -1)}
                    disabled={index === 0}
                    className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveCommand(index, 1)}
                    disabled={index === timeline.length - 1}
                    className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <div className="flex-grow">
                  <div
                    className={`font-bold text-xs text-white inline-block px-2 py-1 rounded uppercase tracking-wider ${
                      ["quickQuestion", "question", "fork"].includes(cmd.type)
                        ? "bg-indigo-500"
                        : "bg-emerald-500"
                    }`}
                  >
                    {cmd.type}
                  </div>
                  {renderCommandInputs(cmd)}
                </div>
                <div className="flex flex-col items-end gap-2 mt-1">
                  <button
                    onClick={() => removeCommand(cmd.id)}
                    className="text-red-400 hover:text-red-600 font-bold px-2 py-1"
                  >
                    Delete
                  </button>
                  <select
                    className="text-xs border border-slate-300 dark:border-slate-600 rounded p-1 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        insertCommand(e.target.value, index + 1);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="" disabled>
                      + Insert Below
                    </option>
                    <optgroup label="Dialogue">
                      <option value="speak">Speak</option>
                      <option value="message">Message</option>
                      <option value="textAboveHead">Text Above Head</option>
                      <option value="emote">Emote</option>
                    </optgroup>
                    <optgroup label="Movement & Camera">
                      <option value="move">Move</option>
                      <option value="faceDirection">Turn</option>
                      <option value="warp">Warp</option>
                      <option value="pause">Pause</option>
                      <option value="viewportMove">Pan Camera</option>
                      <option value="shake">Shake</option>
                      <option value="globalFade">Fade Screen</option>
                    </optgroup>
                    <optgroup label="Scene & Items">
                      <option value="addTemporaryActor">Add Temp Actor</option>
                      <option value="addObject">Add Object</option>
                      <option value="addBigProp">Add Big Prop</option>
                      <option value="removeObject">Remove Object</option>
                      <option value="removeTemporarySprites">
                        Clear Temp Sprites
                      </option>
                    </optgroup>
                    <optgroup label="Audio">
                      <option value="playSound">Play Sound</option>
                      <option value="stopSound">Stop Sound</option>
                      <option value="playMusic">Play Music</option>
                      <option value="stopMusic">Stop Music</option>
                    </optgroup>
                    <optgroup label="Logic & Rewards">
                      <option value="friendship">Friendship</option>
                      <option value="addItem">Add Item</option>
                      <option value="money">Money</option>
                      <option value="mail">Queue Mail</option>
                      <option value="mailReceived">Set Mail Flag</option>
                      <option value="quickQuestion">Question (Branched)</option>
                      <option value="question">Question (Null / Fork)</option>
                      <option value="fork">Go To Fork</option>
                      <option value="end">End Event</option>
                      <option value="customAction">Custom Action</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-slate-100 dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wide">
              Add New Action
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                  Dialogue
                </h4>
                <button
                  onClick={() => insertCommand("speak", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-sm"
                >
                  + Speak
                </button>
                <button
                  onClick={() => insertCommand("message", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-sm"
                >
                  + Message
                </button>
                <button
                  onClick={() =>
                    insertCommand("textAboveHead", timeline.length)
                  }
                  className="bg-white dark:bg-slate-800 border border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-sm"
                >
                  + Text Above Head
                </button>
                <button
                  onClick={() => insertCommand("emote", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-sm"
                >
                  + Emote
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                  Move & Camera
                </h4>
                <button
                  onClick={() => insertCommand("move", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-amber-500 text-amber-700 dark:text-amber-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm"
                >
                  + Move
                </button>
                <button
                  onClick={() =>
                    insertCommand("faceDirection", timeline.length)
                  }
                  className="bg-white dark:bg-slate-800 border border-amber-500 text-amber-700 dark:text-amber-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm"
                >
                  + Turn
                </button>
                <button
                  onClick={() => insertCommand("warp", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-amber-500 text-amber-700 dark:text-amber-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm"
                >
                  + Warp
                </button>
                <button
                  onClick={() => insertCommand("pause", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-amber-500 text-amber-700 dark:text-amber-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm"
                >
                  + Pause
                </button>
                <button
                  onClick={() => insertCommand("viewportMove", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-amber-500 text-amber-700 dark:text-amber-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm"
                >
                  + Pan Camera
                </button>
                <button
                  onClick={() => insertCommand("shake", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-amber-500 text-amber-700 dark:text-amber-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm"
                >
                  + Shake
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                  Scene & Items
                </h4>
                <button
                  onClick={() =>
                    insertCommand("addTemporaryActor", timeline.length)
                  }
                  className="bg-white dark:bg-slate-800 border border-cyan-500 text-cyan-700 dark:text-cyan-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-sm"
                >
                  + Temp Actor
                </button>
                <button
                  onClick={() => insertCommand("addObject", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-cyan-500 text-cyan-700 dark:text-cyan-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-sm"
                >
                  + Object
                </button>
                <button
                  onClick={() => insertCommand("addBigProp", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-cyan-500 text-cyan-700 dark:text-cyan-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-sm"
                >
                  + Big Prop
                </button>
                <button
                  onClick={() => insertCommand("removeObject", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-cyan-500 text-cyan-700 dark:text-cyan-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-sm"
                >
                  + Remove Object
                </button>
                <button
                  onClick={() =>
                    insertCommand("removeTemporarySprites", timeline.length)
                  }
                  className="bg-white dark:bg-slate-800 border border-cyan-500 text-cyan-700 dark:text-cyan-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-sm"
                >
                  + Clear Sprites
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                  Audio
                </h4>
                <button
                  onClick={() => insertCommand("playSound", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-rose-500 text-rose-700 dark:text-rose-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm"
                >
                  + Play Sound
                </button>
                <button
                  onClick={() => insertCommand("stopSound", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-rose-500 text-rose-700 dark:text-rose-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm"
                >
                  + Stop Sound
                </button>
                <button
                  onClick={() => insertCommand("playMusic", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-rose-500 text-rose-700 dark:text-rose-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm"
                >
                  + Play Music
                </button>
                <button
                  onClick={() => insertCommand("stopMusic", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-rose-500 text-rose-700 dark:text-rose-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm"
                >
                  + Stop Music
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                  Logic & Rewards
                </h4>
                <button
                  onClick={() =>
                    insertCommand("quickQuestion", timeline.length)
                  }
                  className="bg-white dark:bg-slate-800 border border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm"
                >
                  + Question (Branched)
                </button>
                <button
                  onClick={() => insertCommand("question", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm"
                >
                  + Question (Null/Fork)
                </button>
                <button
                  onClick={() => insertCommand("friendship", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm"
                >
                  + Friendship
                </button>
                <button
                  onClick={() => insertCommand("addItem", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm"
                >
                  + Add Item
                </button>
                <button
                  onClick={() => insertCommand("money", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm"
                >
                  + Money
                </button>
                <button
                  onClick={() => insertCommand("mail", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-300 font-semibold px-3 py-1.5 rounded text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
                >
                  + Queue Mail
                </button>
                <button
                  onClick={() => insertCommand("mailReceived", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-300 font-semibold px-3 py-1.5 rounded text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
                >
                  + Set Mail Flag
                </button>
                <button
                  onClick={() => insertCommand("globalFade", timeline.length)}
                  className="bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-300 font-semibold px-3 py-1.5 rounded text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
                >
                  + Fade Screen
                </button>
                <button
                  onClick={() => insertCommand("end", timeline.length)}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-500 text-red-700 dark:text-red-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-red-100 dark:hover:bg-red-900/40 text-sm"
                >
                  + End Event
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-700 p-4 shadow-2xl z-50">
        <div className="max-w-4xl mx-auto flex gap-4 items-center">
          <div className="flex-grow">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Generated Event Code
              </label>
              <label className="flex items-center text-xs font-bold text-slate-300 gap-2 cursor-pointer hover:text-emerald-400 transition-colors">
                <input
                  type="checkbox"
                  checked={exportAsCP}
                  onChange={(e) => setExportAsCP(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                />
                Format for Content Patcher
              </label>
            </div>
            <textarea
              className={`w-full bg-slate-800 border border-slate-700 text-emerald-400 p-3 rounded font-mono text-sm resize-none outline-none focus:border-emerald-500 ${
                exportAsCP ? "h-32" : "h-16"
              }`}
              readOnly
              value={outputString}
            />
          </div>
          <button
            onClick={copyToClipboard}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-8 rounded-lg whitespace-nowrap shadow-lg transition-colors text-lg"
          >
            Copy Event
          </button>
        </div>
      </div>
    </div>
  );
}
