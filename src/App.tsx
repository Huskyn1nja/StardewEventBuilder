import { useState, useEffect } from "react";

interface Viewport {
  x: number;
  y: number;
}

interface Condition {
  id: number;
  type: string;
  payload: any;
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

export default function App() {
  const [showImport, setShowImport] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>("");
  const [exportAsCP, setExportAsCP] = useState<boolean>(false);

  const [eventId, setEventId] = useState<string>("MyMod_Event01");
  const [location, setLocation] = useState<string>("Railroad");
  const [conditions, setConditions] = useState<Condition[]>([
    { id: Date.now(), type: "Time", payload: { min: 600, max: 1200 } },
  ]);

  const [music, setMusic] = useState<string>("continue");
  const [viewport, setViewport] = useState<Viewport>({ x: -1000, y: -1000 });
  const [cast, setCast] = useState<CastMember[]>([
    { id: Date.now(), name: "farmer", x: 0, y: 0, facing: 0 },
  ]);

  const [timeline, setTimeline] = useState<Command[]>([]);
  const [outputString, setOutputString] = useState<string>("");

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
  ]);

  const compileEvent = () => {
    const conditionsString = conditions
      .map((cond) => {
        switch (cond.type) {
          case "Time":
            return `Time ${cond.payload.min} ${cond.payload.max}`;
          case "Friendship":
            return `Friendship ${cond.payload.actor} ${
              cond.payload.hearts * 250
            }`;
          case "Season":
            return `Season ${cond.payload.season}`;
          case "Weather":
            return `Weather ${cond.payload.weather}`;
          case "Custom":
            return cond.payload.text;
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

    const timelineString = timeline
      .map((cmd) => {
        switch (cmd.type) {
          case "speak":
            const safeText = cmd.payload.text.replace(/"/g, '\\"');
            return `speak ${cmd.payload.actor} \\"${safeText}\\"`;
          case "move":
            return `move ${cmd.payload.actor} ${cmd.payload.x} ${cmd.payload.y} ${cmd.payload.facing}`;
          case "pause":
            return `pause ${cmd.payload.duration}`;
          case "faceDirection":
            return `faceDirection ${cmd.payload.actor} ${cmd.payload.facing}`;
          case "emote":
            return `emote ${cmd.payload.actor} ${cmd.payload.emoteId}`;
          case "warp":
            return `warp ${cmd.payload.actor} ${cmd.payload.x} ${cmd.payload.y}`;
          case "globalFade":
            return "globalFade";
          case "end":
            return cmd.payload.style;
          case "customAction":
            return cmd.payload.text;
          default:
            return "";
        }
      })
      .join("/");

    const finalEvent = `"${key}": "${val}${timelineString}"`;

    if (exportAsCP) {
      setOutputString(
        `{\n  "Action": "EditData",\n  "Target": "Data/Events/${location}",\n  "Entries": {\n    ${finalEvent}\n  }\n}`
      );
    } else {
      setOutputString(finalEvent);
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
        const p = keyTokens[i].trim();
        if (!p) continue;

        if (p.startsWith("Time ") || p.startsWith("t ")) {
          const partsArray = p.split(" ");
          parsedConditions.push({
            id: Date.now() + i,
            type: "Time",
            payload: {
              min: parseInt(partsArray[1]),
              max: parseInt(partsArray[2]),
            },
          });
        } else if (p.startsWith("Friendship ") || p.startsWith("f ")) {
          const partsArray = p.split(" ");
          parsedConditions.push({
            id: Date.now() + i,
            type: "Friendship",
            payload: {
              actor: partsArray[1],
              hearts: Math.floor(parseInt(partsArray[2]) / 250),
            },
          });
        } else if (p.startsWith("Season ") || p.startsWith("z ")) {
          const partsArray = p.split(" ");
          parsedConditions.push({
            id: Date.now() + i,
            type: "Season",
            payload: { season: partsArray[1] },
          });
        } else if (p.startsWith("Weather ") || p.startsWith("w ")) {
          const partsArray = p.split(" ");
          parsedConditions.push({
            id: Date.now() + i,
            type: "Weather",
            payload: { weather: partsArray[1] },
          });
        } else if (p.startsWith("Spouse ") || p.startsWith("O ")) {
          const partsArray = p.split(" ");
          parsedConditions.push({
            id: Date.now() + i,
            type: "Custom",
            payload: { text: `Spouse ${partsArray[1]}` },
          });
        } else {
          parsedConditions.push({
            id: Date.now() + i,
            type: "Custom",
            payload: { text: p },
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
        for (let i = 3; i < scriptTokens.length; i++) {
          const cmdStr = scriptTokens[i];
          if (!cmdStr) continue;

          if (cmdStr.startsWith("speak ")) {
            const firstSpace = cmdStr.indexOf(" ");
            const secondSpace = cmdStr.indexOf(" ", firstSpace + 1);
            const actor = cmdStr.substring(firstSpace + 1, secondSpace);
            let text = cmdStr
              .substring(secondSpace + 1)
              .replace(/^\\"|\\"$/g, "");
            parsedTimeline.push({
              id: Date.now() + i,
              type: "speak",
              payload: { actor, text },
            });
          } else if (cmdStr.startsWith("move ")) {
            const partsArray = cmdStr.split(" ");
            parsedTimeline.push({
              id: Date.now() + i,
              type: "move",
              payload: {
                actor: partsArray[1],
                x: parseInt(partsArray[2]),
                y: parseInt(partsArray[3]),
                facing: parseInt(partsArray[4]),
              },
            });
          } else if (cmdStr.startsWith("pause ")) {
            const partsArray = cmdStr.split(" ");
            parsedTimeline.push({
              id: Date.now() + i,
              type: "pause",
              payload: { duration: parseInt(partsArray[1]) },
            });
          } else if (cmdStr.startsWith("faceDirection ")) {
            const partsArray = cmdStr.split(" ");
            parsedTimeline.push({
              id: Date.now() + i,
              type: "faceDirection",
              payload: {
                actor: partsArray[1],
                facing: parseInt(partsArray[2]),
              },
            });
          } else if (cmdStr.startsWith("warp ")) {
            const partsArray = cmdStr.split(" ");
            parsedTimeline.push({
              id: Date.now() + i,
              type: "warp",
              payload: {
                actor: partsArray[1],
                x: parseInt(partsArray[2]),
                y: parseInt(partsArray[3]),
              },
            });
          } else if (cmdStr.startsWith("emote ")) {
            const partsArray = cmdStr.split(" ");
            parsedTimeline.push({
              id: Date.now() + i,
              type: "emote",
              payload: {
                actor: partsArray[1],
                emoteId: parseInt(partsArray[2]),
              },
            });
          } else if (cmdStr === "globalFade") {
            parsedTimeline.push({
              id: Date.now() + i,
              type: "globalFade",
              payload: {},
            });
          } else if (cmdStr.startsWith("end")) {
            parsedTimeline.push({
              id: Date.now() + i,
              type: "end",
              payload: { style: cmdStr },
            });
          } else {
            parsedTimeline.push({
              id: Date.now() + i,
              type: "customAction",
              payload: { text: cmdStr },
            });
          }
        }
        setTimeline(parsedTimeline);
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
      setEventId("MyMod_Event01");
      setLocation("Railroad");
      setConditions([
        { id: Date.now(), type: "Time", payload: { min: 600, max: 1200 } },
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
    setConditions([...conditions, { id: Date.now(), type, payload }]);
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

  const insertCommand = (type: string, index: number) => {
    const defaultActor = cast.length > 0 ? cast[0].name : "";
    let payload: any = {};
    switch (type) {
      case "speak":
        payload = { actor: defaultActor, text: "" };
        break;
      case "move":
        payload = { actor: defaultActor, x: 0, y: 0, facing: 2 };
        break;
      case "pause":
        payload = { duration: 1000 };
        break;
      case "faceDirection":
        payload = { actor: defaultActor, facing: 2 };
        break;
      case "emote":
        payload = { actor: defaultActor, emoteId: 8 };
        break;
      case "warp":
        payload = { actor: defaultActor, x: 0, y: 0 };
        break;
      case "end":
        payload = { style: "end" };
        break;
      case "customAction":
        payload = { text: "" };
        break;
      case "globalFade":
        payload = {};
        break;
      default:
        break;
    }
    const newCommand: Command = { id: Date.now(), type, payload };
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
              className="border border-slate-300 p-1 w-20 rounded"
              value={cond.payload.min}
              onChange={(e) =>
                updateCondition(cond.id, "min", Number(e.target.value))
              }
            />
            <span>and</span>
            <input
              type="number"
              className="border border-slate-300 p-1 w-20 rounded"
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
              className="border border-slate-300 p-1 rounded"
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
              className="border border-slate-300 p-1 w-16 rounded"
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
              className="border border-slate-300 p-1 rounded"
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
              className="border border-slate-300 p-1 rounded"
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
              className="border border-slate-300 p-1 rounded flex-grow"
              value={cond.payload.text}
              onChange={(e) => updateCondition(cond.id, "text", e.target.value)}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const renderCommandInputs = (cmd: Command) => {
    const actorDropdown = (
      <select
        className="border border-slate-300 p-1 mx-2 rounded"
        value={cmd.payload.actor}
        onChange={(e) => updateCommand(cmd.id, "actor", e.target.value)}
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
        className="border border-slate-300 p-1 mx-2 rounded"
        value={cmd.payload.facing}
        onChange={(e) =>
          updateCommand(cmd.id, "facing", Number(e.target.value))
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
              className="border border-slate-300 p-2 rounded w-full h-20"
              value={cmd.payload.text}
              onChange={(e) => updateCommand(cmd.id, "text", e.target.value)}
            />
            <span
              className={`text-sm ${
                cmd.payload.text?.length > 177
                  ? "text-red-500 font-bold"
                  : "text-slate-500"
              }`}
            >
              Characters: {cmd.payload.text?.length || 0} / 177
            </span>
          </div>
        );
      case "move":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Actor:</span> {actorDropdown}
            <span>X Offset:</span>
            <input
              type="number"
              className="border border-slate-300 p-1 w-16 rounded"
              value={cmd.payload.x}
              onChange={(e) =>
                updateCommand(cmd.id, "x", Number(e.target.value))
              }
            />
            <span>Y Offset:</span>
            <input
              type="number"
              className="border border-slate-300 p-1 w-16 rounded"
              value={cmd.payload.y}
              onChange={(e) =>
                updateCommand(cmd.id, "y", Number(e.target.value))
              }
            />
            <span>Facing:</span> {facingDropdown}
          </div>
        );
      case "pause":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Duration (ms):</span>
            <input
              type="number"
              className="border border-slate-300 p-1 w-24 rounded"
              value={cmd.payload.duration}
              onChange={(e) =>
                updateCommand(cmd.id, "duration", Number(e.target.value))
              }
            />
          </div>
        );
      case "faceDirection":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Actor:</span> {actorDropdown}
            <span>Facing:</span> {facingDropdown}
          </div>
        );
      case "emote":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Actor:</span> {actorDropdown}
            <span>Emote:</span>
            <select
              className="border border-slate-300 p-1 mx-2 rounded"
              value={cmd.payload.emoteId}
              onChange={(e) =>
                updateCommand(cmd.id, "emoteId", Number(e.target.value))
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
          </div>
        );
      case "warp":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Actor:</span> {actorDropdown}
            <span>X:</span>
            <input
              type="number"
              className="border border-slate-300 p-1 w-16 rounded"
              value={cmd.payload.x}
              onChange={(e) =>
                updateCommand(cmd.id, "x", Number(e.target.value))
              }
            />
            <span>Y:</span>
            <input
              type="number"
              className="border border-slate-300 p-1 w-16 rounded"
              value={cmd.payload.y}
              onChange={(e) =>
                updateCommand(cmd.id, "y", Number(e.target.value))
              }
            />
          </div>
        );
      case "globalFade":
        return (
          <div className="text-slate-600 italic mt-2">
            Screen will fade to black.
          </div>
        );
      case "end":
        return (
          <div className="flex items-center gap-2 mt-2">
            <span>Ending Type:</span>
            <select
              className="border border-slate-300 p-1 mx-2 rounded"
              value={cmd.payload.style}
              onChange={(e) => updateCommand(cmd.id, "style", e.target.value)}
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
              className="border border-slate-300 p-1 rounded flex-grow"
              value={cmd.payload.text}
              onChange={(e) => updateCommand(cmd.id, "text", e.target.value)}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8 pb-48 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-emerald-700">
            Stardew Event Builder
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 px-4 rounded transition-colors"
            >
              Reset All
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded transition-colors"
            >
              {showImport ? "Close Import" : "Import Existing Event"}
            </button>
          </div>
        </div>

        {showImport && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-bold text-amber-800 mb-2">
              Import from Content.json
            </h3>
            <p className="text-sm text-amber-700 mb-3">
              Paste a full event line here. (e.g.,{" "}
              <code>
                "MyEvent/Time 600": "continue/-1000 -1000/farmer 0 0 0/pause
                1000/end"
              </code>
              )
            </p>
            <textarea
              className="w-full border border-amber-300 p-2 rounded h-24 mb-2 font-mono text-sm"
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

        <section className="mb-8 border-b border-slate-200 pb-6">
          <h2 className="text-xl font-semibold mb-4 text-slate-700">
            1. Event Details
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-slate-600">
                Event ID (Unique Name)
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 p-2 rounded bg-slate-50"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-slate-600">
                Target Location (Map Name)
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 p-2 rounded bg-slate-50"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded border border-slate-200">
            <h3 className="font-bold mb-3 text-sm text-slate-600 uppercase tracking-wide">
              Required Conditions to Trigger
            </h3>
            {conditions.map((cond) => (
              <div
                key={cond.id}
                className="flex gap-4 mb-3 items-center bg-white p-2 border border-slate-200 rounded"
              >
                <div className="font-bold text-emerald-600 text-sm w-24">
                  {cond.type}
                </div>
                <div className="flex-grow">{renderConditionInputs(cond)}</div>
                <button
                  onClick={() => removeCondition(cond.id)}
                  className="text-red-400 hover:text-red-600 px-2 font-bold"
                >
                  X
                </button>
              </div>
            ))}
            <div className="flex gap-2 mt-4">
              <span className="text-sm text-slate-500 self-center mr-2">
                Add Requirement:
              </span>
              <button
                onClick={() => addCondition("Time")}
                className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded text-sm font-bold"
              >
                + Time
              </button>
              <button
                onClick={() => addCondition("Friendship")}
                className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded text-sm font-bold"
              >
                + Friendship
              </button>
              <button
                onClick={() => addCondition("Season")}
                className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded text-sm font-bold"
              >
                + Season
              </button>
              <button
                onClick={() => addCondition("Weather")}
                className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded text-sm font-bold"
              >
                + Weather
              </button>
              <button
                onClick={() => addCondition("Custom")}
                className="bg-slate-200 text-slate-700 px-3 py-1 rounded text-sm font-bold"
              >
                + Custom Condition
              </button>
            </div>
          </div>
        </section>

        <section className="mb-8 border-b border-slate-200 pb-6">
          <h2 className="text-xl font-semibold mb-4 text-slate-700">
            2. Scene Setup & Cast List
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-slate-600">
                Background Music
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 p-2 rounded bg-slate-50"
                value={music}
                onChange={(e) => setMusic(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="w-1/2">
                <label className="block text-sm font-bold mb-1 text-slate-600">
                  Camera X
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-300 p-2 rounded bg-slate-50"
                  value={viewport.x}
                  onChange={(e) =>
                    setViewport({ ...viewport, x: Number(e.target.value) })
                  }
                />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-bold mb-1 text-slate-600">
                  Camera Y
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-300 p-2 rounded bg-slate-50"
                  value={viewport.y}
                  onChange={(e) =>
                    setViewport({ ...viewport, y: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded border border-slate-200">
            <h3 className="font-bold mb-3 text-sm text-slate-600 uppercase tracking-wide">
              Starting Actors
            </h3>
            {cast.map((actor) => (
              <div key={actor.id} className="flex gap-2 mb-2 items-center">
                <input
                  type="text"
                  className="border border-slate-300 p-2 w-1/3 rounded"
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
                  className="border border-slate-300 p-2 w-16 rounded"
                  value={actor.x}
                  onChange={(e) =>
                    updateCastMember(actor.id, "x", Number(e.target.value))
                  }
                />
                <span className="text-slate-400 text-sm">Y:</span>
                <input
                  type="number"
                  className="border border-slate-300 p-2 w-16 rounded"
                  value={actor.y}
                  onChange={(e) =>
                    updateCastMember(actor.id, "y", Number(e.target.value))
                  }
                />
                <select
                  className="border border-slate-300 p-2 rounded ml-2"
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
              className="mt-3 bg-emerald-100 text-emerald-700 px-4 py-2 rounded text-sm font-bold"
            >
              + Add Character
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-slate-700">
            3. Timeline Workspace
          </h2>
          <div className="flex flex-col gap-3">
            {timeline.map((cmd, index) => (
              <div
                key={cmd.id}
                className="border border-slate-200 rounded-lg p-4 bg-slate-50 shadow-sm flex items-start gap-4"
              >
                <div className="flex flex-col gap-1 mt-1">
                  <button
                    onClick={() => moveCommand(index, -1)}
                    disabled={index === 0}
                    className="text-slate-400 hover:text-emerald-600 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveCommand(index, 1)}
                    disabled={index === timeline.length - 1}
                    className="text-slate-400 hover:text-emerald-600 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <div className="flex-grow">
                  <div className="font-bold text-xs text-white bg-emerald-500 inline-block px-2 py-1 rounded uppercase tracking-wider">
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
                    className="text-xs border border-slate-300 rounded p-1 text-slate-600 bg-white"
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
                    <option value="speak">Speak</option>
                    <option value="move">Move</option>
                    <option value="pause">Pause</option>
                    <option value="faceDirection">Turn</option>
                    <option value="warp">Warp</option>
                    <option value="emote">Emote</option>
                    <option value="globalFade">Fade Screen</option>
                    <option value="customAction">Custom Action</option>
                    <option value="end">End Event</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-slate-100 p-4 rounded-lg border border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wide">
              Add an Action
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => insertCommand("speak", timeline.length)}
                className="bg-white border border-emerald-500 text-emerald-700 font-semibold px-4 py-2 rounded"
              >
                + Speak
              </button>
              <button
                onClick={() => insertCommand("move", timeline.length)}
                className="bg-white border border-emerald-500 text-emerald-700 font-semibold px-4 py-2 rounded"
              >
                + Move
              </button>
              <button
                onClick={() => insertCommand("pause", timeline.length)}
                className="bg-white border border-emerald-500 text-emerald-700 font-semibold px-4 py-2 rounded"
              >
                + Pause
              </button>
              <button
                onClick={() => insertCommand("faceDirection", timeline.length)}
                className="bg-white border border-emerald-500 text-emerald-700 font-semibold px-4 py-2 rounded"
              >
                + Turn
              </button>
              <button
                onClick={() => insertCommand("warp", timeline.length)}
                className="bg-white border border-emerald-500 text-emerald-700 font-semibold px-4 py-2 rounded"
              >
                + Warp
              </button>
              <button
                onClick={() => insertCommand("emote", timeline.length)}
                className="bg-white border border-emerald-500 text-emerald-700 font-semibold px-4 py-2 rounded"
              >
                + Emote
              </button>
              <button
                onClick={() => insertCommand("globalFade", timeline.length)}
                className="bg-white border border-slate-400 text-slate-700 font-semibold px-4 py-2 rounded"
              >
                + Fade Screen
              </button>
              <button
                onClick={() => insertCommand("customAction", timeline.length)}
                className="bg-white border border-slate-400 text-slate-700 font-semibold px-4 py-2 rounded"
              >
                + Custom Action
              </button>
              <button
                onClick={() => insertCommand("end", timeline.length)}
                className="bg-red-50 border border-red-500 text-red-700 font-semibold px-4 py-2 rounded"
              >
                + End Event
              </button>
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
