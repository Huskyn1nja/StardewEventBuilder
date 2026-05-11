import { useState, useEffect, useCallback, useMemo } from "react";
import { STARDEW_DICTIONARY } from "./dictionary";

type ToolView = "home" | "event" | "character" | "gift";

interface Viewport {
  x: number | string;
  y: number | string;
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
  x: number | string;
  y: number | string;
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

interface GiftTasteCategory {
  dialogs: string[];
  items: string;
}

interface ItemSpecificDialogue {
  id: number;
  itemOrTag: string;
  dialogue: string;
}

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolView>("home");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

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
  const [showScriptPreview, setShowScriptPreview] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>("");
  const [i18nText, setI18nText] = useState<string>("");
  const [i18nData, setI18nData] = useState<Record<string, string>>({});

  const [savedLocations, setSavedLocations] = useState<string[]>(() => {
    const saved = localStorage.getItem("savedLocations");
    return saved !== null
      ? JSON.parse(saved)
      : ["Railroad", "Town", "Farm", "Saloon", "Mountain"];
  });

  const [savedActors, setSavedActors] = useState<string[]>(() => {
    const saved = localStorage.getItem("savedActors");
    return saved !== null
      ? JSON.parse(saved)
      : [
          "farmer",
          "Abigail",
          "Penny",
          "Sebastian",
          "Haley",
          "Alex",
          "Sam",
          "Harvey",
          "Elliott",
          "Leah",
          "Maru",
        ];
  });

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

  const [giftNpcId, setGiftNpcId] = useState<string>("{{ModId}}_NPCName");
  const [giftTastes, setGiftTastes] = useState<
    Record<string, GiftTasteCategory>
  >({
    love: {
      dialogs: ["I seriously love this! You're the best, @!"],
      items: "66 128 220",
    },
    like: {
      dialogs: ["Hey, how'd you know I was hungry? This looks delicious!"],
      items: "-5 -75",
    },
    neutral: { dialogs: ["You brought me a present? Thanks."], items: "" },
    dislike: {
      dialogs: ["What am I supposed to do with this?"],
      items: "-79 16",
    },
    hate: { dialogs: ["What were you thinking? This is awful!"], items: "330" },
  });
  const [itemSpecificDialogues, setItemSpecificDialogues] = useState<
    ItemSpecificDialogue[]
  >([]);

  const [charId, setCharId] = useState("{{ModId}}_NewNPC");
  const [charDisplayName, setCharDisplayName] = useState("NewNPC");
  const [charBirthSeason, setCharBirthSeason] = useState("Spring");
  const [charBirthDay, setCharBirthDay] = useState<number | string>(1);
  const [charHomeRegion, setCharHomeRegion] = useState("Town");
  const [charGender, setCharGender] = useState("Undefined");
  const [charAge, setCharAge] = useState("Adult");
  const [charManner, setCharManner] = useState("Neutral");
  const [charSocialAnxiety, setCharSocialAnxiety] = useState("Neutral");
  const [charOptimism, setCharOptimism] = useState("Positive");
  const [charCanBeRomanced, setCharCanBeRomanced] = useState(false);
  const [charHomeLocation, setCharHomeLocation] = useState("Town");
  const [charHomeX, setCharHomeX] = useState<number | string>(0);
  const [charHomeY, setCharHomeY] = useState<number | string>(0);
  const [charHomeDir, setCharHomeDir] = useState("down");

  const [charCanVisitIsland, setCharCanVisitIsland] = useState("omit");
  const [charSpouseAdopts, setCharSpouseAdopts] = useState("omit");
  const [charIntroductionsQuest, setCharIntroductionsQuest] = useState("omit");
  const [charItemDeliveryQuests, setCharItemDeliveryQuests] = useState("omit");
  const [charWinterStarParticipant, setCharWinterStarParticipant] =
    useState("omit");

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return STARDEW_DICTIONARY.filter(
      (item: any) =>
        item.name?.toLowerCase().includes(query) ||
        item.id?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.tags?.some((tag: string) => tag?.toLowerCase().includes(query))
    );
  }, [searchQuery]);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        if (activeTool === "gift") {
          e.preventDefault();
          setIsSearchOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTool]);

  useEffect(() => {
    if (location && !savedLocations.includes(location)) {
      const newLocs = Array.from(new Set([...savedLocations, location]));
      setSavedLocations(newLocs);
      localStorage.setItem("savedLocations", JSON.stringify(newLocs));
    }
  }, [location, savedLocations]);

  useEffect(() => {
    const newActors = cast
      .map((c) => c.name)
      .filter((name) => !savedActors.includes(name));
    if (newActors.length > 0) {
      const mergedActors = Array.from(new Set([...savedActors, ...newActors]));
      setSavedActors(mergedActors);
      localStorage.setItem("savedActors", JSON.stringify(mergedActors));
    }
  }, [cast, savedActors]);

  const compileSingleCommand = useCallback((cmd: Command): string => {
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
          (m: any) => `${m.actor} ${m.x || 0} ${m.y || 0} ${m.facing}`
        );
        return `move ${moveStrs.join(" ")}${
          cmd.payload.isAsync ? " true" : ""
        }`;
      case "advancedMove":
        return `advancedMove ${cmd.payload.actor} ${
          cmd.payload.isAsync ? "true" : "false"
        } ${cmd.payload.sequence}`;
      case "viewportMove":
        return `viewport move ${cmd.payload.x || 0} ${cmd.payload.y || 0} ${
          cmd.payload.duration || 0
        }`;
      case "pause":
        return `pause ${cmd.payload.duration || 0}`;
      case "faceDirection":
        return `faceDirection ${cmd.payload.actor} ${cmd.payload.facing}${
          cmd.payload.isAsync ? " true" : ""
        }`;
      case "emote":
        return `emote ${cmd.payload.actor} ${cmd.payload.emoteId}${
          cmd.payload.isAsync ? " true" : ""
        }`;
      case "warp":
        return `warp ${cmd.payload.actor} ${cmd.payload.x || 0} ${
          cmd.payload.y || 0
        }`;
      case "shake":
        return `shake ${cmd.payload.actor} ${cmd.payload.duration || 0}`;
      case "addTemporaryActor":
        return `addTemporaryActor ${cmd.payload.sprite} ${cmd.payload.w || 0} ${
          cmd.payload.h || 0
        } ${cmd.payload.x || 0} ${cmd.payload.y || 0} ${
          cmd.payload.facing
        } true ${cmd.payload.actorType || "Character"} ${cmd.payload.name}`;
      case "addObject":
        return `addObject ${cmd.payload.x || 0} ${cmd.payload.y || 0} ${
          cmd.payload.itemId || "0"
        }`;
      case "addBigProp":
        return `addBigProp ${cmd.payload.x || 0} ${cmd.payload.y || 0} ${
          cmd.payload.itemId || "0"
        }`;
      case "removeObject":
        return `removeObject ${cmd.payload.x || 0} ${cmd.payload.y || 0}`;
      case "removeTemporarySprites":
        return "removeTemporarySprites";
      case "changeToTemporaryMap":
        return `changeToTemporaryMap ${cmd.payload.map} ${
          cmd.payload.clamp ? "true" : "false"
        }`;
      case "changeMapTile":
        return `changeMapTile ${cmd.payload.layer} ${cmd.payload.x || 0} ${
          cmd.payload.y || 0
        } ${cmd.payload.tileIndex || 0}`;
      case "friendship":
        return `friendship ${cmd.payload.actor} ${cmd.payload.amount || 0}`;
      case "addItem":
        return `addItem ${cmd.payload.itemId || "0"} ${cmd.payload.count || 1}`;
      case "money":
        return `money ${cmd.payload.amount || 0}`;
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
  }, []);

  const compileEvent = useCallback(() => {
    const conditionsString = conditions
      .map((cond) => {
        const prefix = cond.negated ? "!" : "";
        switch (cond.type) {
          case "Time":
            return `${prefix}Time ${cond.payload.min || 0} ${
              cond.payload.max || 0
            }`;
          case "Friendship":
            return `${prefix}Friendship ${cond.payload.actor} ${
              (Number(cond.payload.hearts) || 0) * 250
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

    let val = `${music}/${viewport.x || 0} ${viewport.y || 0}/`;
    const castString = cast
      .map(
        (actor) =>
          `${actor.name} ${actor.x || 0} ${actor.y || 0} ${actor.facing}`
      )
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
    compileSingleCommand,
  ]);

  useEffect(() => {
    if (activeTool === "event") {
      compileEvent();
    }
  }, [compileEvent, activeTool]);

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
          actorType: parts[8] || "Character",
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
    } else if (cmdStr.startsWith("changeToTemporaryMap ")) {
      const parts = cmdStr.split(" ");
      return {
        id: ts,
        type: "changeToTemporaryMap",
        payload: { map: parts[1] || "", clamp: parts[2] !== "false" },
      };
    } else if (cmdStr.startsWith("changeMapTile ")) {
      const parts = cmdStr.split(" ");
      return {
        id: ts,
        type: "changeMapTile",
        payload: {
          layer: parts[1] || "Buildings",
          x: parseInt(parts[2]) || 0,
          y: parseInt(parts[3]) || 0,
          tileIndex: parseInt(parts[4]) || 0,
        },
      };
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
    } else if (cmdStr.startsWith("advancedMove ")) {
      const parts = cmdStr.split(" ");
      const actor = parts[1];
      const isAsync = parts[2] === "true";
      const sequence = parts.slice(3).join(" ");
      return {
        id: ts,
        type: "advancedMove",
        payload: { actor, isAsync, sequence },
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

      const parts = rawText.split(/":\s*"/);
      if (parts.length < 2) {
        alert(
          'Invalid format! Please paste a single full event line like: "EventID/Time 600": "music/viewport/cast/commands..."'
        );
        return;
      }

      let rawKey = parts[0].replace(/^"/, "").trim();
      let rawScript = parts[1]
        .replace(/,$/, "")
        .replace(/"$/, "")
        .replace(/[\n\r\t]/g, "")
        .trim();

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
      } else {
        alert(
          "Parsed successfully, but it appears to be a sub-event missing the music/viewport/cast headers. Timeline actions may be slightly scrambled."
        );
      }
    } catch (error) {
      console.error(error);
      alert(
        "Failed to parse event. Make sure it matches the exact Stardew Valley JSON format."
      );
    }
  };

  const handleParseI18n = () => {
    try {
      const parsed = JSON.parse(i18nText);
      setI18nData(parsed);
    } catch (e) {
      alert("Invalid JSON format for i18n data.");
    }
  };

  const replaceI18n = (str: string) => {
    if (!str) return "";
    return str.replace(/\{\{i18n:([\w\.]+)\}\}/gi, (match, key) => {
      return i18nData[key.trim()] || match;
    });
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
      case "advancedMove":
        return { actor: defaultActor, isAsync: false, sequence: "" };
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
          actorType: "Character",
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
      case "changeToTemporaryMap":
        return { map: "", clamp: true };
      case "changeMapTile":
        return { layer: "Buildings", x: 0, y: 0, tileIndex: 0 };
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Code copied to clipboard!");
  };

  const renderScriptLine = (cmd: Command) => {
    const getDir = (d: number) =>
      ["Up", "Right", "Down", "Left"][d] || d.toString();

    if (cmd.type === "speak") {
      return (
        <p key={cmd.id} className="mb-2">
          <strong className="text-emerald-700 dark:text-emerald-400">
            {cmd.payload.actor}:
          </strong>{" "}
          {replaceI18n(cmd.payload.text)}
        </p>
      );
    }
    if (cmd.type === "message") {
      return (
        <p
          key={cmd.id}
          className="mb-2 italic text-slate-700 dark:text-slate-300"
        >
          {replaceI18n(cmd.payload.text)}
        </p>
      );
    }
    if (cmd.type === "textAboveHead") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm text-slate-500 dark:text-slate-400"
        >
          ({cmd.payload.actor} thinks: {replaceI18n(cmd.payload.text)})
        </p>
      );
    }
    if (cmd.type === "question") {
      return (
        <div
          key={cmd.id}
          className="mb-2 p-2 border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800"
        >
          <p className="font-bold mb-1">
            [Player Choice]: {replaceI18n(cmd.payload.prompt)}
          </p>
          <ul className="list-disc list-inside pl-4 text-sm text-slate-600 dark:text-slate-400">
            {cmd.payload.options.map((opt: string, i: number) => (
              <li key={i}>{replaceI18n(opt)}</li>
            ))}
          </ul>
        </div>
      );
    }
    if (cmd.type === "quickQuestion") {
      return (
        <div
          key={cmd.id}
          className="mb-4 p-3 border-2 border-indigo-200 dark:border-indigo-900 rounded bg-indigo-50 dark:bg-indigo-950/20"
        >
          <p className="font-bold text-indigo-700 dark:text-indigo-400 mb-2">
            [Branching Choice]: {replaceI18n(cmd.payload.prompt)}
          </p>
          {cmd.payload.options.map((opt: QuestionOption) => (
            <div
              key={opt.id}
              className="ml-4 pl-4 border-l-2 border-indigo-300 dark:border-indigo-700 mb-3"
            >
              <p className="font-bold text-sm text-indigo-600 dark:text-indigo-500 mb-1">
                If player selects: {replaceI18n(opt.label)}
              </p>
              {opt.commands.map(renderScriptLine)}
            </div>
          ))}
        </div>
      );
    }
    if (cmd.type === "emote") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [{cmd.payload.actor} emotes #{cmd.payload.emoteId}]
        </p>
      );
    }
    if (cmd.type === "move") {
      const moves = cmd.payload.movements
        .map((m: any) => {
          const nx = Number(m.x) || 0;
          const ny = Number(m.y) || 0;
          const xStr =
            nx !== 0
              ? `${Math.abs(nx)} spaces ${nx > 0 ? "Right" : "Left"}`
              : "";
          const yStr =
            ny !== 0 ? `${Math.abs(ny)} spaces ${ny > 0 ? "Down" : "Up"}` : "";
          const joinStr = nx !== 0 && ny !== 0 ? " and " : "";
          return `${m.actor} moves ${xStr}${joinStr}${yStr}`;
        })
        .join(", ");
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [{moves}]
        </p>
      );
    }
    if (cmd.type === "advancedMove") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [{cmd.payload.actor} executes advanced move sequence:{" "}
          {cmd.payload.sequence}]
        </p>
      );
    }
    if (cmd.type === "faceDirection") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [{cmd.payload.actor} turns to face{" "}
          {getDir(Number(cmd.payload.facing))}]
        </p>
      );
    }
    if (cmd.type === "pause") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [Pause for {cmd.payload.duration}ms]
        </p>
      );
    }
    if (cmd.type === "warp") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [{cmd.payload.actor} teleports to {cmd.payload.x}, {cmd.payload.y}]
        </p>
      );
    }
    if (cmd.type === "shake") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [{cmd.payload.actor} shakes for {cmd.payload.duration}ms]
        </p>
      );
    }
    if (cmd.type === "globalFade") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [Screen fades to black]
        </p>
      );
    }
    if (cmd.type === "viewportMove") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [Camera pans by {cmd.payload.x}, {cmd.payload.y}]
        </p>
      );
    }
    if (cmd.type === "playMusic") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [Music plays: {cmd.payload.trackId}]
        </p>
      );
    }
    if (cmd.type === "stopMusic") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [Music stops]
        </p>
      );
    }
    if (cmd.type === "playSound") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [Sound effect: {cmd.payload.soundId}]
        </p>
      );
    }
    if (cmd.type === "stopSound") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [Sound effect stops: {cmd.payload.soundId}]
        </p>
      );
    }
    if (cmd.type === "addTemporaryActor") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [{cmd.payload.actorType} {cmd.payload.name} enters the scene at{" "}
          {cmd.payload.x}, {cmd.payload.y}]
        </p>
      );
    }
    if (cmd.type === "addObject") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [Object {cmd.payload.itemId} appears at {cmd.payload.x},{" "}
          {cmd.payload.y}]
        </p>
      );
    }
    if (cmd.type === "addBigProp") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [Big Prop {cmd.payload.itemId} appears at {cmd.payload.x},{" "}
          {cmd.payload.y}]
        </p>
      );
    }
    if (cmd.type === "removeObject") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [Object removed at {cmd.payload.x}, {cmd.payload.y}]
        </p>
      );
    }
    if (cmd.type === "removeTemporarySprites") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [All temporary sprites are cleared]
        </p>
      );
    }
    if (cmd.type === "changeToTemporaryMap") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [Map changes to temporary map: {cmd.payload.map}]
        </p>
      );
    }
    if (cmd.type === "changeMapTile") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [Tile at {cmd.payload.x}, {cmd.payload.y} on layer {cmd.payload.layer}{" "}
          changes to index {cmd.payload.tileIndex}]
        </p>
      );
    }
    if (cmd.type === "friendship") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-amber-600 dark:text-amber-500"
        >
          [Reward: Friendship with {cmd.payload.actor} changes by{" "}
          {cmd.payload.amount} points]
        </p>
      );
    }
    if (cmd.type === "addItem") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-amber-600 dark:text-amber-500"
        >
          [Reward: Received {cmd.payload.count}x Item {cmd.payload.itemId}]
        </p>
      );
    }
    if (cmd.type === "money") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-amber-600 dark:text-amber-500"
        >
          [Reward: Received {cmd.payload.amount}g]
        </p>
      );
    }
    if (cmd.type === "mail") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [Mail queued for tomorrow: {cmd.payload.letterId}]
        </p>
      );
    }
    if (cmd.type === "mailReceived") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
          [Mail flag {cmd.payload.add ? "added" : "removed"}:{" "}
          {cmd.payload.letterId}]
        </p>
      );
    }
    if (cmd.type === "fork") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic font-bold text-indigo-600 dark:text-indigo-400"
        >
          [Event jumps to Fork: {cmd.payload.targetId}]
        </p>
      );
    }
    if (cmd.type === "end") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic font-bold text-slate-600 dark:text-slate-400"
        >
          [End Scene: {cmd.payload.style}]
        </p>
      );
    }
    return (
      <p
        key={cmd.id}
        className="mb-2 text-sm italic text-slate-400 dark:text-slate-500"
      >
        [System Action: {cmd.type}]
      </p>
    );
  };

  const renderConditionInputs = (cond: Condition) => {
    switch (cond.type) {
      case "Time":
        return (
          <div className="flex items-center gap-2">
            <span>Between</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-20 rounded"
              value={cond.payload.min}
              onChange={(e) => updateCondition(cond.id, "min", e.target.value)}
            />
            <span>and</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-20 rounded"
              value={cond.payload.max}
              onChange={(e) => updateCondition(cond.id, "max", e.target.value)}
            />
          </div>
        );
      case "Friendship":
        return (
          <div className="flex items-center gap-2">
            <span>Actor:</span>
            <input
              type="text"
              list="savedActorsList"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-28 rounded"
              value={cond.payload.actor}
              onChange={(e) =>
                updateCondition(cond.id, "actor", e.target.value)
              }
              placeholder="Actor"
            />
            <span>Needs</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cond.payload.hearts}
              onChange={(e) =>
                updateCondition(cond.id, "hearts", e.target.value)
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
    const actorInput = (
      <input
        type="text"
        list="savedActorsList"
        className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 mx-2 rounded w-32"
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
        placeholder="Actor or Temp Name"
      />
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
              <span>Actor:</span> {actorInput}
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
              <span>Actor:</span> {actorInput}
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
                <input
                  type="text"
                  list="savedActorsList"
                  className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 mx-2 rounded w-24"
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
                  placeholder="Actor"
                />
                <span>X Offset:</span>
                <input
                  type="text"
                  className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
                  value={m.x}
                  onChange={(e) => {
                    const newMv = [...cmd.payload.movements];
                    newMv[mIndex].x = e.target.value;
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
                  type="text"
                  className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
                  value={m.y}
                  onChange={(e) => {
                    const newMv = [...cmd.payload.movements];
                    newMv[mIndex].y = e.target.value;
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
      case "advancedMove":
        return (
          <div className="flex flex-col gap-2 w-full mt-2">
            <div className="flex items-center gap-2">
              <span>Actor:</span> {actorInput}
              <label className="flex items-center gap-1 text-sm cursor-pointer text-slate-600 dark:text-slate-400 font-semibold ml-2">
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
                  className="accent-amber-500 rounded"
                />
                Continue Event (Async)
              </label>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                Move Sequence (e.g., "0 2 0 2 -2 0")
              </label>
              <input
                type="text"
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-2 rounded w-full font-mono text-sm"
                value={cmd.payload.sequence}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "sequence",
                        e.target.value
                      )
                    : updateCommand(cmd.id, "sequence", e.target.value)
                }
              />
            </div>
          </div>
        );
      case "viewportMove":
        return (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span>Pan X:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.x}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "x",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "x", e.target.value)
              }
            />
            <span>Pan Y:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.y}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "y",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "y", e.target.value)
              }
            />
            <span>Time (ms):</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-20 rounded"
              value={cmd.payload.duration}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "duration",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "duration", e.target.value)
              }
            />
          </div>
        );
      case "pause":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Duration (ms):</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-24 rounded"
              value={cmd.payload.duration}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "duration",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "duration", e.target.value)
              }
            />
          </div>
        );
      case "faceDirection":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Actor:</span> {actorInput}
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
            <span>Actor:</span> {actorInput}
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
            <span>Actor:</span> {actorInput}
            <span>X:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.x}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "x",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "x", e.target.value)
              }
            />
            <span>Y:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.y}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "y",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "y", e.target.value)
              }
            />
          </div>
        );
      case "shake":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Actor:</span> {actorInput}
            <span>Duration (ms):</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-20 rounded"
              value={cmd.payload.duration}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "duration",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "duration", e.target.value)
              }
            />
          </div>
        );
      case "addTemporaryActor":
        return (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex flex-wrap items-center gap-2">
              <span>Type:</span>
              <select
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 rounded"
                value={cmd.payload.actorType || "Character"}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "actorType",
                        e.target.value
                      )
                    : updateCommand(cmd.id, "actorType", e.target.value)
                }
              >
                <option value="Character">Character</option>
                <option value="Animal">Animal</option>
                <option value="Monster">Monster</option>
              </select>
              <span>Name/ID:</span>
              <input
                type="text"
                list="savedActorsList"
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
                type="text"
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
                value={cmd.payload.x}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "x",
                        e.target.value
                      )
                    : updateCommand(cmd.id, "x", e.target.value)
                }
              />
              <span>Y:</span>
              <input
                type="text"
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
                value={cmd.payload.y}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "y",
                        e.target.value
                      )
                    : updateCommand(cmd.id, "y", e.target.value)
                }
              />
              <span>Facing:</span> {facingDropdown}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span>W:</span>
              <input
                type="text"
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
                value={cmd.payload.w}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "w",
                        e.target.value
                      )
                    : updateCommand(cmd.id, "w", e.target.value)
                }
              />
              <span>H:</span>
              <input
                type="text"
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
                value={cmd.payload.h}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "h",
                        e.target.value
                      )
                    : updateCommand(cmd.id, "h", e.target.value)
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
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.x}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "x",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "x", e.target.value)
              }
            />
            <span>Y:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.y}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "y",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "y", e.target.value)
              }
            />
          </div>
        );
      case "removeObject":
        return (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span>Tile X:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.x}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "x",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "x", e.target.value)
              }
            />
            <span>Tile Y:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.y}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "y",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "y", e.target.value)
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
      case "changeToTemporaryMap":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Map Name:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 rounded"
              value={cmd.payload.map}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "map",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "map", e.target.value)
              }
            />
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={cmd.payload.clamp}
                onChange={(e) =>
                  isNested
                    ? updateNestedCommand(
                        parentCmdId!,
                        parentOptionId!,
                        cmd.id,
                        "clamp",
                        e.target.checked
                      )
                    : updateCommand(cmd.id, "clamp", e.target.checked)
                }
                className="accent-emerald-500 rounded"
              />
              <span>Clamp Viewport</span>
            </label>
          </div>
        );
      case "changeMapTile":
        return (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span>Layer:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-24 rounded"
              value={cmd.payload.layer}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "layer",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "layer", e.target.value)
              }
            />
            <span>X:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.x}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "x",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "x", e.target.value)
              }
            />
            <span>Y:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.y}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "y",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "y", e.target.value)
              }
            />
            <span>Tile Index:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-20 rounded"
              value={cmd.payload.tileIndex}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "tileIndex",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "tileIndex", e.target.value)
              }
            />
          </div>
        );
      case "friendship":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Actor:</span> {actorInput}
            <span>Amount:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-24 rounded"
              value={cmd.payload.amount}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "amount",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "amount", e.target.value)
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
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-16 rounded"
              value={cmd.payload.count}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "count",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "count", e.target.value)
              }
            />
          </div>
        );
      case "money":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Amount:</span>
            <input
              type="text"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-1 w-32 rounded"
              value={cmd.payload.amount}
              onChange={(e) =>
                isNested
                  ? updateNestedCommand(
                      parentCmdId!,
                      parentOptionId!,
                      cmd.id,
                      "amount",
                      e.target.value
                    )
                  : updateCommand(cmd.id, "amount", e.target.value)
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
                            Up
                          </button>
                          <button
                            onClick={() =>
                              moveNestedCommand(cmd.id, opt.id, index, 1)
                            }
                            disabled={index === opt.commands.length - 1}
                            className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 text-xs"
                          >
                            Down
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
                              <option value="advancedMove">
                                Advanced Move
                              </option>
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
                              <option value="changeToTemporaryMap">
                                Temp Map
                              </option>
                              <option value="changeMapTile">
                                Change Map Tile
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
                          <option value="advancedMove">Advanced Move</option>
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
                          <option value="changeToTemporaryMap">Temp Map</option>
                          <option value="changeMapTile">Change Map Tile</option>
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

  const appendToTaste = (tasteKey: string, id: string) => {
    setGiftTastes((prev) => {
      const currentItems = prev[tasteKey as keyof typeof prev].items;
      return {
        ...prev,
        [tasteKey]: {
          ...prev[tasteKey as keyof typeof prev],
          items: currentItems ? `${currentItems} ${id}`.trim() : id,
        },
      };
    });

    setIsSearchOpen(false);
  };

  const addSpecificDialogue = (id: string) => {
    setItemSpecificDialogues((prev) => [
      ...prev,
      { id: Date.now(), itemOrTag: id, dialogue: "" },
    ]);
    setIsSearchOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors font-sans relative">
      {activeTool === "gift" && (
        <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-[100] shadow-md flex justify-between items-center">
          <h1 className="text-xl font-bold text-rose-400 hidden md:block">
            Stardew Toolkit
          </h1>
          <button
            onClick={() => setIsSearchOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 px-6 py-2 rounded-full font-mono text-sm w-full md:w-96 flex justify-between items-center transition-colors"
          >
            <span>Search IDs or Context Tags...</span>
            <span className="text-slate-500 font-bold bg-slate-900 px-2 py-0.5 rounded">
              Ctrl+K
            </span>
          </button>
        </div>
      )}

      {isSearchOpen && activeTool === "gift" && (
        <div
          className="fixed inset-0 bg-black/80 z-[200] flex justify-center p-4 md:p-12 backdrop-blur-sm"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-xl shadow-2xl flex flex-col h-[85vh] overflow-hidden border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-4 items-center bg-slate-50 dark:bg-slate-800/50">
              <input
                type="text"
                autoFocus
                placeholder="Type 'Emerald' or 'category_gem'..."
                className="w-full bg-transparent border-none outline-none text-xl dark:text-white font-mono"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl px-2"
              >
                X
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-2">
              {searchQuery === "" ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <p className="font-bold mb-2">
                    Search Stardew Valley Item Database
                  </p>
                  <p className="text-sm">
                    Filter by Item Name, ID, or Context Tags.
                  </p>
                  <p className="text-xs mt-4 opacity-50">
                    (Currently uses a starter sample dictionary. Expand
                    STARDEW_DICTIONARY in src/dictionary.ts to add more.)
                  </p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 font-bold">
                  No items found matching "{searchQuery}"
                </div>
              ) : (
                searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col p-3 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-500 transition-colors group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg dark:text-white flex items-center gap-3">
                          {item.name}
                          <span className="text-xs font-mono bg-slate-200 dark:bg-slate-900 px-2 py-1 rounded text-slate-600 dark:text-slate-400">
                            {item.id}
                          </span>
                          {item.category && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded">
                              {item.category}
                            </span>
                          )}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.id);
                          alert(`Copied ${item.id} to clipboard!`);
                        }}
                        className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-1 px-2 rounded transition-all"
                      >
                        Copy ID
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                      <span className="text-xs font-bold text-slate-400 self-center mr-2">
                        Insert Into:
                      </span>
                      <button
                        onClick={() => appendToTaste("love", item.id)}
                        className="text-[10px] font-bold uppercase tracking-wider bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 px-3 py-1.5 rounded hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors"
                      >
                        [ Love ]
                      </button>
                      <button
                        onClick={() => appendToTaste("like", item.id)}
                        className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                      >
                        [ Like ]
                      </button>
                      <button
                        onClick={() => appendToTaste("neutral", item.id)}
                        className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                      >
                        [ Neutral ]
                      </button>
                      <button
                        onClick={() => appendToTaste("dislike", item.id)}
                        className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1.5 rounded hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                      >
                        [ Dislike ]
                      </button>
                      <button
                        onClick={() => appendToTaste("hate", item.id)}
                        className="text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1.5 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      >
                        [ Hate ]
                      </button>
                      <button
                        onClick={() => addSpecificDialogue(item.id)}
                        className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-3 py-1.5 rounded hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors ml-auto"
                      >
                        + Specific Dialogue
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-8 pb-48">
        {activeTool === "home" && (
          <div className="flex flex-col items-center justify-center transition-colors">
            <h1 className="text-4xl md:text-5xl font-bold text-emerald-700 dark:text-emerald-400 mb-2 text-center">
              Stardew Modding - NPC Toolkit
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-12 text-center max-w-lg">
              A tool made mostly for Husky to have an easier time with his NPCs
              but figured he'd share
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
              <button
                onClick={() => setActiveTool("event")}
                className="group bg-white dark:bg-slate-900 border-2 border-emerald-500 hover:border-emerald-400 p-8 rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl text-left flex flex-col items-start"
              >
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-4 rounded-lg mb-4 text-emerald-600 dark:text-emerald-400 font-bold">
                  Ev
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Event Builder
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Build NPC events through a user friendly form instead of
                  starting at long text strings
                </p>
              </button>

              <button
                onClick={() => setActiveTool("character")}
                className="group bg-white dark:bg-slate-900 border-2 border-indigo-500 hover:border-indigo-400 p-8 rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl text-left flex flex-col items-start"
              >
                <div className="bg-indigo-100 dark:bg-indigo-900/50 p-4 rounded-lg mb-4 text-indigo-600 dark:text-indigo-400 font-bold">
                  Ch
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Character Data
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Generate the base NPC form to help the game know who your NPC
                  is.
                </p>
              </button>

              <button
                onClick={() => setActiveTool("gift")}
                className="group bg-white dark:bg-slate-900 border-2 border-rose-500 hover:border-rose-400 p-8 rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl text-left flex flex-col items-start"
              >
                <div className="bg-rose-100 dark:bg-rose-900/50 p-4 rounded-lg mb-4 text-rose-600 dark:text-rose-400 font-bold">
                  Gf
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  Gift Tastes Helper
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  A tool to help with loved, liked, neutral, and hated Item ID
                  stuff
                </p>
              </button>
            </div>
          </div>
        )}

        {activeTool === "character" &&
          (() => {
            const charEntry: any = {
              DisplayName: charDisplayName,
              BirthSeason: charBirthSeason.toLowerCase(),
              BirthDay: Number(charBirthDay) || 1,
              HomeRegion: charHomeRegion,
              Gender: charGender,
              Age: charAge,
              Manner: charManner,
              SocialAnxiety: charSocialAnxiety,
              Optimism: charOptimism,
              CanBeRomanced: charCanBeRomanced,
            };

            if (charCanVisitIsland !== "omit")
              charEntry.CanVisitIsland = charCanVisitIsland === "true";
            if (charSpouseAdopts !== "omit")
              charEntry.SpouseAdopts = charSpouseAdopts === "true";
            if (charIntroductionsQuest !== "omit")
              charEntry.IntroductionsQuest = charIntroductionsQuest === "true";
            if (charItemDeliveryQuests !== "omit")
              charEntry.ItemDeliveryQuests = charItemDeliveryQuests === "true";
            if (charWinterStarParticipant !== "omit")
              charEntry.WinterStarParticipant =
                charWinterStarParticipant === "true";

            charEntry.Home = [
              {
                Id: "Default",
                Location: charHomeLocation,
                Tile: { X: Number(charHomeX) || 0, Y: Number(charHomeY) || 0 },
                Direction: charHomeDir,
              },
            ];

            const charCpJson = JSON.stringify(
              {
                Action: "EditData",
                Target: "Data/Characters",
                Entries: {
                  [charId]: charEntry,
                },
              },
              null,
              2
            );

            return (
              <div>
                <div className="max-w-4xl mx-auto">
                  <button
                    onClick={() => setActiveTool("home")}
                    className="mb-6 text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-2"
                  >
                    Back to Toolkit Hub
                  </button>

                  <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
                    <h1 className="text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-6">
                      Character Data
                    </h1>

                    <div className="mb-6">
                      <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                        NPC Internal ID
                      </label>
                      <input
                        type="text"
                        className="w-full md:w-1/2 border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                        value={charId}
                        onChange={(e) => setCharId(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wide border-b border-slate-200 dark:border-slate-700 pb-2">
                          Basic Info
                        </h3>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Display Name / Token
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                            value={charDisplayName}
                            onChange={(e) => setCharDisplayName(e.target.value)}
                          />
                        </div>

                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Birth Season
                            </label>
                            <select
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                              value={charBirthSeason}
                              onChange={(e) =>
                                setCharBirthSeason(e.target.value)
                              }
                            >
                              {["Spring", "Summer", "Fall", "Winter"].map(
                                (s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Birth Day
                            </label>
                            <input
                              type="text"
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                              value={charBirthDay}
                              onChange={(e) => setCharBirthDay(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Gender
                            </label>
                            <select
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                              value={charGender}
                              onChange={(e) => setCharGender(e.target.value)}
                            >
                              {["Male", "Female", "Undefined"].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Age
                            </label>
                            <select
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                              value={charAge}
                              onChange={(e) => setCharAge(e.target.value)}
                            >
                              {["Child", "Teen", "Adult"].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Home Region
                          </label>
                          <select
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                            value={charHomeRegion}
                            onChange={(e) => setCharHomeRegion(e.target.value)}
                          >
                            {["Town", "Desert", "Other"].map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wide border-b border-slate-200 dark:border-slate-700 pb-2">
                          Personality & Spawn
                        </h3>

                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Manner
                            </label>
                            <select
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                              value={charManner}
                              onChange={(e) => setCharManner(e.target.value)}
                            >
                              {["Neutral", "Polite", "Rude"].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Social Anxiety
                            </label>
                            <select
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                              value={charSocialAnxiety}
                              onChange={(e) =>
                                setCharSocialAnxiety(e.target.value)
                              }
                            >
                              {["Neutral", "Outgoing", "Shy"].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-4 items-end">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Optimism
                            </label>
                            <select
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                              value={charOptimism}
                              onChange={(e) => setCharOptimism(e.target.value)}
                            >
                              {["Neutral", "Positive", "Negative"].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1 pb-2">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-sm">
                              <input
                                type="checkbox"
                                checked={charCanBeRomanced}
                                onChange={(e) =>
                                  setCharCanBeRomanced(e.target.checked)
                                }
                                className="accent-indigo-500 w-4 h-4 cursor-pointer"
                              />
                              Can Be Romanced
                            </label>
                          </div>
                        </div>

                        <div className="mt-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Home Location (Map Name)
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm mb-2"
                            value={charHomeLocation}
                            onChange={(e) =>
                              setCharHomeLocation(e.target.value)
                            }
                          />

                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-bold text-slate-500 mb-1">
                                Tile X
                              </label>
                              <input
                                type="text"
                                className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                                value={charHomeX}
                                onChange={(e) => setCharHomeX(e.target.value)}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-bold text-slate-500 mb-1">
                                Tile Y
                              </label>
                              <input
                                type="text"
                                className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                                value={charHomeY}
                                onChange={(e) => setCharHomeY(e.target.value)}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-bold text-slate-500 mb-1">
                                Direction
                              </label>
                              <select
                                className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                                value={charHomeDir}
                                onChange={(e) => setCharHomeDir(e.target.value)}
                              >
                                {["up", "down", "left", "right"].map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wide border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">
                          Optional Logic Fields
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Can Visit Island
                            </label>
                            <select
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                              value={charCanVisitIsland}
                              onChange={(e) =>
                                setCharCanVisitIsland(e.target.value)
                              }
                            >
                              <option value="omit">Omit (Default)</option>
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Spouse Adopts
                            </label>
                            <select
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                              value={charSpouseAdopts}
                              onChange={(e) =>
                                setCharSpouseAdopts(e.target.value)
                              }
                            >
                              <option value="omit">Omit (Default)</option>
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Introductions Quest
                            </label>
                            <select
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                              value={charIntroductionsQuest}
                              onChange={(e) =>
                                setCharIntroductionsQuest(e.target.value)
                              }
                            >
                              <option value="omit">Omit (Default)</option>
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Item Delivery Quests
                            </label>
                            <select
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                              value={charItemDeliveryQuests}
                              onChange={(e) =>
                                setCharItemDeliveryQuests(e.target.value)
                              }
                            >
                              <option value="omit">Omit (Default)</option>
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Winter Star Participant
                            </label>
                            <select
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm"
                              value={charWinterStarParticipant}
                              onChange={(e) =>
                                setCharWinterStarParticipant(e.target.value)
                              }
                            >
                              <option value="omit">Omit (Default)</option>
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-700 p-4 shadow-2xl z-50">
                  <div className="max-w-4xl mx-auto flex gap-4 items-center">
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Generated JSON
                        </label>
                      </div>
                      <textarea
                        className="w-full bg-slate-800 border border-slate-700 text-indigo-400 p-3 rounded font-mono text-sm resize-none outline-none focus:border-indigo-500 h-32"
                        readOnly
                        value={charCpJson}
                      />
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(charCpJson);
                        alert("Character Data JSON copied to clipboard!");
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-lg whitespace-nowrap shadow-lg transition-colors text-lg"
                    >
                      Copy Code
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        {activeTool === "gift" &&
          (() => {
            const generatedGiftString = `${giftTastes.love.dialogs
              .join("#")
              .replace(/"/g, '\\"')}/${
              giftTastes.love.items
            }/${giftTastes.like.dialogs.join("#").replace(/"/g, '\\"')}/${
              giftTastes.like.items
            }/${giftTastes.dislike.dialogs.join("#").replace(/"/g, '\\"')}/${
              giftTastes.dislike.items
            }/${giftTastes.hate.dialogs.join("#").replace(/"/g, '\\"')}/${
              giftTastes.hate.items
            }/${giftTastes.neutral.dialogs.join("#").replace(/"/g, '\\"')}/${
              giftTastes.neutral.items
            }/`;

            let giftCpJson = `{\n  "Action": "EditData",\n  "Target": "Data/NPCGiftTastes",\n  "Entries": {\n    "${giftNpcId}": "${generatedGiftString}"\n  }\n}`;

            if (itemSpecificDialogues.length > 0) {
              const specificEntriesStr = itemSpecificDialogues
                .filter((d) => d.itemOrTag && d.dialogue)
                .map(
                  (d) =>
                    `    "AcceptGift_${d.itemOrTag}": "${d.dialogue.replace(
                      /"/g,
                      '\\"'
                    )}"`
                )
                .join(",\n");

              if (specificEntriesStr) {
                giftCpJson = `[\n  ${giftCpJson},\n  {\n    "Action": "EditData",\n    "Target": "Characters/Dialogue/${giftNpcId}",\n    "Entries": {\n  ${specificEntriesStr}\n    }\n  }\n]`;
              }
            }

            const handleAddTasteDialogue = (tasteKey: string) => {
              setGiftTastes((prev) => ({
                ...prev,
                [tasteKey]: {
                  ...prev[tasteKey as keyof typeof prev],
                  dialogs: [...prev[tasteKey as keyof typeof prev].dialogs, ""],
                },
              }));
            };

            const handleUpdateTasteDialogue = (
              tasteKey: string,
              index: number,
              value: string
            ) => {
              setGiftTastes((prev) => {
                const newDialogs = [
                  ...prev[tasteKey as keyof typeof prev].dialogs,
                ];
                newDialogs[index] = value;
                return {
                  ...prev,
                  [tasteKey]: {
                    ...prev[tasteKey as keyof typeof prev],
                    dialogs: newDialogs,
                  },
                };
              });
            };

            const handleRemoveTasteDialogue = (
              tasteKey: string,
              index: number
            ) => {
              setGiftTastes((prev) => {
                const newDialogs = prev[
                  tasteKey as keyof typeof prev
                ].dialogs.filter((_, i) => i !== index);
                return {
                  ...prev,
                  [tasteKey]: {
                    ...prev[tasteKey as keyof typeof prev],
                    dialogs: newDialogs.length > 0 ? newDialogs : [""],
                  },
                };
              });
            };

            return (
              <div>
                <div className="max-w-4xl mx-auto">
                  <button
                    onClick={() => setActiveTool("home")}
                    className="mb-6 text-rose-600 dark:text-rose-400 font-bold hover:underline flex items-center gap-2"
                  >
                    Back to Toolkit Hub
                  </button>

                  <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
                    <div className="flex justify-between items-start mb-6">
                      <h1 className="text-3xl font-bold text-rose-700 dark:text-rose-400">
                        Gift Tastes Helper
                      </h1>
                      <a
                        href="https://mateusaquino.github.io/stardewids/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        Stardew IDs Reference
                      </a>
                    </div>

                    <div className="mb-8 border-b border-slate-200 dark:border-slate-700 pb-6">
                      <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                        NPC Internal ID
                      </label>
                      <input
                        type="text"
                        className="w-full md:w-1/2 border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                        value={giftNpcId}
                        onChange={(e) => setGiftNpcId(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-6">
                      {[
                        { key: "love", label: "Love", color: "pink" },
                        { key: "like", label: "Like", color: "emerald" },
                        { key: "neutral", label: "Neutral", color: "slate" },
                        { key: "dislike", label: "Dislike", color: "orange" },
                        { key: "hate", label: "Hate", color: "red" },
                      ].map((taste) => (
                        <div
                          key={taste.key}
                          className={`bg-${taste.color}-50 dark:bg-${taste.color}-900/10 border-l-4 border-${taste.color}-500 p-4 rounded-r shadow-sm`}
                        >
                          <h3
                            className={`text-${taste.color}-700 dark:text-${taste.color}-400 font-bold text-lg mb-3 flex items-center gap-2`}
                          >
                            [ {taste.label} ]
                          </h3>
                          <div className="flex flex-col gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                                Dialogue Responses (Randomized)
                              </label>
                              <div className="flex flex-col gap-2">
                                {giftTastes[
                                  taste.key as keyof typeof giftTastes
                                ].dialogs.map((dlg, i) => (
                                  <div
                                    key={i}
                                    className="flex gap-2 items-start"
                                  >
                                    <textarea
                                      className={`w-full border border-${taste.color}-200 dark:border-${taste.color}-800 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm h-12 resize-y`}
                                      value={dlg}
                                      placeholder="Supports standard text or {{i18n:key}} tokens"
                                      onChange={(e) =>
                                        handleUpdateTasteDialogue(
                                          taste.key,
                                          i,
                                          e.target.value
                                        )
                                      }
                                    />
                                    {giftTastes[
                                      taste.key as keyof typeof giftTastes
                                    ].dialogs.length > 1 && (
                                      <button
                                        onClick={() =>
                                          handleRemoveTasteDialogue(
                                            taste.key,
                                            i
                                          )
                                        }
                                        className="text-red-400 hover:text-red-600 font-bold px-2 py-2"
                                      >
                                        X
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={() =>
                                  handleAddTasteDialogue(taste.key)
                                }
                                className={`mt-2 text-xs font-bold text-${taste.color}-700 dark:text-${taste.color}-400 bg-${taste.color}-100 dark:bg-${taste.color}-900/40 px-2 py-1 rounded hover:bg-${taste.color}-200 dark:hover:bg-${taste.color}-900/60 transition-colors`}
                              >
                                + Add Randomized Line
                              </button>
                            </div>
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50">
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                Item IDs or Context Tags (Space Separated)
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 66 category_fish -5"
                                className={`w-full border border-${taste.color}-200 dark:border-${taste.color}-800 p-2 rounded bg-white dark:bg-slate-800 dark:text-white font-mono text-sm`}
                                value={
                                  giftTastes[
                                    taste.key as keyof typeof giftTastes
                                  ].items
                                }
                                onChange={(e) =>
                                  setGiftTastes({
                                    ...giftTastes,
                                    [taste.key]: {
                                      ...giftTastes[
                                        taste.key as keyof typeof giftTastes
                                      ],
                                      items: e.target.value,
                                    },
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-12 border-t-2 border-slate-200 dark:border-slate-700 pt-8">
                      <h2 className="text-2xl font-bold text-rose-700 dark:text-rose-400 mb-2">
                        Item-Specific Dialogue Responses
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                        Target dialogue for specific items or context tags (e.g.{" "}
                        <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
                          74
                        </code>{" "}
                        or{" "}
                        <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
                          category_artisan_goods
                        </code>
                        ).
                      </p>

                      <div className="flex flex-col gap-4">
                        {itemSpecificDialogues.map((spec, i) => (
                          <div
                            key={spec.id}
                            className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-200 dark:border-slate-700 flex gap-4 items-start"
                          >
                            <div className="w-1/3">
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                Item ID / Tag
                              </label>
                              <input
                                type="text"
                                className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white font-mono text-sm"
                                placeholder="e.g. 74"
                                value={spec.itemOrTag}
                                onChange={(e) => {
                                  const newSpecs = [...itemSpecificDialogues];
                                  newSpecs[i].itemOrTag = e.target.value;
                                  setItemSpecificDialogues(newSpecs);
                                }}
                              />
                            </div>
                            <div className="flex-grow">
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                Dialogue
                              </label>
                              <textarea
                                className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-sm h-10 resize-y"
                                value={spec.dialogue}
                                onChange={(e) => {
                                  const newSpecs = [...itemSpecificDialogues];
                                  newSpecs[i].dialogue = e.target.value;
                                  setItemSpecificDialogues(newSpecs);
                                }}
                              />
                            </div>
                            <button
                              onClick={() =>
                                setItemSpecificDialogues(
                                  itemSpecificDialogues.filter(
                                    (s) => s.id !== spec.id
                                  )
                                )
                              }
                              className="text-red-400 hover:text-red-600 font-bold mt-6"
                            >
                              X
                            </button>
                          </div>
                        ))}

                        <button
                          onClick={() =>
                            setItemSpecificDialogues([
                              ...itemSpecificDialogues,
                              { id: Date.now(), itemOrTag: "", dialogue: "" },
                            ])
                          }
                          className="self-start text-sm font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 px-4 py-2 rounded hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors"
                        >
                          + Add Specific Dialogue
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-700 p-4 shadow-2xl z-50">
                  <div className="max-w-4xl mx-auto flex gap-4 items-center">
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Generated JSON
                        </label>
                      </div>
                      <textarea
                        className="w-full bg-slate-800 border border-slate-700 text-rose-400 p-3 rounded font-mono text-sm resize-none outline-none focus:border-rose-500 h-32"
                        readOnly
                        value={giftCpJson}
                      />
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(giftCpJson);
                        alert("Gift Tastes JSON copied to clipboard!");
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 px-8 rounded-lg whitespace-nowrap shadow-lg transition-colors text-lg"
                    >
                      Copy Code
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        {activeTool === "event" && (
          <div>
            <datalist id="savedLocationsList">
              {savedLocations.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>

            <datalist id="savedActorsList">
              {savedActors.map((actor) => (
                <option key={actor} value={actor} />
              ))}
            </datalist>

            {showScriptPreview && (
              <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-8">
                <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-full rounded-xl flex flex-col md:flex-row overflow-hidden shadow-2xl">
                  <div className="w-full md:w-1/3 border-r border-slate-200 dark:border-slate-700 flex flex-col p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg">i18n Parser</h3>
                      <button
                        onClick={() => setShowScriptPreview(false)}
                        className="text-red-500 font-bold hover:text-red-700"
                      >
                        Close
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">
                      Paste your i18n JSON data here to replace keys in the
                      script view.
                    </p>
                    <textarea
                      className="flex-grow border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-mono text-sm rounded mb-4"
                      placeholder='{&#10;  "EventKey.1": "Hello!"&#10;}'
                      value={i18nText}
                      onChange={(e) => setI18nText(e.target.value)}
                    />
                    <button
                      onClick={handleParseI18n}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded"
                    >
                      Apply Translation
                    </button>
                  </div>
                  <div className="w-full md:w-2/3 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-950">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6 pb-2 border-b border-slate-300 dark:border-slate-700">
                      Event Script Preview
                    </h2>
                    <div className="flex flex-col gap-1 text-lg">
                      {timeline.map(renderScriptLine)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="max-w-4xl mx-auto mb-6">
              <button
                onClick={() => setActiveTool("home")}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-2"
              >
                Back to Toolkit Hub
              </button>
            </div>

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
                    Wiki: Event Data Documentation
                  </a>
                </div>
                <div className="flex gap-2 items-start relative">
                  <div className="relative">
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 px-4 rounded transition-colors"
                    >
                      Settings
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
                          Save Current as Default
                        </button>
                        <button
                          onClick={() => {
                            setShowScriptPreview(true);
                            setIsMenuOpen(false);
                          }}
                          className="px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-medium"
                        >
                          View Script Preview
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
                      "MyEvent/Time 600": "continue/-1000 -1000/farmer 0 0
                      0/pause 1000/end"
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
                      list="savedLocationsList"
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
                      <div className="flex-grow">
                        {renderConditionInputs(cond)}
                      </div>
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
                        type="text"
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                        value={viewport.x}
                        onChange={(e) =>
                          setViewport({ ...viewport, x: e.target.value })
                        }
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                        Camera Y
                      </label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                        value={viewport.y}
                        onChange={(e) =>
                          setViewport({ ...viewport, y: e.target.value })
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
                    <div
                      key={actor.id}
                      className="flex gap-2 mb-2 items-center"
                    >
                      <input
                        type="text"
                        list="savedActorsList"
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
                        type="text"
                        className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-2 w-16 rounded"
                        value={actor.x}
                        onChange={(e) =>
                          updateCastMember(actor.id, "x", e.target.value)
                        }
                      />
                      <span className="text-slate-400 text-sm">Y:</span>
                      <input
                        type="text"
                        className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-2 w-16 rounded"
                        value={actor.y}
                        onChange={(e) =>
                          updateCastMember(actor.id, "y", e.target.value)
                        }
                      />
                      <select
                        className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-2 rounded ml-2"
                        value={actor.facing}
                        onChange={(e) =>
                          updateCastMember(
                            actor.id,
                            "facing",
                            Number(e.target.value)
                          )
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
                          Up
                        </button>
                        <button
                          onClick={() => moveCommand(index, 1)}
                          disabled={index === timeline.length - 1}
                          className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30"
                        >
                          Down
                        </button>
                      </div>
                      <div className="flex-grow">
                        <div
                          className={`font-bold text-xs text-white inline-block px-2 py-1 rounded uppercase tracking-wider ${
                            ["quickQuestion", "question", "fork"].includes(
                              cmd.type
                            )
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
                            <option value="textAboveHead">
                              Text Above Head
                            </option>
                            <option value="emote">Emote</option>
                          </optgroup>
                          <optgroup label="Movement & Camera">
                            <option value="move">Move</option>
                            <option value="advancedMove">Advanced Move</option>
                            <option value="faceDirection">Turn</option>
                            <option value="warp">Warp</option>
                            <option value="pause">Pause</option>
                            <option value="viewportMove">Pan Camera</option>
                            <option value="shake">Shake</option>
                            <option value="globalFade">Fade Screen</option>
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
                            <option value="changeToTemporaryMap">
                              Temp Map
                            </option>
                            <option value="changeMapTile">
                              Change Map Tile
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
                            <option value="quickQuestion">
                              Question (Branched)
                            </option>
                            <option value="question">
                              Question (Null / Fork)
                            </option>
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
                        onClick={() =>
                          insertCommand("message", timeline.length)
                        }
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
                          insertCommand("advancedMove", timeline.length)
                        }
                        className="bg-white dark:bg-slate-800 border border-amber-500 text-amber-700 dark:text-amber-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm"
                      >
                        + Advanced Move
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
                        onClick={() =>
                          insertCommand("viewportMove", timeline.length)
                        }
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
                        onClick={() =>
                          insertCommand("addObject", timeline.length)
                        }
                        className="bg-white dark:bg-slate-800 border border-cyan-500 text-cyan-700 dark:text-cyan-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-sm"
                      >
                        + Object
                      </button>
                      <button
                        onClick={() =>
                          insertCommand("addBigProp", timeline.length)
                        }
                        className="bg-white dark:bg-slate-800 border border-cyan-500 text-cyan-700 dark:text-cyan-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-sm"
                      >
                        + Big Prop
                      </button>
                      <button
                        onClick={() =>
                          insertCommand("removeObject", timeline.length)
                        }
                        className="bg-white dark:bg-slate-800 border border-cyan-500 text-cyan-700 dark:text-cyan-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-sm"
                      >
                        + Remove Object
                      </button>
                      <button
                        onClick={() =>
                          insertCommand(
                            "removeTemporarySprites",
                            timeline.length
                          )
                        }
                        className="bg-white dark:bg-slate-800 border border-cyan-500 text-cyan-700 dark:text-cyan-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-sm"
                      >
                        + Clear Sprites
                      </button>
                      <button
                        onClick={() =>
                          insertCommand("changeToTemporaryMap", timeline.length)
                        }
                        className="bg-white dark:bg-slate-800 border border-cyan-500 text-cyan-700 dark:text-cyan-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-sm"
                      >
                        + Temp Map
                      </button>
                      <button
                        onClick={() =>
                          insertCommand("changeMapTile", timeline.length)
                        }
                        className="bg-white dark:bg-slate-800 border border-cyan-500 text-cyan-700 dark:text-cyan-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-sm"
                      >
                        + Change Map Tile
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                        Audio
                      </h4>
                      <button
                        onClick={() =>
                          insertCommand("playSound", timeline.length)
                        }
                        className="bg-white dark:bg-slate-800 border border-rose-500 text-rose-700 dark:text-rose-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm"
                      >
                        + Play Sound
                      </button>
                      <button
                        onClick={() =>
                          insertCommand("stopSound", timeline.length)
                        }
                        className="bg-white dark:bg-slate-800 border border-rose-500 text-rose-700 dark:text-rose-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm"
                      >
                        + Stop Sound
                      </button>
                      <button
                        onClick={() =>
                          insertCommand("playMusic", timeline.length)
                        }
                        className="bg-white dark:bg-slate-800 border border-rose-500 text-rose-700 dark:text-rose-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm"
                      >
                        + Play Music
                      </button>
                      <button
                        onClick={() =>
                          insertCommand("stopMusic", timeline.length)
                        }
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
                        onClick={() =>
                          insertCommand("question", timeline.length)
                        }
                        className="bg-white dark:bg-slate-800 border border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm"
                      >
                        + Question (Null/Fork)
                      </button>
                      <button
                        onClick={() =>
                          insertCommand("friendship", timeline.length)
                        }
                        className="bg-white dark:bg-slate-800 border border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold px-3 py-1.5 rounded text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm"
                      >
                        + Friendship
                      </button>
                      <button
                        onClick={() =>
                          insertCommand("addItem", timeline.length)
                        }
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
                        onClick={() =>
                          insertCommand("mailReceived", timeline.length)
                        }
                        className="bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-300 font-semibold px-3 py-1.5 rounded text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
                      >
                        + Set Mail Flag
                      </button>
                      <button
                        onClick={() =>
                          insertCommand("globalFade", timeline.length)
                        }
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
                  onClick={() => copyToClipboard(outputString)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-8 rounded-lg whitespace-nowrap shadow-lg transition-colors text-lg"
                >
                  Copy Event
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
