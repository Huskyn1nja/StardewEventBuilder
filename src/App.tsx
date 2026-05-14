import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { STARDEW_DICTIONARY } from "./dictionary";

const ACTOR_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#10b981",
  "#a855f7",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#f43f5e",
  "#8b5cf6",
];

type ToolView =
  | "home"
  | "event"
  | "character"
  | "gift"
  | "animation"
  | "schedule"
  | "wizard"
  | "quests"
  | "non_npc_home"
  | "chair_tiles"
  | "dialogue"
  | "shop"
  | "trash_cans"
  | "item_builder";

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
interface SchedulePoint {
  id: number;
  time: string;
  location: string;
  x: number | string;
  y: number | string;
  facing: number | string;
  animOrDialogue: string;
}
interface ShopDialogue {
  id: string;
  dialogue: string;
  randomDialogue: string;
  condition: string;
}
interface ShopOwner {
  id: number;
  name: string;
  entryId: string;
  condition: string;
  portrait: string;
  closedMessage: string;
  dialogues: ShopDialogue[];
  randomizeDialogueOnOpen: boolean;
  openTime: string;
  closeTime: string;
  dayOfWeek: string[];
}

interface ShopItem {
  id: number;
  entryId: string;
  itemId: string;
  price: number | string;
  condition: string;
  tradeItemId: string;
  tradeItemAmount: number | string;
  availableStock: number | string;
  availableStockLimit: "Global" | "Player" | "None";
  perItemCondition: string;
  avoidRepeat?: boolean;
  useObjectDataPrice?: boolean;
  ignoreShopPriceModifiers?: boolean;
  applyProfitMargins?: string;
  actionsOnPurchase?: string;
}

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolView>("home");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("darkMode");
        if (saved !== null) return JSON.parse(saved);
      } catch {}
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
    try {
      const saved = localStorage.getItem("savedLocations");
      return saved !== null
        ? JSON.parse(saved)
        : ["Railroad", "Town", "Farm", "Saloon", "Mountain"];
    } catch {
      return ["Railroad", "Town", "Farm", "Saloon", "Mountain"];
    }
  });

  const [savedActors, setSavedActors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("savedActors");
      return saved !== null
        ? JSON.parse(saved)
        : ["farmer", "Abigail", "Penny", "Sebastian", "Haley", "Alex"];
    } catch {
      return ["farmer", "Abigail", "Penny", "Sebastian", "Haley", "Alex"];
    }
  });

  const [exportAsCP, setExportAsCP] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("defaultExportAsCP");
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [isSkippable, setIsSkippable] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("defaultSkippable");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [eventId, setEventId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("defaultEventId");
      return saved !== null ? JSON.parse(saved) : "{{ModId}}_Event01";
    } catch {
      return "{{ModId}}_Event01";
    }
  });

  const [location, setLocation] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("defaultLocation");
      return saved !== null ? JSON.parse(saved) : "Railroad";
    } catch {
      return "Railroad";
    }
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
    love: { dialogs: ["I love this so much I'm going to name my firstborn child after it!"], items: "66 128 220", },
    like: { dialogs: ["Thanks! I'm going to put this on my shelf of 'Things That Are Okay' right between my beige socks and a cool rock I found."], items: "-5 -75", },
    neutral: { dialogs: ["I'm going to stare at this until I figure out what I'm supposed to do with it."], items: "" },
    dislike: { dialogs: ["Error 404: Appreciation not found."], items: "-79 16", },
    hate: { dialogs: ["Wut?"], items: "330" },
  });
  const [itemSpecificDialogues, setItemSpecificDialogues] = useState<
    ItemSpecificDialogue[]
  >([]);

  const [charId, setCharId] = useState("");
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

  const [animImage, setAnimImage] = useState<string | null>(null);
  const [animImageWidth, setAnimImageWidth] = useState<number>(0);
  const [animImageHeight, setAnimImageHeight] = useState<number>(0);
  const [spriteWidth, setSpriteWidth] = useState<number>(16);
  const [spriteHeight, setSpriteHeight] = useState<number>(32);
  const [animDuration, setAnimDuration] = useState<number>(250);
  const [animEntry, setAnimEntry] = useState<number[]>([]);
  const [animRepeat, setAnimRepeat] = useState<number[]>([]);
  const [animLeaving, setAnimLeaving] = useState<number[]>([]);
  const [hasAdvancedPhases, setHasAdvancedPhases] = useState<boolean>(false);
  const [currentPreviewFrame, setCurrentPreviewFrame] = useState<number>(0);
  const [animName, setAnimName] = useState<string>("custom_anim");
  const [animMessage, setAnimMessage] = useState<string>("");
  const [animLayingDown, setAnimLayingDown] = useState<boolean>(false);
  const [animOffsetX, setAnimOffsetX] = useState<number>(0);
  const [animOffsetY, setAnimOffsetY] = useState<number>(0);
  const [draggedFrame, setDraggedFrame] = useState<{
    phase: "entry" | "repeat" | "leaving";
    index: number;
  } | null>(null);

  const [mapData, setMapData] = useState<{
    width: number;
    height: number;
    buildings: { x: number; y: number }[];
    warps: { x: number; y: number }[];
  }>({ width: 60, height: 60, buildings: [], warps: [] });
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [draggingActorId, setDraggingActorId] = useState<number | null>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const [schedules, setSchedules] = useState<Record<string, SchedulePoint[]>>({
    spring: [
      {
        id: Date.now(),
        time: "900",
        location: "Town",
        x: 50,
        y: 50,
        facing: 2,
        animOrDialogue: "",
      },
    ],
  });
  const [activeScheduleKey, setActiveScheduleKey] = useState<string>("spring");
  const [newScheduleKey, setNewScheduleKey] = useState<string>("");
  const [wizardStep, setWizardStep] = useState<number>(1);

  const [questFormat, setQuestFormat] = useState<"quest" | "special_order">(
    "quest"
  );
  const [questId, setQuestId] = useState("MyMod_Quest1");
  const [questType, setQuestType] = useState("ItemDelivery");
  const [questTitle, setQuestTitle] = useState("A Simple Request");
  const [questDesc, setQuestDesc] = useState("Please bring me an item.");
  const [questObj, setQuestObj] = useState("388");
  const [questObjAmount, setQuestObjAmount] = useState(1);
  const [questReward, setQuestReward] = useState(100);
  const [questNpc, setQuestNpc] = useState("Abigail");
  const [questDialogue, setQuestDialogue] = useState(
    "Thanks for bringing me this!"
  );

  const [chairTiles, setChairTiles] = useState<any[]>([
    {
      id: Date.now(),
      tilesheet: "townInterior",
      x: 9,
      y: 16,
      width: 1,
      height: 1,
      direction: "down",
      type: "chair",
      drawX: -1,
      drawY: -1,
      seasonal: false,
      altTilesheet: "",
    },
  ]);

  const [dialogueEntries, setDialogueEntries] = useState<
    { id: number; key: string; value: string }[]
  >([]);
  const [dialogueImport, setDialogueImport] = useState("");
  const [useBasicDialogue, setUseBasicDialogue] = useState<boolean>(false);
  const [useAdvancedDialogue, setUseAdvancedDialogue] =
    useState<boolean>(false);
  const [useMarriageDialogue, setUseMarriageDialogue] =
    useState<boolean>(false);
  const [npcDialogueType, setNpcDialogueType] = useState<"modded" | "vanilla">(
    "modded"
  );
  const [dialogueModId, setDialogueModId] = useState("MyMod.Modname");

  const [shopId, setShopId] = useState("MyMod_CustomShop");
  const [shopCurrency, setShopCurrency] = useState("0");
  const [shopOwners, setShopOwners] = useState<ShopOwner[]>([
    {
      id: Date.now(),
      name: "Any",
      entryId: "",
      condition: "",
      openTime: "600",
      closeTime: "2600",
      dayOfWeek: [],
      portrait: "",
      closedMessage: "",
      randomizeDialogueOnOpen: true,
      dialogues: [
        {
          id: "Default",
          dialogue: "Khajit has wares if you have coin.",
          randomDialogue: "",
          condition: "",
        },
      ],
    },
  ]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([
    {
      id: Date.now(),
      entryId: `{{ModIdd}}_`,
      itemId: "(O)388",
      price: "",
      condition: "",
      tradeItemId: "",
      tradeItemAmount: "",
      availableStock: "-1",
      availableStockLimit: "Global",
      perItemCondition: "",
    },
  ]);

  const shopJsonString = useMemo(() => {
    const itemsData = shopItems.map((item) => {
      const entry: any = { Id: item.entryId, ItemId: item.itemId };
      if (item.price) entry.Price = parseInt(item.price.toString());
      if (item.condition) entry.Condition = item.condition;
      if (item.avoidRepeat) entry.AvoidRepeat = true;
      if (item.useObjectDataPrice) entry.UseObjectDataPrice = true;
      if (item.ignoreShopPriceModifiers) entry.IgnoreShopPriceModifiers = true;
      if (item.applyProfitMargins && item.applyProfitMargins !== "null")
        entry.ApplyProfitMargins = item.applyProfitMargins === "true";
      if (item.actionsOnPurchase)
        entry.ActionsOnPurchase = item.actionsOnPurchase
          .split("\n")
          .filter((l) => l.trim() !== "");
      if (item.tradeItemId) {
        entry.TradeItemId = item.tradeItemId;
        entry.TradeItemAmount = parseInt(item.tradeItemAmount.toString()) || 1;
      }
      if (item.availableStock && item.availableStock !== "-1") {
        entry.AvailableStock = parseInt(item.availableStock.toString());
      }
      if (item.availableStockLimit !== "Global") {
        entry.AvailableStockLimit = item.availableStockLimit;
      }
      if (item.perItemCondition) entry.PerItemCondition = item.perItemCondition;
      return entry;
    });
    const ownersData = shopOwners.map((owner) => {
      const entry: any = { Name: owner.name };
      if (owner.entryId) entry.Id = owner.entryId;

      let builtCondition = "";
      if (owner.openTime || owner.closeTime) {
        const start = owner.openTime || "600";
        const end = owner.closeTime || "2600";
        builtCondition += `TIME ${start} ${end}`;
      }
      if (owner.dayOfWeek && owner.dayOfWeek.length > 0) {
        builtCondition +=
          (builtCondition ? " " : "") +
          `DAY_OF_WEEK ${owner.dayOfWeek.join(" ")}`;
      }
      if (owner.condition) {
        builtCondition += (builtCondition ? " " : "") + owner.condition;
      }

      if (builtCondition) entry.Condition = builtCondition;
      if (owner.portrait) entry.Portrait = owner.portrait;
      if (owner.closedMessage) entry.ClosedMessage = owner.closedMessage;
      if (!owner.randomizeDialogueOnOpen) entry.RandomizeDialogueOnOpen = false;

      if (owner.dialogues && owner.dialogues.length > 0) {
        entry.Dialogues = owner.dialogues.map((d) => {
          const dEntry: any = { Id: d.id };
          if (d.dialogue) dEntry.Dialogue = d.dialogue;
          if (d.randomDialogue) {
            dEntry.RandomDialogue = d.randomDialogue
              .split("\n")
              .filter((line) => line.trim() !== "");
          }
          if (d.condition) dEntry.Condition = d.condition;
          return dEntry;
        });
      }
      return entry;
    });
    return JSON.stringify(
      {
        Action: "EditData",
        Target: "Data/Shops",
        Entries: {
          [shopId]: {
            Currency: parseInt(shopCurrency) || 0,
            Owners: ownersData,
            Items: itemsData,
          },
        },
      },
      null,
      2
    );
  }, [shopId, shopCurrency, shopItems, shopOwners]);

  const [trashCans, setTrashCans] = useState<any[]>([
    {
      id: Date.now(),
      canId: "{{ModId}}_Carpenter",
      drops: [
        {
          id: Date.now() + 1,
          dropId: "{{ModId}}_Pufferfish",
          itemId: "(O)128",
          chance: "0.25",
          condition: "",
          ignoreBaseChance: false,
          isMegaSuccess: false,
          isDoubleMegaSuccess: false,
          addToInventoryDirectly: false,
          createMultipleDebris: false,
        },
      ],
    },
  ]);
  const [itemType, setItemType] = useState<
    "Object" | "BigCraftable" | "Recipe" | "Machine"
  >("Object");
  const [itemIdBuilder, setItemIdBuilder] = useState("MyMod_Item");
  const [itemName, setItemName] = useState("Custom Item");
  const [itemDisplayName, setItemDisplayName] = useState("Custom Item");
  const [itemDesc, setItemDesc] = useState("What it do?");
  const [itemPrice, setItemPrice] = useState(100);
  const [itemCategory, setItemCategory] = useState("-7");
  const [itemEdibility, setItemEdibility] = useState(-300);

  const [bcFragility, setBcFragility] = useState<number>(0);
  const [bcCanBePlacedIndoors, setBcCanBePlacedIndoors] =
    useState<boolean>(true);
  const [bcCanBePlacedOutdoors, setBcCanBePlacedOutdoors] =
    useState<boolean>(true);
  const [bcIsLamp, setBcIsLamp] = useState<boolean>(false);
  const [machineRules, setMachineRules] = useState([
    {
      id: "Default",
      trigger: "ItemPlacedInMachine",
      reqItemId: "(O)388",
      reqTags: "",
      reqCount: 1,
      condition: "",
      outItemId: "(O)334",
      outMinStack: 1,
      outMaxStack: 1,
      preserveType: "",
      preserveId: "",
      copyColor: false,
      copyPrice: false,
      copyQuality: false,
      minsReady: 60,
      daysReady: 0,
      recalculate: false,
    },
  ]);

  const [machineProps, setMachineProps] = useState({
    allowFairyDust: true,
    readyTimeModifierMode: "Stack",
    onlyCompleteOvernight: false,
    allowLoadWhenFull: false,
    clearContentsOvernightCondition: "",
    workingEffectChance: 0.33,
    wobbleWhileWorking: false,
    showNextIndexWhileWorking: false,
    showNextIndexWhenReady: false,
    invalidItemMessage: "",
    invalidCountMessage: "",
    interactMethod: "",
    hasInput: false,
    hasOutput: false,
    isIncubator: false,
    experienceGainOnHarvest: "",
  });

  const [recipeType, setRecipeType] = useState<"Cooking" | "Crafting">(
    "Cooking"
  );
  const [recipeIngredients, setRecipeIngredients] = useState<
    { id: string; amount: number }[]
  >([{ id: "246", amount: 1 }]);
  const [recipeYield, setRecipeYield] = useState("MyMod_Item");
  const [recipeYieldAmount, setRecipeYieldAmount] = useState(1);
  const [recipeUnlockType, setRecipeUnlockType] = useState<
    "default" | "null" | "skill" | "friendship"
  >("default");
  const [recipeUnlockParam, setRecipeUnlockParam] = useState("Farming 1");

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return STARDEW_DICTIONARY.filter((item: any) => {
      const categoryTag = item.category
        ? `category_${item.category.toLowerCase().replace(/\s+/g, "_")}`
        : "";
      return (
        item.name?.toLowerCase().includes(query) ||
        item.id?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        categoryTag.includes(query) ||
        item.tags?.some((tag: string) => tag?.toLowerCase().includes(query))
      );
    });
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
        if (
          ["gift", "quests", "shop", "trash_cans", "item_builder"].includes(
            activeTool
          )
        ) {
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

  const activeAnimFrames = useMemo(() => {
    return hasAdvancedPhases
      ? [...animEntry, ...animRepeat, ...animLeaving]
      : [...animRepeat];
  }, [animEntry, animRepeat, animLeaving, hasAdvancedPhases]);

  useEffect(() => {
    const total = activeAnimFrames.length;
    if (total === 0) return;
    const interval = setInterval(() => {
      setCurrentPreviewFrame((prev: number) => {
        const next = prev + 1;
        if (next >= total) {
          if (hasAdvancedPhases && animRepeat.length > 0)
            return animEntry.length;
          return 0;
        }
        return next;
      });
    }, animDuration);
    return () => clearInterval(interval);
  }, [
    activeAnimFrames.length,
    animEntry.length,
    animRepeat.length,
    animDuration,
    hasAdvancedPhases,
  ]);
  const generatedAnimString = useMemo(() => {
    let parts = hasAdvancedPhases
      ? [animEntry.join(" "), animRepeat.join(" "), animLeaving.join(" ")]
      : ["", animRepeat.join(" "), ""];
    const hasOffset = animOffsetX !== 0 || animOffsetY !== 0;
    if (animMessage || animLayingDown || hasOffset) {
      parts.push(animMessage);
    }
    if (animLayingDown) {
      parts.push("laying_down");
    }
    if (hasOffset) {
      parts.push(`offset ${animOffsetX} ${animOffsetY}`);
    }
    return parts.join("/");
  }, [
    animEntry,
    animRepeat,
    animLeaving,
    hasAdvancedPhases,
    animMessage,
    animLayingDown,
    animOffsetX,
    animOffsetY,
  ]);

  useEffect(() => {
    if (activeTool !== "event" || !mapCanvasRef.current) return;
    const ctx = mapCanvasRef.current.getContext("2d");
    if (!ctx) return;

    const TILE_SIZE = 16;
    mapCanvasRef.current.width = mapData.width * TILE_SIZE;
    mapCanvasRef.current.height = mapData.height * TILE_SIZE;

    ctx.fillStyle = isDarkMode ? "#0f172a" : "#f8fafc";
    ctx.fillRect(0, 0, mapCanvasRef.current.width, mapCanvasRef.current.height);

    ctx.strokeStyle = isDarkMode ? "#1e293b" : "#e2e8f0";
    ctx.lineWidth = 1;
    for (let x = 0; x <= mapData.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * TILE_SIZE, 0);
      ctx.lineTo(x * TILE_SIZE, mapData.height * TILE_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= mapData.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE_SIZE);
      ctx.lineTo(mapData.width * TILE_SIZE, y * TILE_SIZE);
      ctx.stroke();
    }

    ctx.fillStyle = isDarkMode ? "#334155" : "#64748b";
    mapData.buildings.forEach((b) => {
      ctx.fillRect(b.x * TILE_SIZE, b.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });

    ctx.fillStyle = "#eab308";
    mapData.warps.forEach((w) => {
      ctx.fillRect(w.x * TILE_SIZE, w.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });

    cast.forEach((actor, idx) => {
      const ax = Number(actor.x) || 0;
      const ay = Number(actor.y) || 0;
      const color = ACTOR_COLORS[idx % ACTOR_COLORS.length];

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(
        ax * TILE_SIZE + TILE_SIZE / 2,
        ay * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE / 2.5,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const initial =
        actor.name && actor.name.length > 0
          ? actor.name.charAt(0).toUpperCase()
          : "?";
      ctx.fillText(
        initial,
        ax * TILE_SIZE + TILE_SIZE / 2,
        ay * TILE_SIZE + TILE_SIZE / 2
      );
    });
  }, [mapData, cast, activeTool, isDarkMode]);

  const updateCastMember = (id: number, field: string, value: any) =>
    setCast((prevCast) =>
      prevCast.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!mapCanvasRef.current) return;
    const rect = mapCanvasRef.current.getBoundingClientRect();
    const scaleX = mapCanvasRef.current.width / rect.width;
    const scaleY = mapCanvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const tileX = Math.floor(x / 16);
    const tileY = Math.floor(y / 16);

    const actor = cast.find(
      (a) => Number(a.x) === tileX && Number(a.y) === tileY
    );
    if (actor) {
      setDraggingActorId(actor.id);
    } else {
      isPanning.current = true;
      if (mapContainerRef.current) {
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: mapContainerRef.current.scrollLeft,
          scrollTop: mapContainerRef.current.scrollTop,
        };
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingActorId !== null && mapCanvasRef.current) {
      const rect = mapCanvasRef.current.getBoundingClientRect();
      const scaleX = mapCanvasRef.current.width / rect.width;
      const scaleY = mapCanvasRef.current.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const tileX = Math.floor(x / 16);
      const tileY = Math.floor(y / 16);
      updateCastMember(draggingActorId, "x", tileX);
      updateCastMember(draggingActorId, "y", tileY);
    } else if (isPanning.current && mapContainerRef.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      mapContainerRef.current.scrollLeft = panStart.current.scrollLeft - dx;
      mapContainerRef.current.scrollTop = panStart.current.scrollTop - dy;
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingActorId(null);
    isPanning.current = false;
  };

  const handleMapUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const mapNode = xmlDoc.getElementsByTagName("map")[0];
        const width = parseInt(mapNode.getAttribute("width") || "60");
        const height = parseInt(mapNode.getAttribute("height") || "60");

        const buildings: { x: number; y: number }[] = [];
        const warps: { x: number; y: number }[] = [];

        const layers = Array.from(xmlDoc.getElementsByTagName("layer"));
        const buildLayers = layers.filter(
          (l) => l.getAttribute("name") === "Buildings"
        );

        buildLayers.forEach((layer) => {
          const dataNode = layer.getElementsByTagName("data")[0];
          if (dataNode) {
            const csv = dataNode.textContent?.trim().split(",") || [];
            csv.forEach((val, idx) => {
              if (parseInt(val.trim()) > 0)
                buildings.push({ x: idx % width, y: Math.floor(idx / width) });
            });
          }
        });

        const propertiesNode = xmlDoc.getElementsByTagName("properties")[0];
        if (propertiesNode) {
          const props = Array.from(
            propertiesNode.getElementsByTagName("property")
          );
          const warpProp = props.find((p) => p.getAttribute("name") === "Warp");
          if (warpProp) {
            const warpVal = warpProp.getAttribute("value") || "";
            const tokens = warpVal.split(" ").filter((t) => t.trim() !== "");
            for (let i = 0; i < tokens.length; i += 5) {
              if (tokens[i] && tokens[i + 1])
                warps.push({
                  x: parseInt(tokens[i]),
                  y: parseInt(tokens[i + 1]),
                });
            }
          }
        }

        const objectGroups = Array.from(
          xmlDoc.getElementsByTagName("objectgroup")
        );
        objectGroups.forEach((og) => {
          const objects = Array.from(og.getElementsByTagName("object"));
          objects.forEach((obj) => {
            const objProps = Array.from(obj.getElementsByTagName("property"));
            const isWarp = objProps.some(
              (p) =>
                p.getAttribute("name") === "Warp" ||
                (p.getAttribute("name") === "Action" &&
                  p.getAttribute("value")?.startsWith("Warp"))
            );
            if (isWarp) {
              const ox = parseInt(obj.getAttribute("x") || "0");
              const oy = parseInt(obj.getAttribute("y") || "0");
              warps.push({ x: Math.floor(ox / 16), y: Math.floor(oy / 16) });
            }
          });
        });

        setMapData({ width, height, buildings, warps });
      } catch (err) {}
    };
    reader.readAsText(file);
  };

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    alert("Code copied to clipboard!");
  }, []);

  const appendToTaste = useCallback(
    (tasteKey: string, id: string) => {
      if (activeTool === "quests") {
        setQuestObj(id);
        setIsSearchOpen(false);
        return;
      }
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
    },
    [activeTool]
  );

  const addSpecificDialogue = useCallback((id: string) => {
    setItemSpecificDialogues((prev) => [
      ...prev,
      { id: Date.now(), itemOrTag: id, dialogue: "" },
    ]);
    setIsSearchOpen(false);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setAnimImageWidth(img.width);
          setAnimImageHeight(img.height);
          setAnimImage(src);
          setAnimEntry([]);
          setAnimRepeat([]);
          setAnimLeaving([]);
          setCurrentPreviewFrame(0);
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    }
  };

  function parseSingleCommandString(
    cmdStr: string,
    index: number
  ): Command | null {
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
        if (parts[j])
          movements.push({
            actor: parts[j],
            x: parseInt(parts[j + 1]) || 0,
            y: parseInt(parts[j + 2]) || 0,
            facing: parseInt(parts[j + 3]) || 0,
          });
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
  }

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

    if (isSkippable) val += "skippable/";

    const timelineString = timeline.map(compileSingleCommand).join("/");
    const finalEvent = `"${key}": "${val}${timelineString}"`;
    if (exportAsCP) {
      setOutputString(
        `{\n  "Action": "EditData",\n  "Target": "Data/Events/${location}",\n  "Entries": {\n    ${finalEvent}\n  }\n}`
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
  };

  const handleImport = () => {
    try {
      let rawText = importText.trim();
      if (rawText.startsWith("{") && rawText.endsWith("}")) {
        rawText = rawText.slice(1, -1).trim();
      }

      const parts = rawText.split(/":\s*"/);
      if (parts.length < 2) return;

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
      }
    } catch (error) {}
  };

  const handleParseI18n = () => {
    try {
      const parsed = JSON.parse(i18nText);
      setI18nData(parsed);
    } catch (e) {}
  };

  const replaceI18n = (str: string) => {
    if (!str) return "";
    return str.replace(/\{\{i18n:([\w\.]+)\}\}/gi, (match, key) => {
      return i18nData[key.trim()] || match;
    });
  };

  const handleReset = () => {
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
    setIsSkippable(savedSkippable !== null ? JSON.parse(savedSkippable) : true);
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

  const handleDragStart = (
    e: React.DragEvent,
    phase: "entry" | "repeat" | "leaving",
    index: number
  ) => {
    setDraggedFrame({ phase, index });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (
    e: React.DragEvent,
    targetPhase: "entry" | "repeat" | "leaving",
    targetIndex: number
  ) => {
    e.preventDefault();
    if (!draggedFrame) return;
    if (
      draggedFrame.phase === targetPhase &&
      draggedFrame.index === targetIndex
    ) {
      setDraggedFrame(null);
      return;
    }
    let sourceArray: number[] = [];
    if (draggedFrame.phase === "entry") sourceArray = [...animEntry];
    if (draggedFrame.phase === "repeat") sourceArray = [...animRepeat];
    if (draggedFrame.phase === "leaving") sourceArray = [...animLeaving];
    const frameValue = sourceArray[draggedFrame.index];
    sourceArray.splice(draggedFrame.index, 1);
    if (draggedFrame.phase === "entry") setAnimEntry(sourceArray);
    if (draggedFrame.phase === "repeat") setAnimRepeat(sourceArray);
    if (draggedFrame.phase === "leaving") setAnimLeaving(sourceArray);

    let targetArray: number[] = [];
    if (targetPhase === "entry")
      targetArray =
        draggedFrame.phase === "entry" ? sourceArray : [...animEntry];
    if (targetPhase === "repeat")
      targetArray =
        draggedFrame.phase === "repeat" ? sourceArray : [...animRepeat];
    if (targetPhase === "leaving")
      targetArray =
        draggedFrame.phase === "leaving" ? sourceArray : [...animLeaving];

    targetArray.splice(targetIndex, 0, frameValue);

    if (targetPhase === "entry") setAnimEntry(targetArray);
    if (targetPhase === "repeat") setAnimRepeat(targetArray);
    if (targetPhase === "leaving") setAnimLeaving(targetArray);

    setDraggedFrame(null);
  };

  const checkerboardStyle = {
    backgroundImage:
      "repeating-linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), repeating-linear-gradient(45deg, #ccc 25%, #fff 25%, #fff 75%, #ccc 75%, #ccc)",
    backgroundPosition: "0 0, 8px 8px",
    backgroundSize: "16px 16px",
  };

  const darkCheckerboardStyle = {
    backgroundImage:
      "repeating-linear-gradient(45deg, #333 25%, transparent 25%, transparent 75%, #333 75%, #333), repeating-linear-gradient(45deg, #333 25%, #222 25%, #222 75%, #333 75%, #333)",
    backgroundPosition: "0 0, 8px 8px",
    backgroundSize: "16px 16px",
  };

  const cols =
    animImageWidth > 0 && spriteWidth > 0
      ? Math.max(1, Math.floor(animImageWidth / spriteWidth))
      : 1;
  const rows =
    animImageHeight > 0 && spriteHeight > 0
      ? Math.max(1, Math.floor(animImageHeight / spriteHeight))
      : 1;
  const totalFrames = cols * rows;

  const activeFrame =
    activeAnimFrames[currentPreviewFrame] ?? activeAnimFrames[0] ?? 0;
  const activeRow = Math.floor(activeFrame / cols);
  const activeCol = activeFrame % cols;

  const exportAsGif = useCallback(async () => {
    if (!animImage || activeAnimFrames.length === 0) return;
    const startExport = async () => {
      try {
        const workerRes = await fetch(
          "https://cdn.jsdelivr.net/npm/gif.js/dist/gif.worker.js"
        );
        const workerBlob = await workerRes.blob();
        const workerUrl = URL.createObjectURL(workerBlob);
        const gif = new (window as any).GIF({
          workers: 2,
          quality: 10,
          workerScript: workerUrl,
          transparent: "rgba(0,0,0,0)",
        });

        const canvas = document.createElement("canvas");
        canvas.width = spriteWidth * 8;
        canvas.height = spriteHeight * 8;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;

        const img = new Image();
        img.src = animImage;
        img.onload = () => {
          activeAnimFrames.forEach((frame) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const r = Math.floor(frame / cols);
            const c = frame % cols;
            ctx.drawImage(
              img,
              c * spriteWidth,
              r * spriteHeight,
              spriteWidth,
              spriteHeight,
              0,
              0,
              spriteWidth * 8,
              spriteHeight * 8
            );
            gif.addFrame(canvas, { copy: true, delay: animDuration });
          });
          gif.on("finished", (blob: Blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${animName}.gif`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            URL.revokeObjectURL(workerUrl);
          });
          gif.render();
        };
      } catch (error) {
        console.error("Failed to generate GIF:", error);
        alert("Failed to generate GIF. Check browser console for errors.");
      }
    };

    if (!(window as any).GIF) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/gif.js/dist/gif.js";
      script.onload = startExport;
      document.body.appendChild(script);
    } else {
      startExport();
    }
  }, [
    animImage,
    activeAnimFrames,
    spriteWidth,
    spriteHeight,
    cols,
    animDuration,
    animName,
  ]);

  const renderScriptLine = (cmd: Command): React.ReactNode => {
    const getDir = (d: number) =>
      ["Up", "Right", "Down", "Left"][d] || d.toString();

    if (cmd.type === "speak") {
      return (
        <p key={cmd.id} className="mb-2">
                   
          <strong className="text-emerald-700 dark:text-emerald-400">
                        {cmd.payload.actor}:          
          </strong>
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
                    ({cmd.payload.actor} thinks: {replaceI18n(cmd.payload.text)}
          )        
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
                    [{cmd.payload.actor} executes advanced move sequence:      
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
                    [{cmd.payload.actor} turns to face          
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
                    [{cmd.payload.actor} teleports to {cmd.payload.x},
          {cmd.payload.y}]        
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
                    [{cmd.payload.actorType} {cmd.payload.name} enters the scene
          at           {cmd.payload.x}, {cmd.payload.y}]        
        </p>
      );
    }
    if (cmd.type === "addObject") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-slate-500 dark:text-slate-400"
        >
                    [Object {cmd.payload.itemId} appears at {cmd.payload.x},    
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
                    [Big Prop {cmd.payload.itemId} appears at {cmd.payload.x},  
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
                    [Tile at {cmd.payload.x}, {cmd.payload.y} on layer
          {cmd.payload.layer}           changes to index {cmd.payload.tileIndex}
          ]        
        </p>
      );
    }
    if (cmd.type === "friendship") {
      return (
        <p
          key={cmd.id}
          className="mb-2 text-sm italic text-amber-600 dark:text-amber-500"
        >
                    [Reward: Friendship with {cmd.payload.actor} changes by    
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
                    [Reward: Received {cmd.payload.count}x Item
          {cmd.payload.itemId}]        
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
                    [Mail flag {cmd.payload.add ? "added" : "removed"}:        
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

  const renderConditionInputs = (cond: Condition): React.ReactNode => {
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
  ): React.ReactNode => {
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
        <option value={1}>Right</option>        <option value={2}>Down</option> 
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
              placeholder="Message text"
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
                                Move Sequence              
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
                                                                Clear Temp
                                Sprites                              
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

  const updateSchedulePoint = (
    key: string,
    id: number,
    field: string,
    value: any
  ) => {
    setSchedules((prev) => ({
      ...prev,
      [key]: prev[key].map((pt) =>
        pt.id === id ? { ...pt, [field]: value } : pt
      ),
    }));
  };

  const addSchedulePoint = (key: string) => {
    setSchedules((prev) => ({
      ...prev,
      [key]: [
        ...prev[key],
        {
          id: Date.now(),
          time: "1200",
          location: "Town",
          x: 0,
          y: 0,
          facing: 2,
          animOrDialogue: "",
        },
      ],
    }));
  };

  const removeSchedulePoint = (key: string, id: number) => {
    setSchedules((prev) => ({
      ...prev,
      [key]: prev[key].filter((pt) => pt.id !== id),
    }));
  };

  const addScheduleKey = () => {
    if (!newScheduleKey.trim() || schedules[newScheduleKey.trim()]) return;
    const key = newScheduleKey.trim();
    setSchedules((prev) => ({ ...prev, [key]: [] }));
    setActiveScheduleKey(key);
    setNewScheduleKey("");
  };

  const deleteScheduleKey = (key: string) => {
    const newScheds = { ...schedules };
    delete newScheds[key];
    setSchedules(newScheds);
    if (activeScheduleKey === key)
      setActiveScheduleKey(Object.keys(newScheds)[0] || "");
  };

  const compiledSchedulesObject = useMemo(() => {
    const obj: Record<string, string> = {};
    for (const [key, points] of Object.entries(schedules)) {
      if (points.length === 0) continue;
      obj[key] = points
        .map((pt) => {
          let str = `${pt.time} ${pt.location} ${pt.x} ${pt.y} ${pt.facing}`;
          if (pt.animOrDialogue) {
            if (pt.animOrDialogue.includes(" ")) {
              str += ` "${pt.animOrDialogue.replace(/"/g, '\\"')}"`;
            } else {
              str += ` ${pt.animOrDialogue}`;
            }
          }
          return str;
        })
        .join("/");
    }
    return obj;
  }, [schedules]);
  const handleScheduleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setImportText(text);
      } catch (err) {
        console.error(err);
        alert("Failed to read the file.");
      }
    };
    reader.readAsText(file);
  };
  const handleImportSchedule = () => {
    try {
      const parsed = JSON.parse(importText);
      const newScheds: Record<string, SchedulePoint[]> = {};
      for (const [key, val] of Object.entries(parsed)) {
        if (typeof val === "string") {
          const parts = val.split("/");
          newScheds[key] = parts.map((p, i) => {
            const tokens = p.trim().split(" ");
            let animOrDiag = tokens.slice(5).join(" ");
            if (animOrDiag.startsWith('"') && animOrDiag.endsWith('"')) {
              animOrDiag = animOrDiag
                .substring(1, animOrDiag.length - 1)
                .replace(/\\"/g, '"');
            }
            return {
              id: Date.now() + i + Math.random(),
              time: tokens[0] || "",
              location: tokens[1] || "",
              x: tokens[2] || "0",
              y: tokens[3] || "0",
              facing: tokens[4] || "2",
              animOrDialogue: animOrDiag,
            };
          });
        }
      }
      setSchedules(newScheds);
      setActiveScheduleKey(Object.keys(newScheds)[0] || "spring");
      setShowImport(false);
      setImportText("");
    } catch (e) {
      alert("Invalid JSON format for schedule import.");
    }
  };

  const handleDownloadMod = () => {
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
      charEntry.WinterStarParticipant = charWinterStarParticipant === "true";
    charEntry.Home = [
      {
        Id: "Default",
        Location: charHomeLocation,
        Tile: { X: Number(charHomeX) || 0, Y: Number(charHomeY) || 0 },
        Direction: charHomeDir,
      },
    ];

    const generatedGiftString = `${giftTastes.love.dialogs
      .join("#")
      .replace(/"/g, '\\"')}/${giftTastes.love.items}/${giftTastes.like.dialogs
      .join("#")
      .replace(/"/g, '\\"')}/${
      giftTastes.like.items
    }/${giftTastes.dislike.dialogs.join("#").replace(/"/g, '\\"')}/${
      giftTastes.dislike.items
    }/${giftTastes.hate.dialogs.join("#").replace(/"/g, '\\"')}/${
      giftTastes.hate.items
    }/${giftTastes.neutral.dialogs.join("#").replace(/"/g, '\\"')}/${
      giftTastes.neutral.items
    }/`;

    const specificEntriesStr = itemSpecificDialogues
      .filter((d) => d.itemOrTag && d.dialogue)
      .map(
        (d) =>
          `    "AcceptGift_${d.itemOrTag}": "${d.dialogue.replace(
            /"/g,
            '\\"'
          )}"`
      )
      .join(",\n");

    let changes = [
      {
        Action: "EditData",
        Target: "Data/Characters",
        Entries: { [charId]: charEntry },
      },
      {
        Action: "EditData",
        Target: "Data/NPCGiftTastes",
        Entries: { [charId]: generatedGiftString },
      },
      {
        Action: "EditData",
        Target: `Characters/schedules/${charId}`,
        Entries: compiledSchedulesObject,
      },
    ];

    const contentJson = JSON.stringify(
      { Format: "2.9.0", Changes: changes },
      null,
      2
    );
    const contentBlob = new Blob([contentJson], { type: "application/json" });
    const contentUrl = URL.createObjectURL(contentBlob);
    const contentA = document.createElement("a");
    contentA.href = contentUrl;
    contentA.download = "content.json";
    document.body.appendChild(contentA);
    contentA.click();
    document.body.removeChild(contentA);
    URL.revokeObjectURL(contentUrl);

    if (specificEntriesStr) {
      const dialogueJson = `{\n  "Action": "EditData",\n  "Target": "Characters/Dialogue/${charId}",\n  "Entries": {\n${specificEntriesStr}\n  }\n}`;
      const dBlob = new Blob([dialogueJson], { type: "application/json" });
      const dUrl = URL.createObjectURL(dBlob);
      const dA = document.createElement("a");
      dA.href = dUrl;
      dA.download = "dialogue.json";
      setTimeout(() => {
        document.body.appendChild(dA);
        dA.click();
        document.body.removeChild(dA);
        URL.revokeObjectURL(dUrl);
      }, 500);
    }
  };

  const questJsonString = useMemo(() => {
    if (questFormat === "quest") {
      const qStr = `${questType}/-1/-1/${questReward}/-1/true/${questNpc}/${questDesc.replace(
        /"/g,
        '\\"'
      )}/${questTitle.replace(
        /"/g,
        '\\"'
      )}/${questObj} ${questObjAmount}/${questDialogue.replace(/"/g, '\\"')}`;
      return JSON.stringify(
        {
          Action: "EditData",
          Target: "Data/Quests",
          Entries: { [questId]: qStr },
        },
        null,
        2
      );
    } else {
      const soStr = {
        Name: questTitle,
        Requester: questNpc,
        Text: questDesc,
        ItemToRemoveOnEnd: null,
        MailToRemoveOnEnd: null,
        Duration: "Month",
        Action: "",
        Objectives: [
          {
            Type:
              questType === "ItemDelivery"
                ? "Deliver"
                : questType === "Monster"
                ? "Slay"
                : "Gather",
            ItemName: questObj,
            Count: questObjAmount,
          },
        ],
        Rewards: [{ Type: "Money", Amount: questReward }],
      };
      return JSON.stringify(
        {
          Action: "EditData",
          Target: "Data/SpecialOrders",
          Entries: { [questId]: soStr },
        },
        null,
        2
      );
    }
  }, [
    questFormat,
    questId,
    questType,
    questTitle,
    questDesc,
    questObj,
    questObjAmount,
    questReward,
    questNpc,
    questDialogue,
  ]);

  const chairTilesJsonString = useMemo(() => {
    const entries: Record<string, string> = {};
    chairTiles.forEach((ct) => {
      const key = `${ct.tilesheet}/${ct.x}/${ct.y}`;
      let value = `${ct.width}/${ct.height}/${ct.direction}/${ct.type}/${ct.drawX}/${ct.drawY}/${ct.seasonal}`;
      if (ct.altTilesheet) {
        value += `/${ct.altTilesheet.replace(/\\+/g, "\\")}`;
      }
      entries[key] = value;
    });
    return JSON.stringify(
      {
        Action: "EditData",
        Target: "Data/ChairTiles",
        Entries: entries,
      },
      null,
      2
    );
  }, [chairTiles]);

  const dialogueJsonString = useMemo(() => {
    const obj: Record<string, string> = {};
    dialogueEntries.forEach((d) => {
      if (d.key) {
        let prefix = "";
        if (npcDialogueType === "modded" && dialogueModId) {
          let cleanModId = dialogueModId.trim();
          if (cleanModId.endsWith(".") || cleanModId.endsWith("_")) {
            cleanModId = cleanModId.slice(0, -1);
          }
          prefix = `${cleanModId}.${charId ? charId.trim() + "." : ""}`;
        }
        obj[`${prefix}${d.key}`] = d.value || "";
      }
    });
    return JSON.stringify(obj, null, 2);
  }, [dialogueEntries, npcDialogueType, dialogueModId, charId]);

  const dialogueCpJsonString = useMemo(() => {
    const normalEntries: Record<string, string> = {};
    const marriageEntries: Record<string, string> = {};

    dialogueEntries.forEach((d) => {
      if (d.key) {
        let prefix = "";
        if (npcDialogueType === "modded" && dialogueModId) {
          let cleanModId = dialogueModId.trim();
          if (cleanModId.endsWith(".") || cleanModId.endsWith("_")) {
            cleanModId = cleanModId.slice(0, -1);
          }
          prefix = `${cleanModId}.${charId ? charId.trim() + "." : ""}`;
        }

        const i18nToken = `{{i18n:${prefix}${d.key}}}`;

        const isMarriagePrefix =
          /^(patio_|spouseRoom_|funLeave_|funReturn_|Outdoor_|Rainy_Day_|Indoor_Day_|Rainy_Night_|Indoor_Night_|OneKid_|TwoKids_|Good_|Neutral_|Bad_)/i.test(
            d.key
          );
        const isSeasonalMarriage =
          charId && charId.trim() !== ""
            ? new RegExp(
                `^(Spring|Summer|Fall|Winter)_${charId.trim()}$`,
                "i"
              ).test(d.key)
            : false;

        if (isMarriagePrefix || isSeasonalMarriage) {
          marriageEntries[d.key] = i18nToken;
        } else {
          normalEntries[d.key] = i18nToken;
        }
      }
    });

    const changes = [];

    if (Object.keys(normalEntries).length > 0) {
      changes.push({
        LogName: "Dialogue Edit",
        Action: "EditData",
        Target: `Characters/Dialogue/${charId}`,
        Entries: normalEntries,
      });
    }

    if (Object.keys(marriageEntries).length > 0) {
      changes.push({
        LogName: "Marriage Dialogue Edit",
        Action: "EditData",
        Target: `Characters/Dialogue/MarriageDialogue${charId}`,
        Entries: marriageEntries,
      });
    }

    return JSON.stringify({ Changes: changes }, null, 2);
  }, [dialogueEntries, npcDialogueType, dialogueModId, charId]);

  const handleImportDialogue = () => {
    try {
      const parsed = JSON.parse(dialogueImport);
      const newEntries = Object.entries(parsed).map(([k, v], i) => ({
        id: Date.now() + i,
        key: k,
        value: String(v),
      }));
      setDialogueEntries(newEntries);
      setDialogueImport("");
    } catch (e) {
      alert("Invalid JSON format for dialogue import.");
    }
  };
  const generateDialogueTemplates = () => {
    const newKeys: string[] = [];

    if (useBasicDialogue) {
      const seasons = ["spring", "summer", "fall", "winter"];
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      seasons.forEach((season) => {
        days.forEach((day) => {
          newKeys.push(`${season}_${day}`);
        });
      });
    }

    if (useAdvancedDialogue) {
      newKeys.push(
        "GreenRain",
        "GreenRainFinished",
        "MovieInvitation",
        "RejectMovieTicket_AlreadyInvitedBySomeoneElse",
        "RejectMovieTicket_AlreadyWatchedThisWeek",
        "RejectMovieTicket_Divorced",
        "RejectMovieTicket_DontWantToSeeThatMovie",
        "RejectMovieTicket",
        "breakUp",
        "RejectBouquet_NotDatable",
        "RejectBouquet_NpcAlreadyMarried",
        "RejectBouquet_VeryLowHearts",
        "RejectBouquet_LowHearts",
        "RejectBouquet",
        "SpouseFarmhouseClutter",
        "Spouse_MonstersInHouse",
        "SpouseStardrop",
        "RejectMermaidPendant_NeedHouseUpgrade",
        "RejectMermaidPendant_NotDatable",
        "RejectMermaidPendant_NpcWithSomeoneElse",
        "RejectMermaidPendant_PlayerWithSomeoneElse",
        "RejectMermaidPendant_Under8Hearts",
        "RejectMermaidPendant_Under10Hearts",
        "RejectMermaidPendant_Under10Hearts_AskedAgain",
        "RejectMermaidPendant",
        "divorced",
        "RejectGift_Divorced",
        "RejectMermaidPendant_Divorced",
        "RejectBouquet_Divorced",
        "WipedMemory",
        "Resort",
        "Resort_Bar",
        "Resort_Chair",
        "Resort_Dance",
        "Resort_Entering",
        "Resort_Leaving",
        "Resort_Shore",
        "Resort_Towel",
        "Resort_Umbrella",
        "Resort_Wander",
        "AcceptBirthdayGift_Negative",
        "AcceptBirthdayGift_Positive",
        "AcceptBirthdayGift",
        "AcceptBouquet",
        "DumpsterDiveComment",
        "HitBySlingshot",
        "FlowerDance_Accept_Spouse",
        "FlowerDance_Accept",
        "FlowerDance_Decline",
        "Fair_Judging",
        "Fair_Judged_PlayerLost_PurpleShorts",
        "Fair_Judged_PlayerLost_Skipped",
        "Fair_Judged_PlayerLost",
        "Fair_Judged_PlayerWon",
        "Fair_Judged",
        "WinterStar_GiveGift_Before_Spouse",
        "WinterStar_GiveGift_Before",
        "WinterStar_GiveGift_After_Spouse",
        "WinterStar_GiveGift_After",
        "WinterStar_ReceiveGift"
      );
    }

    if (useMarriageDialogue) {
      newKeys.push(
        `Spring_${charId}`,
        `Summer_${charId}`,
        `Fall_${charId}`,
        `Winter_${charId}`,
        `patio_${charId}`,
        `spouseRoom_${charId}`,
        `funLeave_${charId}`,
        `funReturn_${charId}`,
        `Outdoor_${charId}`
      );
      for (let i = 0; i <= 5; i++) {
        newKeys.push(
          `Rainy_Day_${i}`,
          `Indoor_Day_${i}`,
          `Rainy_Night_${i}`,
          `Indoor_Night_${i}`
        );
      }
      for (let i = 0; i <= 4; i++) {
        newKeys.push(`Outdoor_${i}`, `OneKid_${i}`, `TwoKids_${i}`);
      }
      for (let i = 0; i <= 9; i++) {
        newKeys.push(`Good_${i}`, `Neutral_${i}`, `Bad_${i}`);
      }
    }

    const currentKeys = new Set(dialogueEntries.map((e) => e.key));
    const keysToAdd = newKeys.filter((k) => !currentKeys.has(k));

    if (keysToAdd.length > 0) {
      const newEntries = keysToAdd.map((key, i) => ({
        id: Date.now() + i,
        key,
        value: "",
      }));
      setDialogueEntries((prev) => [...prev, ...newEntries]);
    }
  };

  const trashJsonString = useMemo(() => {
    const entries: any = {};

    trashCans.forEach((tc) => {
      const formattedDrops = tc.drops.map((drop: any) => {
        const entry: any = {
          ID: drop.dropId,
          ItemId: drop.itemId,
        };

        const conditionsArray = [];
        if (drop.chance && drop.chance !== "1" && drop.chance !== "1.0") {
          conditionsArray.push(`RANDOM ${drop.chance}`);
        }
        if (drop.condition && drop.condition.trim() !== "") {
          conditionsArray.push(drop.condition.trim());
        }
        if (conditionsArray.length > 0) {
          entry.Condition = conditionsArray.join(", ");
        }

        if (drop.ignoreBaseChance) entry.IgnoreBaseChance = true;
        if (drop.isMegaSuccess) entry.IsMegaSuccess = true;
        if (drop.isDoubleMegaSuccess) entry.IsDoubleMegaSuccess = true;
        if (drop.addToInventoryDirectly) entry.AddToInventoryDirectly = true;
        if (drop.createMultipleDebris) entry.CreateMultipleDebris = true;
        return entry;
      });

      entries[tc.canId] = { Items: formattedDrops };
    });

    return JSON.stringify(
      {
        Action: "EditData",
        Target: "Data/GarbageCans",
        TargetField: ["GarbageCans"],
        Entries: entries,
      },
      null,
      2
    );
  }, [trashCans]);

  const itemJsonString = useMemo(() => {
    let target = "Data/Objects";
    let entry: any = {};
    const changes: any[] = [];

    if (itemType === "Object") {
      target = "Data/Objects";
      entry = {
        Name: itemName,
        DisplayName: itemDisplayName,
        Description: itemDesc,
        Type: "Basic",
        Category: Number(itemCategory) || -7,
        Price: itemPrice,
        Edibility: itemEdibility,
      };
      changes.push({
        Action: "EditData",
        Target: target,
        Entries: { [itemIdBuilder]: entry },
      });
    } else if (itemType === "BigCraftable" || itemType === "Machine") {
      target = "Data/BigCraftables";
      entry = {
        Name: itemName,
        DisplayName: itemDisplayName,
        Description: itemDesc,
        Price: itemPrice,
        Fragility: bcFragility,
      };
      if (!bcCanBePlacedIndoors) entry.CanBePlacedIndoors = false;
      if (!bcCanBePlacedOutdoors) entry.CanBePlacedOutdoors = false;
      if (bcIsLamp) entry.IsLamp = true;

      changes.push({
        Action: "EditData",
        Target: target,
        Entries: { [itemIdBuilder]: entry },
      });

      if (itemType === "Machine") {
        changes.push({
          Action: "EditData",
          Target: "Data/Machines",
          Entries: {
            [`(BC)${itemIdBuilder}`]: {
              OutputRules: [
                {
                  Id: "Default",
                  Triggers: [
                    {
                      Id: "ItemPlacedInMachine",
                      Trigger: "ItemPlacedInMachine",
                      RequiredItemId: "(O)388",
                      RequiredCount: 1,
                    },
                  ],
                  OutputItem: [{ ItemId: "(O)334", MinStack: 1, MaxStack: 1 }],
                  MinutesUntilReady: 60,
                },
              ],
            },
          },
        });
      }
    } else if (itemType === "Recipe") {
      target =
        recipeType === "Cooking"
          ? "Data/CookingRecipes"
          : "Data/CraftingRecipes";
      const ingredientsStr = recipeIngredients
        .map((i) => `${i.id} ${i.amount}`)
        .join(" ");
      const yieldStr =
        recipeYieldAmount > 1
          ? `${recipeYield} ${recipeYieldAmount}`
          : recipeYield;
      const unusedField = recipeType === "Cooking" ? "1 10" : "Home";
      const isBigCraftable =
        recipeType === "Crafting" && recipeYield.startsWith("(BC)")
          ? "true"
          : "false";

      let unlockStr: string = recipeUnlockType;
      if (recipeUnlockType === "skill") unlockStr = `s ${recipeUnlockParam}`;
      if (recipeUnlockType === "friendship")
        unlockStr = `f ${recipeUnlockParam}`;

      entry =
        recipeType === "Cooking"
          ? `${ingredientsStr}/${unusedField}/${yieldStr}/${unlockStr}/${itemDisplayName}`
          : `${ingredientsStr}/${unusedField}/${yieldStr}/${isBigCraftable}/${unlockStr}/${itemDisplayName}`;

      changes.push({
        Action: "EditData",
        Target: target,
        Entries: { [itemName]: entry },
      });
    }

    return JSON.stringify({ Changes: changes }, null, 2);
  }, [
    itemType,
    itemIdBuilder,
    itemName,
    itemDisplayName,
    itemDesc,
    itemPrice,
    itemCategory,
    itemEdibility,
    bcFragility,
    bcCanBePlacedIndoors,
    bcCanBePlacedOutdoors,
    bcIsLamp,
    recipeType,
    recipeIngredients,
    recipeYield,
    recipeYieldAmount,
    recipeUnlockType,
    recipeUnlockParam,
  ]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors font-sans relative">
           
      {["gift", "quests", "shop", "trash_cans", "item_builder"].includes(
        activeTool
      ) && (
        <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-[100] shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
                   
          <h1 className="text-xl font-bold text-rose-400">Stardew Toolkit</h1> 
                 
          <button
            onClick={() => setIsSearchOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 px-6 py-2 rounded-full font-mono text-sm w-full md:w-96 flex justify-between items-center transition-colors"
          >
                        <span>Search IDs or Tags...</span>           
            <span className="text-slate-500 font-bold bg-slate-900 px-2 py-0.5 rounded">
                            Ctrl+K            
            </span>
                     
          </button>
                 
        </div>
      )}
           
      {isSearchOpen &&
        ["gift", "quests", "shop", "trash_cans", "item_builder"].includes(
          activeTool
        ) && (
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
                                     
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 font-bold">
                                        No items found matching "{searchQuery}"
                                     
                  </div>
                ) : (
                  searchResults.map((item) => {
                    const categoryTag = item.category
                      ? `category_${item.category
                          .toLowerCase()
                          .replace(/\s+/g, "_")}`
                      : "";
                    const qId = item.id.includes(" ")
                      ? item.id
                      : `(O)${item.id}`;
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col p-3 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-500 transition-colors group"
                      >
                                               
                        <div className="flex justify-between items-start">
                                                   
                          <div>
                                                       
                            <h3 className="font-bold text-lg dark:text-white flex flex-wrap items-center gap-2 md:gap-3">
                                                            {item.name}         
                                                 
                              <span className="text-xs font-mono bg-slate-200 dark:bg-slate-900 px-2 py-1 rounded text-slate-600 dark:text-slate-400">
                                                                {item.id}       
                                                     
                              </span>
                                                           
                              {categoryTag && (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded">
                                                                   {categoryTag}
                                                                 
                                </span>
                              )}
                                                         
                            </h3>
                                                     
                          </div>
                                                   
                          <div className="flex gap-2">
                                                       
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(item.id);
                                alert(
                                  `Copied Base ID ${item.id} to clipboard!`
                                );
                              }}
                              className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-1 px-2 rounded transition-all whitespace-nowrap"
                            >
                                                            Base ID            
                                             
                            </button>
                                                       
                            {(activeTool === "shop" ||
                              activeTool === "trash_cans" ||
                              activeTool === "item_builder") && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(qId);
                                  alert(
                                    `Copied Qualified ID ${qId} to clipboard!`
                                  );
                                }}
                                className="text-xs bg-indigo-200 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-200 font-bold py-1 px-2 rounded transition-all whitespace-nowrap"
                              >
                                                                Qualified ID    
                                                         
                              </button>
                            )}
                                                     
                          </div>
                                                 
                        </div>
                                               
                        {activeTool === "gift" && (
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
                              className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-3 py-1.5 rounded hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors md:ml-auto"
                            >
                                                            + Specific Dialogue
                                                         
                            </button>
                                                     
                          </div>
                        )}
                                               
                        {activeTool === "quests" && (
                          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                                                       
                            <button
                              onClick={() => appendToTaste("quest", item.id)}
                              className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                            >
                                                            Select for Quest
                              Target                            
                            </button>
                                                     
                          </div>
                        )}
                                               
                        {activeTool === "item_builder" &&
                          itemType === "Recipe" && (
                            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                              <button
                                onClick={() => {
                                  setRecipeIngredients([
                                    ...recipeIngredients,
                                    { id: item.id, amount: 1 },
                                  ]);
                                  setIsSearchOpen(false);
                                }}
                                className="text-[10px] font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 px-3 py-1.5 rounded hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                              >
                                + Add to Ingredients
                              </button>
                              <button
                                onClick={() => {
                                  setRecipeYield(item.id);
                                  setIsSearchOpen(false);
                                }}
                                className="text-[10px] font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 px-3 py-1.5 rounded hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                              >
                                Set as Yield
                              </button>
                            </div>
                          )}
                                             
                      </div>
                    );
                  })
                )}
                             
              </div>
                         
            </div>
                     
          </div>
        )}
           
      <div className="p-4 md:p-8 pb-80 md:pb-64">
               
        {activeTool === "home" && (
          <div className="flex flex-col items-center justify-center transition-colors max-w-6xl mx-auto">
                       
            <h1 className="text-4xl md:text-5xl font-bold text-emerald-700 dark:text-emerald-400 mb-2 text-center mt-8">
                            The Modder's Toolkit            
            </h1>
                       
            <p className="text-slate-600 dark:text-slate-400 mb-8 text-center max-w-lg">
                            A tool made mostly for Husky to have an easier time
              with his NPCs               but figured he'd share            
            </p>
                       
            <button
              onClick={() => {
                setWizardStep(1);
                setActiveTool("wizard");
              }}
              className="mb-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 text-xl w-full md:w-auto"
            >
                            ✨ Create New NPC (Wizard) ✨            
            </button>
                       
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-6">
                           
              <button
                onClick={() => setActiveTool("event")}
                className="group bg-white dark:bg-slate-900 border-2 border-emerald-500 hover:border-emerald-400 p-6 rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl text-left flex flex-col items-start"
              >
                               
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-lg mb-4 text-emerald-600 dark:text-emerald-400 font-bold">
                                    Ev                
                </div>
                               
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    Event Builder                
                </h2>
                             
              </button>
                           
              <button
                onClick={() => setActiveTool("character")}
                className="group bg-white dark:bg-slate-900 border-2 border-indigo-500 hover:border-indigo-400 p-6 rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl text-left flex flex-col items-start"
              >
                               
                <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-lg mb-4 text-indigo-600 dark:text-indigo-400 font-bold">
                                    Ch                
                </div>
                               
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    Character Data                
                </h2>
                             
              </button>
                           
              <button
                onClick={() => setActiveTool("gift")}
                className="group bg-white dark:bg-slate-900 border-2 border-rose-500 hover:border-rose-400 p-6 rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl text-left flex flex-col items-start"
              >
                               
                <div className="bg-rose-100 dark:bg-rose-900/50 p-3 rounded-lg mb-4 text-rose-600 dark:text-rose-400 font-bold">
                                    Gf                
                </div>
                               
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                    Gift Tastes Helper                
                </h2>
                             
              </button>
                           
              <button
                onClick={() => setActiveTool("animation")}
                className="group bg-white dark:bg-slate-900 border-2 border-fuchsia-500 hover:border-fuchsia-400 p-6 rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl text-left flex flex-col items-start"
              >
                               
                <div className="bg-fuchsia-100 dark:bg-fuchsia-900/50 p-3 rounded-lg mb-4 text-fuchsia-600 dark:text-fuchsia-400 font-bold">
                                    An                
                </div>
                               
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors">
                                    Animation Builder                
                </h2>
                             
              </button>
                           
              <button
                onClick={() => setActiveTool("schedule")}
                className="group bg-white dark:bg-slate-900 border-2 border-orange-500 hover:border-orange-400 p-6 rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl text-left flex flex-col items-start"
              >
                               
                <div className="bg-orange-100 dark:bg-orange-900/50 p-3 rounded-lg mb-4 text-orange-600 dark:text-orange-400 font-bold">
                                    Sc                
                </div>
                               
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                    Schedule Editor                
                </h2>
                             
              </button>
                           
              <button
                onClick={() => setActiveTool("quests")}
                className="group bg-white dark:bg-slate-900 border-2 border-cyan-500 hover:border-cyan-400 p-6 rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl text-left flex flex-col items-start"
              >
                               
                <div className="bg-cyan-100 dark:bg-cyan-900/50 p-3 rounded-lg mb-4 text-cyan-600 dark:text-cyan-400 font-bold">
                                    Qu                
                </div>
                               
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                    Quest Builder                
                </h2>
                             
              </button>
                           
              <button
                onClick={() => setActiveTool("dialogue")}
                className="group bg-white dark:bg-slate-900 border-2 border-teal-500 hover:border-teal-400 p-6 rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl text-left flex flex-col items-start"
              >
                               
                <div className="bg-teal-100 dark:bg-teal-900/50 p-3 rounded-lg mb-4 text-teal-600 dark:text-teal-400 font-bold">
                                    Di                
                </div>
                               
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                    Dialogue (i18n) Helper                
                </h2>
                             
              </button>
                           
              <button
                onClick={() => setActiveTool("shop")}
                className="group bg-white dark:bg-slate-900 border-2 border-blue-500 hover:border-blue-400 p-6 rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl text-left flex flex-col items-start"
              >
                <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg mb-4 text-blue-600 dark:text-blue-400 font-bold">
                  Sh
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  NPC Shop Builder
                </h2>
              </button>
            </div>
            <div className="w-full mt-4 pt-8 border-t-2 border-slate-200 dark:border-slate-800 flex justify-center text-center">
              <button
                onClick={() => setActiveTool("non_npc_home")}
                className="group w-full md:w-96 bg-white dark:bg-slate-900 border-2 border-stone-500 hover:border-stone-400 p-6 rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col items-center justify-center text-center"
              >
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-stone-600 dark:group-hover:text-stone-400 transition-colors w-full">
                  Non-NPC Tools
                </h2>
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
                                                NPC Name                      
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
                                                            Winter Star
                              Participant                            
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
                        copyToClipboard(charCpJson);
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
            let giftCpJson = `{\n  "Action": "EditData",\n  "Target": "Data/NPCGiftTastes",\n  "Entries": {\n    "${giftNpcId}": "${generatedGiftString}"\n  }\n}`;
            if (itemSpecificDialogues.length > 0) {
              const specificEntriesStr = itemSpecificDialogues
                .filter((d) => d.itemOrTag && d.dialogue)
                .map(
                  (d) =>
                    `    "AcceptGift_${d.itemOrTag}": "${d.dialogue.replace(
                      /"/g,
                      '\\"'
                    )}"`
                )
                .join(",\n");
              if (specificEntriesStr) {
                giftCpJson = `[\n  ${giftCpJson},\n  {\n    "Action": "EditData",\n    "Target": "Characters/Dialogue/${giftNpcId}",\n    "Entries": {\n  ${specificEntriesStr}\n    }\n  }\n]`;
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
                                                                Dialogue
                                Responses (Randomized)                          
                                   
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
                                                                + Add Randomized
                                Line                              
                              </button>
                                                         
                            </div>
                                                       
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                                           
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                                                Item IDs or
                                Context Tags (Space Separated)                  
                                           
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
                                                NPC Dialogue when gifted specific items or context tags.                   
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
                        const outStr = `{\n  "Action": "EditData",\n  "Target": "Data/NPCGiftTastes",\n  "Entries": {\n    "${giftNpcId}": "${Object.keys(
                          giftTastes
                        )
                          .map(
                            (k) =>
                              `${giftTastes[
                                k as keyof typeof giftTastes
                              ].dialogs
                                .join("#")
                                .replace(/"/g, '\\"')}/${
                                giftTastes[k as keyof typeof giftTastes].items
                              }`
                          )
                          .join("/")}/"\n  }\n}${
                          itemSpecificDialogues.length
                            ? `,\n{\n  "Action": "EditData",\n  "Target": "Characters/Dialogue/${giftNpcId}",\n  "Entries": {\n${itemSpecificDialogues
                                .map(
                                  (d) =>
                                    `    "AcceptGift_${
                                      d.itemOrTag
                                    }": "${d.dialogue.replace(/"/g, '\\"')}"`
                                )
                                .join(",\n")}\n  }\n}`
                            : ""
                        }`;
                        copyToClipboard(outStr);
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
                                            Paste your i18n JSON data here to
                      replace keys in the                       script view.    
                                     
                    </p>
                                       
                    <textarea
                      className="flex-grow border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-mono text-sm rounded mb-4"
                      placeholder='{&#10;"EventKey.1": "Hello!"&#10;}'
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
                                                    Light Mode
                          {!isDarkMode && "✓"}                       
                        </button>
                                               
                        <button
                          onClick={() => {
                            setIsDarkMode(true);
                            setIsMenuOpen(false);
                          }}
                          className="px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
                        >
                                                    Dark Mode
                          {isDarkMode && "✓"}                       
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
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-200 dark:border-slate-700 mt-4">
                  <h3 className="font-bold mb-2 text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Visual Map Placement
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Upload a .tmx map file. Buildings are dark squares, warps
                    are yellow. Drag and drop actors to set coordinates. Click
                    and drag empty space to pan.
                  </p>
                  <input
                    type="file"
                    accept=".tmx,.xml"
                    onChange={handleMapUpload}
                    className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-slate-700 dark:file:text-emerald-400 cursor-pointer mb-4"
                  />
                  <div
                    ref={mapContainerRef}
                    className="overflow-auto border border-slate-300 dark:border-slate-600 rounded bg-slate-100 dark:bg-slate-900 max-h-[500px]"
                  >
                    <canvas
                      ref={mapCanvasRef}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                      className={`cursor-${
                        draggingActorId ? "grabbing" : "grab"
                      } block`}
                    />
                  </div>
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
                                                            Question (Null /
                              Fork)                            
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
               
        {activeTool === "animation" && (
          <div>
                       
            <div className="max-w-6xl mx-auto mb-6">
                           
              <button
                onClick={() => setActiveTool("home")}
                className="text-fuchsia-600 dark:text-fuchsia-400 font-bold hover:underline flex items-center gap-2"
              >
                                Back to Toolkit Hub              
              </button>
                         
            </div>
                       
            <div className="max-w-6xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 transition-colors">
                           
              <h1 className="text-3xl font-bold text-fuchsia-700 dark:text-fuchsia-400 mb-6">
                                Animation Builder              
              </h1>
                           
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                               
                <div className="flex flex-col gap-6">
                                   
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                       
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                            Upload Spritesheet                  
                       
                    </label>
                                       
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleImageUpload}
                      className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-fuchsia-50 file:text-fuchsia-700 hover:file:bg-fuchsia-100 dark:file:bg-slate-700 dark:file:text-fuchsia-400 cursor-pointer"
                    />
                                     
                  </div>
                                   
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
                                       
                    <div className="flex gap-4">
                                           
                      <div className="flex-1">
                                               
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                                                    Sprite Width                
                                 
                        </label>
                                               
                        <input
                          type="number"
                          value={spriteWidth}
                          onChange={(e) =>
                            setSpriteWidth(Number(e.target.value))
                          }
                          className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white"
                        />
                                             
                      </div>
                                           
                      <div className="flex-1">
                                               
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                                                    Sprite Height              
                                   
                        </label>
                                               
                        <input
                          type="number"
                          value={spriteHeight}
                          onChange={(e) =>
                            setSpriteHeight(Number(e.target.value))
                          }
                          className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white"
                        />
                                             
                      </div>
                                         
                    </div>
                                       
                    <div className="flex gap-4 items-center">
                                           
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300">
                                               
                        <input
                          type="checkbox"
                          checked={hasAdvancedPhases}
                          onChange={(e) =>
                            setHasAdvancedPhases(e.target.checked)
                          }
                          className="accent-fuchsia-500 w-4 h-4"
                        />
                                                Loop Animation?                
                             
                      </label>
                                         
                    </div>
                                     
                  </div>
                                   
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
                                       
                    <div>
                                           
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                                                Filename on preview export      
                                       
                      </label>
                                           
                      <input
                        type="text"
                        value={animName}
                        onChange={(e) => setAnimName(e.target.value)}
                        className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white"
                      />
                                         
                    </div>
                                       
                    <div>
                                           
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                                                Extra Data \ Text (if
                        applicable)                      
                      </label>
                                           
                      <input
                        type="text"
                        value={animMessage}
                        onChange={(e) => setAnimMessage(e.target.value)}
                        placeholder="e.g. true"
                        className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white"
                      />
                                         
                    </div>
                                       
                    <div>
                                           
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                                                Preview/GIF Speed (ms)          
                                   
                      </label>
                                           
                      <input
                        type="number"
                        value={animDuration}
                        onChange={(e) =>
                          setAnimDuration(Number(e.target.value))
                        }
                        className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white"
                      />
                                         
                    </div>
                                       
                    <label className="flex items-center gap-2 cursor-pointer">
                                           
                      <input
                        type="checkbox"
                        checked={animLayingDown}
                        onChange={(e) => setAnimLayingDown(e.target.checked)}
                        className="accent-fuchsia-500 w-4 h-4"
                      />
                                           
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                                                Laying Down (Hides Shadow)      
                                       
                      </span>
                                         
                    </label>
                                       
                    <div className="flex gap-4">
                                           
                      <div className="flex-1">
                                               
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                                                    Offset X                    
                             
                        </label>
                                               
                        <input
                          type="number"
                          value={animOffsetX}
                          onChange={(e) =>
                            setAnimOffsetX(Number(e.target.value))
                          }
                          className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white"
                        />
                                             
                      </div>
                                           
                      <div className="flex-1">
                                               
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                                                    Offset Y                    
                             
                        </label>
                                               
                        <input
                          type="number"
                          value={animOffsetY}
                          onChange={(e) =>
                            setAnimOffsetY(Number(e.target.value))
                          }
                          className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white"
                        />
                                             
                      </div>
                                         
                    </div>
                                     
                  </div>
                                 
                </div>
                               
                <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 overflow-auto max-h-[60vh]">
                                   
                  <h3 className="font-bold text-slate-700 dark:text-slate-300">
                                        Source Frames                  
                  </h3>
                                   
                  <p className="text-xs text-slate-500">
                                        Double-click grid boxes to push frame to
                    Main Sequence.                  
                  </p>
                                   
                  {animImage ? (
                    <div
                      className="relative inline-block border border-slate-400 select-none self-start shadow-md max-w-none"
                      style={{
                        ...(isDarkMode
                          ? darkCheckerboardStyle
                          : checkerboardStyle),
                        backgroundSize: "32px 32px",
                        width: animImageWidth * 3,
                        height: animImageHeight * 3,
                      }}
                    >
                                           
                      <img
                        src={animImage}
                        alt="Spritesheet"
                        className="max-w-none block absolute top-0 left-0"
                        style={{
                          width: animImageWidth * 3,
                          height: animImageHeight * 3,
                          imageRendering: "pixelated",
                        }}
                        draggable={false}
                      />
                                           
                      <div
                        className="absolute top-0 left-0 w-full h-full pointer-events-none grid content-start justify-start"
                        style={{
                          gridTemplateColumns: `repeat(${cols}, ${
                            spriteWidth * 3
                          }px)`,
                          gridTemplateRows: `repeat(${rows}, ${
                            spriteHeight * 3
                          }px)`,
                        }}
                      >
                                               
                        {Array.from({ length: totalFrames }).map((_, i) => (
                          <div
                            key={i}
                            onDoubleClick={() =>
                              setAnimRepeat([...animRepeat, i])
                            }
                            className="border border-fuchsia-400 hover:bg-fuchsia-500/40 cursor-pointer pointer-events-auto flex items-center justify-center text-xs text-white opacity-0 hover:opacity-100 font-bold bg-black/20 transition-opacity"
                          >
                                                        {i}                     
                               
                          </div>
                        ))}
                                             
                      </div>
                                         
                    </div>
                  ) : (
                    <div className="text-slate-400 text-sm italic py-12 text-center">
                                            Upload an image to view frames.    
                                     
                    </div>
                  )}
                                 
                </div>
                               
                <div className="flex flex-col gap-6">
                                   
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex flex-col items-center">
                                       
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 w-full text-left mb-4">
                                            Live Preview                    
                    </h3>
                                       
                    <div
                      className="border-2 border-slate-400 rounded overflow-hidden shadow-inner"
                      style={{
                        width: spriteWidth * 4,
                        height: spriteHeight * 4,
                        ...(isDarkMode
                          ? darkCheckerboardStyle
                          : checkerboardStyle),
                      }}
                    >
                                           
                      {animImage && activeAnimFrames.length > 0 && (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            backgroundImage: `url(${animImage})`,
                            backgroundPosition: `-${
                              activeCol * spriteWidth * 4
                            }px -${activeRow * spriteHeight * 4}px`,
                            backgroundSize: `${animImageWidth * 4}px ${
                              animImageHeight * 4
                            }px`,
                            imageRendering: "pixelated",
                          }}
                        />
                      )}
                                         
                    </div>
                                       
                    <button
                      onClick={exportAsGif}
                      disabled={!animImage || activeAnimFrames.length === 0}
                      className="mt-6 w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 transition-colors"
                    >
                                            Export Preview as GIF              
                           
                    </button>
                                     
                  </div>
                                   
                  <div className="flex flex-col gap-2">
                                       
                    {hasAdvancedPhases && (
                      <div className="p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800">
                                               
                        <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                                                    First sprite of the Loop    
                                             
                        </h4>
                                               
                        <div
                          className="flex gap-2 overflow-x-auto min-h-[50px] p-2 bg-slate-50 dark:bg-slate-900/50 rounded border border-dashed border-slate-300 dark:border-slate-600 items-center"
                          onDragOver={handleDragOver}
                          onDrop={(e) =>
                            handleDrop(e, "entry", animEntry.length)
                          }
                        >
                                                   
                          {animEntry.map((frame, i) => (
                            <div
                              key={`entry-${i}`}
                              draggable
                              onDragStart={(e) =>
                                handleDragStart(e, "entry", i)
                              }
                              onDrop={(e) => {
                                e.stopPropagation();
                                handleDrop(e, "entry", i);
                              }}
                              onDoubleClick={() =>
                                setAnimEntry(
                                  animEntry.filter((_, idx) => idx !== i)
                                )
                              }
                              className="w-10 h-10 border border-fuchsia-400 bg-fuchsia-100 dark:bg-fuchsia-900/60 flex items-center justify-center text-sm font-bold text-fuchsia-700 dark:text-fuchsia-300 cursor-move rounded shrink-0 relative group"
                            >
                                                            {frame}             
                                             
                              <div className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                                                x              
                                               
                              </div>
                                                         
                            </div>
                          ))}
                                                   
                          {animEntry.length === 0 && (
                            <span className="text-xs text-slate-400 italic pointer-events-none">
                                                            Empty              
                                           
                            </span>
                          )}
                                                 
                        </div>
                                             
                      </div>
                    )}
                                       
                    <div className="p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800">
                                           
                      <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                                                Main Animation Sequence        
                                     
                      </h4>
                                           
                      <div
                        className="flex gap-2 overflow-x-auto min-h-[50px] p-2 bg-slate-50 dark:bg-slate-900/50 rounded border border-dashed border-slate-300 dark:border-slate-600 items-center"
                        onDragOver={handleDragOver}
                        onDrop={(e) =>
                          handleDrop(e, "repeat", animRepeat.length)
                        }
                      >
                                               
                        {animRepeat.map((frame, i) => (
                          <div
                            key={`repeat-${i}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, "repeat", i)}
                            onDrop={(e) => {
                              e.stopPropagation();
                              handleDrop(e, "repeat", i);
                            }}
                            onDoubleClick={() =>
                              setAnimRepeat(
                                animRepeat.filter((_, idx) => idx !== i)
                              )
                            }
                            className="w-10 h-10 border border-fuchsia-400 bg-fuchsia-100 dark:bg-fuchsia-900/60 flex items-center justify-center text-sm font-bold text-fuchsia-700 dark:text-fuchsia-300 cursor-move rounded shrink-0 relative group"
                          >
                                                        {frame}                 
                                     
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                                            x                  
                                       
                            </div>
                                                     
                          </div>
                        ))}
                                               
                        {animRepeat.length === 0 && (
                          <span className="text-xs text-slate-400 italic pointer-events-none">
                                                        Empty                  
                                   
                          </span>
                        )}
                                             
                      </div>
                                         
                    </div>
                                       
                    {hasAdvancedPhases && (
                      <div className="p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800">
                                               
                        <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                                                    Last Sprite of the loop    
                                             
                        </h4>
                                               
                        <div
                          className="flex gap-2 overflow-x-auto min-h-[50px] p-2 bg-slate-50 dark:bg-slate-900/50 rounded border border-dashed border-slate-300 dark:border-slate-600 items-center"
                          onDragOver={handleDragOver}
                          onDrop={(e) =>
                            handleDrop(e, "leaving", animLeaving.length)
                          }
                        >
                                                   
                          {animLeaving.map((frame, i) => (
                            <div
                              key={`leaving-${i}`}
                              draggable
                              onDragStart={(e) =>
                                handleDragStart(e, "leaving", i)
                              }
                              onDrop={(e) => {
                                e.stopPropagation();
                                handleDrop(e, "leaving", i);
                              }}
                              onDoubleClick={() =>
                                setAnimLeaving(
                                  animLeaving.filter((_, idx) => idx !== i)
                                )
                              }
                              className="w-10 h-10 border border-fuchsia-400 bg-fuchsia-100 dark:bg-fuchsia-900/60 flex items-center justify-center text-sm font-bold text-fuchsia-700 dark:text-fuchsia-300 cursor-move rounded shrink-0 relative group"
                            >
                                                            {frame}             
                                             
                              <div className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                                                x              
                                               
                              </div>
                                                         
                            </div>
                          ))}
                                                   
                          {animLeaving.length === 0 && (
                            <span className="text-xs text-slate-400 italic pointer-events-none">
                                                            Empty              
                                           
                            </span>
                          )}
                                                 
                        </div>
                                             
                      </div>
                    )}
                                     
                  </div>
                                 
                </div>
                             
              </div>
                           
              <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
                               
                <div className="flex justify-between items-center mb-2">
                                   
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Generated animationDescriptions String  
                                   
                  </label>
                                 
                </div>
                               
                <div className="flex gap-4">
                                   
                  <input
                    type="text"
                    readOnly
                    value={generatedAnimString}
                    className="flex-grow bg-slate-800 border border-slate-700 text-fuchsia-400 p-3 rounded font-mono text-sm outline-none"
                  />
                                   
                  <button
                    onClick={() => copyToClipboard(generatedAnimString)}
                    className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold py-2 px-6 rounded shadow transition-colors"
                  >
                                        Copy                  
                  </button>
                                 
                </div>
                             
              </div>
                         
            </div>
                     
          </div>
        )}
               
        {activeTool === "schedule" && (
          <div>
                       
            <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center">
                           
              <button
                onClick={() => setActiveTool("home")}
                className="text-orange-600 dark:text-orange-400 font-bold hover:underline flex items-center gap-2"
              >
                                Back to Toolkit Hub              
              </button>
                           
              <button
                onClick={() => setShowImport(!showImport)}
                className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 px-4 rounded transition-colors text-sm"
              >
                                {showImport ? "Close Import" : "Import JSON"}   
                         
              </button>
                         
            </div>
                       
            {showImport && (
              <div className="max-w-6xl mx-auto mb-8 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                               
                <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-2">
                                    Import Schedule JSON                
                </h3>
                               
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
                                    Upload a JSON file directly, or paste the
                  Entries block of a                   schedule file below.    
                             
                </p>
                               
                <div className="mb-4">
                                   
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleScheduleFileUpload}
                    className="w-full text-sm text-amber-700 dark:text-amber-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-amber-200 file:text-amber-800 hover:file:bg-amber-300 dark:file:bg-amber-900/50 dark:file:text-amber-300 cursor-pointer transition-colors"
                  />
                                 
                </div>
                               
                <textarea
                  className="w-full border border-amber-300 dark:border-amber-700 dark:bg-slate-800 dark:text-white p-2 rounded h-32 mb-3 font-mono text-sm shadow-inner"
                  placeholder='{ "spring": "900 Town 50 50 2 \"Hi!\"/1200 Saloon 10 15 0" }'
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                />
                               
                <button
                  onClick={handleImportSchedule}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded w-full shadow transition-colors text-lg"
                >
                                    Parse Schedules                
                </button>
                             
              </div>
            )}
                       
            <div className="max-w-6xl mx-auto bg-white dark:bg-slate-900 p-4 md:p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 transition-colors">
                           
              <h1 className="text-3xl font-bold text-orange-700 dark:text-orange-400 mb-6">
                                Schedule Editor              
              </h1>
                           
              <div className="flex flex-col md:flex-row gap-8">
                               
                <div className="w-full md:w-1/4 flex flex-col gap-4">
                                   
                  <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg">
                                       
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm uppercase tracking-wide">
                                            Schedule Keys                    
                    </h3>
                                       
                    <div className="flex flex-col gap-2">
                                           
                      {Object.keys(schedules).map((key) => (
                        <div
                          key={key}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer border ${
                            activeScheduleKey === key
                              ? "bg-orange-100 border-orange-500 dark:bg-orange-900/30 dark:border-orange-500 text-orange-800 dark:text-orange-300 font-bold"
                              : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-orange-300"
                          }`}
                          onClick={() => setActiveScheduleKey(key)}
                        >
                                                    <span>{key}</span>         
                                         
                          {Object.keys(schedules).length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteScheduleKey(key);
                              }}
                              className="text-red-400 hover:text-red-600 px-1"
                            >
                                                            X                  
                                       
                            </button>
                          )}
                                                 
                        </div>
                      ))}
                                         
                    </div>
                                       
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                                           
                      <input
                        type="text"
                        placeholder="e.g. rain, spring_13"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                        value={newScheduleKey}
                        onChange={(e) => setNewScheduleKey(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addScheduleKey()}
                      />
                                           
                      <button
                        onClick={addScheduleKey}
                        className="w-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-1.5 rounded text-sm hover:bg-slate-300 dark:hover:bg-slate-600"
                      >
                                                + Add Key                      
                      </button>
                                         
                    </div>
                                     
                  </div>
                                 
                </div>
                               
                <div className="w-full md:w-3/4 flex flex-col gap-4">
                                   
                  {activeScheduleKey && schedules[activeScheduleKey] && (
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg min-h-[400px] flex flex-col">
                                           
                      <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 text-sm uppercase tracking-wide border-b border-slate-200 dark:border-slate-700 pb-2">
                                                Waypoints for:
                        {activeScheduleKey}                     
                      </h3>
                                           
                      <div className="flex flex-col gap-4 flex-grow">
                                               
                        {schedules[activeScheduleKey].length === 0 && (
                          <p className="text-slate-500 italic text-sm text-center mt-10">
                                                        No waypoints yet.      
                                               
                          </p>
                        )}
                                               
                        {schedules[activeScheduleKey].map((pt, idx) => (
                          <div
                            key={pt.id}
                            className="flex flex-col gap-3 bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-700 shadow-sm relative group"
                          >
                                                       
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                           
                              <button
                                onClick={() =>
                                  removeSchedulePoint(activeScheduleKey, pt.id)
                                }
                                className="text-red-400 hover:text-red-600 font-bold px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded text-xs"
                              >
                                                                Delete          
                                                   
                              </button>
                                                         
                            </div>
                                                       
                            <div className="flex items-center gap-2 mb-1">
                                                           
                              <div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">
                                                                {idx + 1}       
                                                     
                              </div>
                                                           
                              <span className="text-xs font-bold text-slate-400 uppercase">
                                                                Schedule Point  
                                                           
                              </span>
                                                         
                            </div>
                                                       
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                                           
                              <div className="col-span-1">
                                                               
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                                                    Time        
                                                         
                                </label>
                                                               
                                <input
                                  type="text"
                                  className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                                  value={pt.time}
                                  onChange={(e) =>
                                    updateSchedulePoint(
                                      activeScheduleKey,
                                      pt.id,
                                      "time",
                                      e.target.value
                                    )
                                  }
                                  placeholder="900"
                                />
                                                             
                              </div>
                                                           
                              <div className="col-span-1 md:col-span-2">
                                                               
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                                                    Map Location
                                                                 
                                </label>
                                                               
                                <input
                                  type="text"
                                  list="savedLocationsList"
                                  className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                                  value={pt.location}
                                  onChange={(e) =>
                                    updateSchedulePoint(
                                      activeScheduleKey,
                                      pt.id,
                                      "location",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Town"
                                />
                                                             
                              </div>
                                                           
                              <div className="col-span-1">
                                                               
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                                                    Tile X      
                                                           
                                </label>
                                                               
                                <input
                                  type="text"
                                  className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                                  value={pt.x}
                                  onChange={(e) =>
                                    updateSchedulePoint(
                                      activeScheduleKey,
                                      pt.id,
                                      "x",
                                      e.target.value
                                    )
                                  }
                                />
                                                             
                              </div>
                                                           
                              <div className="col-span-1">
                                                               
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                                                    Tile Y      
                                                           
                                </label>
                                                               
                                <input
                                  type="text"
                                  className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                                  value={pt.y}
                                  onChange={(e) =>
                                    updateSchedulePoint(
                                      activeScheduleKey,
                                      pt.id,
                                      "y",
                                      e.target.value
                                    )
                                  }
                                />
                                                             
                              </div>
                                                         
                            </div>
                                                       
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                           
                              <div className="col-span-1">
                                                               
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                                                    Facing      
                                                           
                                </label>
                                                               
                                <select
                                  className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                                  value={pt.facing}
                                  onChange={(e) =>
                                    updateSchedulePoint(
                                      activeScheduleKey,
                                      pt.id,
                                      "facing",
                                      e.target.value
                                    )
                                  }
                                >
                                                                   
                                  <option value="0">0 (Up)</option>             
                                                     
                                  <option value="1">1 (Right)</option>         
                                                         
                                  <option value="2">2 (Down)</option>           
                                                       
                                  <option value="3">3 (Left)</option>           
                                                     
                                </select>
                                                             
                              </div>
                                                           
                              <div className="col-span-1 md:col-span-3">
                                                               
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                                                    Animation or
                                  Dialogue (Optional)                          
                                       
                                </label>
                                                               
                                <input
                                  type="text"
                                  className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                                  value={pt.animOrDialogue}
                                  onChange={(e) =>
                                    updateSchedulePoint(
                                      activeScheduleKey,
                                      pt.id,
                                      "animOrDialogue",
                                      e.target.value
                                    )
                                  }
                                  placeholder='e.g. square_3_3 OR "Hello there!"'
                                />
                                                             
                              </div>
                                                         
                            </div>
                                                     
                          </div>
                        ))}
                                             
                      </div>
                                           
                      <button
                        onClick={() => addSchedulePoint(activeScheduleKey)}
                        className="mt-4 w-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-4 py-3 rounded text-sm font-bold border border-orange-200 dark:border-orange-800 transition-colors hover:bg-orange-200 dark:hover:bg-orange-800/50"
                      >
                                                + Add Waypoint                  
                           
                      </button>
                                         
                    </div>
                  )}
                                 
                </div>
                             
              </div>
                         
            </div>
                       
            <div className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-700 p-4 shadow-2xl z-50">
                           
              <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-center">
                               
                <div className="flex-grow w-full">
                                   
                  <div className="flex justify-between items-center mb-1">
                                       
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Generated Schedule Entries JSON    
                                     
                    </label>
                                     
                  </div>
                                   
                  <textarea
                    className="w-full bg-slate-800 border border-slate-700 text-orange-400 p-3 rounded font-mono text-sm resize-none outline-none focus:border-orange-500 h-20 md:h-32"
                    readOnly
                    value={JSON.stringify(compiledSchedulesObject, null, 2)}
                  />
                                 
                </div>
                               
                <button
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(compiledSchedulesObject, null, 2)
                    )
                  }
                  className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-8 rounded-lg whitespace-nowrap shadow-lg transition-colors text-lg"
                >
                                    Copy Code                
                </button>
                             
              </div>
                         
            </div>
                     
          </div>
        )}
         
        {activeTool === "dialogue" && (
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setActiveTool("home")}
              className="mb-6 text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-2"
            >
              Back to Toolkit Hub
            </button>
            <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
              <div className="flex justify-between items-start mb-6">
                <h1 className="text-3xl font-bold text-teal-700 dark:text-teal-400">
                  Dialogue (i18n) Helper
                </h1>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          "Are you sure you want to clear all dialogue entries?"
                        )
                      ) {
                        setDialogueEntries([]);
                        setDialogueImport("");
                        setUseBasicDialogue(false);
                        setUseAdvancedDialogue(false);
                        setUseMarriageDialogue(false);
                        setNpcDialogueType("modded");
                        setDialogueModId("MyMod.Modname");
                      }
                    }}
                    className="bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 font-bold py-2 px-4 rounded transition-colors text-sm"
                  >
                    Reset All
                  </button>
                  <button
                    onClick={() => setShowImport(!showImport)}
                    className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 px-4 rounded transition-colors text-sm"
                  >
                    {showImport ? "Close Import" : "Import JSON"}
                  </button>
                </div>
              </div>

              {showImport && (
                <div className="mb-8 p-4 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50 rounded-lg">
                  <h3 className="font-bold text-teal-800 dark:text-teal-300 mb-2">
                    Import i18n JSON
                  </h3>
                  <textarea
                    className="w-full border border-teal-300 dark:border-teal-700 dark:bg-slate-800 dark:text-white p-2 rounded h-32 mb-3 font-mono text-sm shadow-inner"
                    placeholder='{ "spring_1": "Hello there!" }'
                    value={dialogueImport}
                    onChange={(e) => setDialogueImport(e.target.value)}
                  />
                  <button
                    onClick={handleImportDialogue}
                    className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-4 rounded w-full shadow transition-colors text-lg"
                  >
                    Parse Dialogue
                  </button>
                </div>
              )}
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                      Target NPC Type
                    </label>
                    <select
                      className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                      value={npcDialogueType}
                      onChange={(e) =>
                        setNpcDialogueType(
                          e.target.value as "modded" | "vanilla"
                        )
                      }
                    >
                      <option value="modded">Modded NPC</option>
                      <option value="vanilla">Vanilla NPC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                      NPC Internal ID
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm font-mono"
                      value={charId}
                      onChange={(e) => setCharId(e.target.value)}
                      placeholder="e.g. Abigail"
                    />
                  </div>
                  {npcDialogueType === "modded" && (
                    <div>
                      <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                        Mod ID
                      </label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm font-mono"
                        value={dialogueModId}
                        onChange={(e) => setDialogueModId(e.target.value)}
                        placeholder="e.g. Huskyn1nja.TimberFalls"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-800/50 p-4 rounded-lg mb-6">
                <h3 className="font-bold text-teal-800 dark:text-teal-300 mb-3 text-sm uppercase tracking-wide">
                  Generate Templates
                </h3>
                <div className="flex flex-wrap gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-semibold text-sm">
                    <input
                      type="checkbox"
                      checked={useBasicDialogue}
                      onChange={(e) => setUseBasicDialogue(e.target.checked)}
                      className="accent-teal-500 w-4 h-4"
                    />
                    Basic Dialogue
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-semibold text-sm">
                    <input
                      type="checkbox"
                      checked={useAdvancedDialogue}
                      onChange={(e) => setUseAdvancedDialogue(e.target.checked)}
                      className="accent-teal-500 w-4 h-4"
                    />
                    Advanced Dialogue
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-semibold text-sm">
                    <input
                      type="checkbox"
                      checked={useMarriageDialogue}
                      onChange={(e) => setUseMarriageDialogue(e.target.checked)}
                      className="accent-teal-500 w-4 h-4"
                    />
                    Marriage Dialogue
                  </label>
                </div>
                <button
                  onClick={generateDialogueTemplates}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded transition-colors text-sm w-full md:w-auto"
                >
                  Generate Selected Keys
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 md:p-6 rounded-lg flex flex-col gap-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wide">
                    Dialogue Entries
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    Total: {dialogueEntries.length}
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  {dialogueEntries.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="flex flex-col md:flex-row gap-4 items-start bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-700 shadow-sm relative group"
                    >
                      <button
                        onClick={() =>
                          setDialogueEntries(
                            dialogueEntries.filter((e) => e.id !== entry.id)
                          )
                        }
                        className="absolute top-2 right-2 text-red-400 hover:text-red-600 font-bold px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        Remove
                      </button>
                      <div className="w-full md:w-1/3">
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Translation Key
                        </label>
                        <input
                          type="text"
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                          value={entry.key}
                          onChange={(e) => {
                            const newEntries = [...dialogueEntries];
                            newEntries[idx].key = e.target.value;
                            setDialogueEntries(newEntries);
                          }}
                          placeholder="e.g. spring_1"
                        />
                      </div>
                      <div className="w-full md:w-2/3">
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Dialogue Text
                        </label>
                        <textarea
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white text-sm h-20 resize-y"
                          value={entry.value}
                          onChange={(e) => {
                            const newEntries = [...dialogueEntries];
                            newEntries[idx].value = e.target.value;
                            setDialogueEntries(newEntries);
                          }}
                          placeholder="Text goes here..."
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() =>
                    setDialogueEntries([
                      ...dialogueEntries,
                      { id: Date.now(), key: "", value: "" },
                    ])
                  }
                  className="mt-2 w-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-bold py-3 rounded border border-teal-300 dark:border-teal-800 hover:bg-teal-200 dark:hover:bg-teal-800/50 transition-colors"
                >
                  + Add Dialogue Entry
                </button>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-700 p-4 shadow-2xl z-50">
              <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-grow w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Generated i18n JSON
                    </label>
                    <textarea
                      className="w-full bg-slate-800 border border-slate-700 text-teal-400 p-3 rounded font-mono text-sm resize-none outline-none focus:border-teal-500 h-20 md:h-32"
                      readOnly
                      value={dialogueJsonString}
                    />
                    <button
                      onClick={() => copyToClipboard(dialogueJsonString)}
                      className="mt-2 w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors text-sm"
                    >
                      Copy i18n JSON
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Content Patcher JSON
                    </label>
                    <textarea
                      className="w-full bg-slate-800 border border-slate-700 text-teal-400 p-3 rounded font-mono text-sm resize-none outline-none focus:border-teal-500 h-20 md:h-32"
                      readOnly
                      value={dialogueCpJsonString}
                    />
                    <button
                      onClick={() => copyToClipboard(dialogueCpJsonString)}
                      className="mt-2 w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors text-sm"
                    >
                      Copy CP JSON
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
             
        {activeTool === "shop" && (
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setActiveTool("home")}
              className="mb-6 text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-2"
            >
              Back to Toolkit Hub
            </button>

            <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
              <div className="flex justify-between items-start mb-6">
                <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                  Shop Builder
                </h1>
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-bold py-2 px-4 rounded transition-colors text-sm flex items-center gap-2"
                >
                  🔍 Search IDs (Ctrl+K)
                </button>
              </div>

              <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                    Internal Shop ID
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono"
                    value={shopId}
                    onChange={(e) => setShopId(e.target.value)}
                    placeholder="e.g. MyMod_CustomShop"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                    Currency (0 = Gold)
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono"
                    value={shopCurrency}
                    onChange={(e) => setShopCurrency(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="mb-8 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-blue-200 dark:border-blue-900/50">
                <h3 className="font-bold text-blue-700 dark:text-blue-400 text-sm uppercase tracking-wide mb-4">
                  Shop Owners & Logic
                </h3>
                <div className="flex flex-col gap-6">
                  {shopOwners.map((owner, oIdx) => (
                    <div
                      key={owner.id}
                      className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm group"
                    >
                      <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Owner #{oIdx + 1}: {owner.name}
                        </span>
                        <button
                          onClick={() =>
                            setShopOwners(
                              shopOwners.filter((o) => o.id !== owner.id)
                            )
                          }
                          className="text-red-400 hover:text-red-600 text-xs font-bold"
                        >
                          Remove Owner
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">
                            NPC Name
                          </label>
                          <input
                            placeholder="Any / Abigail / {{Modid}}_NPCName"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white text-sm"
                            value={owner.name}
                            onChange={(e) =>
                              setShopOwners(
                                shopOwners.map((o) =>
                                  o.id === owner.id
                                    ? { ...o, name: e.target.value }
                                    : o
                                )
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">
                            Portrait Override
                          </label>
                          <input
                            placeholder="NPC Name or Asset Path"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white text-sm"
                            value={owner.portrait}
                            onChange={(e) =>
                              setShopOwners(
                                shopOwners.map((o) =>
                                  o.id === owner.id
                                    ? { ...o, portrait: e.target.value }
                                    : o
                                )
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">
                            Additional Conditions (if applicable)
                          </label>
                          <input
                            placeholder="e.g. PLAYER_HEARTS Abigail 4"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white text-sm"
                            value={owner.condition}
                            onChange={(e) =>
                              setShopOwners(
                                shopOwners.map((o) =>
                                  o.id === owner.id
                                    ? { ...o, condition: e.target.value }
                                    : o
                                )
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-slate-100 dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Open Time
                          </label>
                          <input
                            type="number"
                            placeholder="600"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm font-mono"
                            value={owner.openTime}
                            onChange={(e) =>
                              setShopOwners(
                                shopOwners.map((o) =>
                                  o.id === owner.id
                                    ? { ...o, openTime: e.target.value }
                                    : o
                                )
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Close Time
                          </label>
                          <input
                            type="number"
                            placeholder="2600"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm font-mono"
                            value={owner.closeTime}
                            onChange={(e) =>
                              setShopOwners(
                                shopOwners.map((o) =>
                                  o.id === owner.id
                                    ? { ...o, closeTime: e.target.value }
                                    : o
                                )
                              )
                            }
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">
                            Days Open (You can leave empty for everyday)
                          </label>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              "Monday",
                              "Tuesday",
                              "Wednesday",
                              "Thursday",
                              "Friday",
                              "Saturday",
                              "Sunday",
                            ].map((day) => {
                              const isSelected = owner.dayOfWeek.includes(day);
                              return (
                                <button
                                  key={day}
                                  onClick={() => {
                                    const newDays = isSelected
                                      ? owner.dayOfWeek.filter((d) => d !== day)
                                      : [...owner.dayOfWeek, day];
                                    setShopOwners(
                                      shopOwners.map((o) =>
                                        o.id === owner.id
                                          ? { ...o, dayOfWeek: newDays }
                                          : o
                                      )
                                    );
                                  }}
                                  className={`px-3 py-1.5 text-xs font-bold rounded border transition-colors ${
                                    isSelected
                                      ? "bg-blue-500 text-white border-blue-600"
                                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  }`}
                                >
                                  {day.substring(0, 3)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                        <h5 className="text-[10px] font-bold text-blue-400 uppercase mb-2">
                          Dialogue Variations
                        </h5>
                        {owner.dialogues.map((diag, dIdx) => (
                          <div
                            key={dIdx}
                            className="mb-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm relative group"
                          >
                            <button
                              onClick={() => {
                                const newDiags = owner.dialogues.filter(
                                  (_, idx) => idx !== dIdx
                                );
                                setShopOwners(
                                  shopOwners.map((o) =>
                                    o.id === owner.id
                                      ? { ...o, dialogues: newDiags }
                                      : o
                                  )
                                );
                              }}
                              className="absolute top-2 right-2 text-red-400 hover:text-red-600 font-bold px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded text-[10px] transition-opacity z-10"
                            >
                              Remove
                            </button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 pr-0 md:pr-16">
                              <input
                                placeholder="ID (e.g. SunnyDay)"
                                className="text-xs p-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded dark:text-white"
                                value={diag.id}
                                onChange={(e) => {
                                  const newDiags = [...owner.dialogues];
                                  newDiags[dIdx].id = e.target.value;
                                  setShopOwners(
                                    shopOwners.map((o) =>
                                      o.id === owner.id
                                        ? { ...o, dialogues: newDiags }
                                        : o
                                    )
                                  );
                                }}
                              />
                              <input
                                placeholder="Condition"
                                className="text-xs p-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded dark:text-white"
                                value={diag.condition}
                                onChange={(e) => {
                                  const newDiags = [...owner.dialogues];
                                  newDiags[dIdx].condition = e.target.value;
                                  setShopOwners(
                                    shopOwners.map((o) =>
                                      o.id === owner.id
                                        ? { ...o, dialogues: newDiags }
                                        : o
                                    )
                                  );
                                }}
                              />
                            </div>
                            <textarea
                              placeholder="Static Dialogue"
                              className="w-full text-sm p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-950 rounded mb-2 h-12 dark:text-white"
                              value={diag.dialogue}
                              onChange={(e) => {
                                const newDiags = [...owner.dialogues];
                                newDiags[dIdx].dialogue = e.target.value;
                                setShopOwners(
                                  shopOwners.map((o) =>
                                    o.id === owner.id
                                      ? { ...o, dialogues: newDiags }
                                      : o
                                  )
                                );
                              }}
                            />
                            <textarea
                              placeholder="Random Dialogue Lines (One per line)"
                              className="w-full text-xs p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-950 rounded h-16 italic font-mono dark:text-white"
                              value={diag.randomDialogue}
                              onChange={(e) => {
                                const newDiags = [...owner.dialogues];
                                newDiags[dIdx].randomDialogue = e.target.value;
                                setShopOwners(
                                  shopOwners.map((o) =>
                                    o.id === owner.id
                                      ? { ...o, dialogues: newDiags }
                                      : o
                                  )
                                );
                              }}
                            />
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newDiags = [
                              ...owner.dialogues,
                              {
                                id: "NewDiag",
                                dialogue: "",
                                randomDialogue: "",
                                condition: "",
                              },
                            ];
                            setShopOwners(
                              shopOwners.map((o) =>
                                o.id === owner.id
                                  ? { ...o, dialogues: newDiags }
                                  : o
                              )
                            );
                          }}
                          className="text-blue-600 hover:text-blue-500 text-xs font-bold"
                        >
                          + Add Dialogue Rule
                        </button>
                      </div>

                      <div className="mt-4">
                        <label className="block text-xs font-bold text-red-500 mb-1">
                          Closed Message
                        </label>
                        <input
                          className="w-full border border-red-200 dark:border-red-900/30 p-2 rounded bg-red-50/30 dark:bg-red-950/20 text-sm dark:text-white"
                          value={owner.closedMessage}
                          onChange={(e) =>
                            setShopOwners(
                              shopOwners.map((o) =>
                                o.id === owner.id
                                  ? { ...o, closedMessage: e.target.value }
                                  : o
                              )
                            )
                          }
                          placeholder="Sorry, the shop is currently closed."
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setShopOwners([
                        ...shopOwners,
                        {
                          id: Date.now(),
                          name: "",
                          entryId: "",
                          condition: "",
                          openTime: "600",
                          closeTime: "2600",
                          dayOfWeek: [],
                          portrait: "",
                          closedMessage: "",
                          randomizeDialogueOnOpen: true,
                          dialogues: [
                            {
                              id: "Default",
                              dialogue: "Hi!",
                              randomDialogue: "",
                              condition: "",
                            },
                          ],
                        },
                      ])
                    }
                    className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded font-bold text-sm shadow-md self-start"
                  >
                    + Add New Shop Owner
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 md:p-6 rounded-lg flex flex-col gap-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wide">
                    Shop Inventory
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    Total Items: {shopItems.length}
                  </span>
                </div>

                <div className="flex flex-col gap-6">
                  {shopItems.map((item: any, idx: number) => (
                    <div
                      key={item.id || idx}
                      className="bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-700 shadow-sm relative group"
                    >
                      <button
                        onClick={() =>
                          setShopItems(
                            shopItems.filter((i: any) => i.id !== item.id)
                          )
                        }
                        className="absolute top-2 right-2 text-red-400 hover:text-red-600 font-bold px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded text-xs transition-colors z-10"
                      >
                        Remove
                      </button>

                      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Item Entry
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="md:col-span-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Entry ID
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                            value={item.entryId || ""}
                            onChange={(e) =>
                              setShopItems(
                                shopItems.map((i: any) =>
                                  i.id === item.id
                                    ? { ...i, entryId: e.target.value }
                                    : i
                                )
                              )
                            }
                            placeholder="{{ModId}}_ItemName"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Item ID
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                            value={item.itemId || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setShopItems(
                                shopItems.map((i: any) => {
                                  if (i.id === item.id) {
                                    const isDefault =
                                      !i.entryId ||
                                      i.entryId.startsWith(
                                        "{{ModId}}_NewItem"
                                      ) ||
                                      i.entryId.startsWith("Item_");
                                    const cleanName = val.replace(
                                      /[^a-zA-Z0-9]/g,
                                      ""
                                    );
                                    return {
                                      ...i,
                                      itemId: val,
                                      entryId:
                                        isDefault && cleanName
                                          ? `{{ModId}}_${cleanName}`
                                          : i.entryId,
                                    };
                                  }
                                  return i;
                                })
                              );
                            }}
                            placeholder="(O)388"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Custom Price
                          </label>
                          <input
                            type="number"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                            value={item.price || ""}
                            onChange={(e) =>
                              setShopItems(
                                shopItems.map((i: any) =>
                                  i.id === item.id
                                    ? { ...i, price: e.target.value }
                                    : i
                                )
                              )
                            }
                            placeholder="Default"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Stock (-1 = Infinite)
                          </label>
                          <input
                            type="number"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                            value={item.availableStock || ""}
                            onChange={(e) =>
                              setShopItems(
                                shopItems.map((i: any) =>
                                  i.id === item.id
                                    ? { ...i, availableStock: e.target.value }
                                    : i
                                )
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="md:col-span-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Trade Item ID
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                            value={item.tradeItemId || ""}
                            onChange={(e) =>
                              setShopItems(
                                shopItems.map((i: any) =>
                                  i.id === item.id
                                    ? { ...i, tradeItemId: e.target.value }
                                    : i
                                )
                              )
                            }
                            placeholder="Optional"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Trade Amount
                          </label>
                          <input
                            type="number"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                            value={item.tradeItemAmount || ""}
                            onChange={(e) =>
                              setShopItems(
                                shopItems.map((i: any) =>
                                  i.id === item.id
                                    ? { ...i, tradeItemAmount: e.target.value }
                                    : i
                                )
                              )
                            }
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Stock Limit Type
                          </label>
                          <select
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                            value={item.availableStockLimit || "Global"}
                            onChange={(e) =>
                              setShopItems(
                                shopItems.map((i: any) =>
                                  i.id === item.id
                                    ? {
                                        ...i,
                                        availableStockLimit: e.target.value,
                                      }
                                    : i
                                )
                              )
                            }
                          >
                            <option value="Global">Global</option>
                            <option value="Player">Player</option>
                            <option value="None">None</option>
                          </select>
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Apply Profit Margins?
                          </label>
                          <select
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                            value={item.applyProfitMargins || "null"}
                            onChange={(e) =>
                              setShopItems(
                                shopItems.map((i: any) =>
                                  i.id === item.id
                                    ? {
                                        ...i,
                                        applyProfitMargins: e.target.value,
                                      }
                                    : i
                                )
                              )
                            }
                          >
                            <option value="null">Default (Null)</option>
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="md:col-span-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Shop Visibility Condition
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                            value={item.condition || ""}
                            onChange={(e) =>
                              setShopItems(
                                shopItems.map((i: any) =>
                                  i.id === item.id
                                    ? { ...i, condition: e.target.value }
                                    : i
                                )
                              )
                            }
                            placeholder="e.g. PLAYER_HAS_MAIL Current Any MyMod_Flag"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            PerItemCondition
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                            value={item.perItemCondition || ""}
                            onChange={(e) =>
                              setShopItems(
                                shopItems.map((i: any) =>
                                  i.id === item.id
                                    ? { ...i, perItemCondition: e.target.value }
                                    : i
                                )
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Actions On Purchase (One per line)
                        </label>
                        <textarea
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm h-20 resize-y"
                          value={item.actionsOnPurchase || ""}
                          onChange={(e) =>
                            setShopItems(
                              shopItems.map((i: any) =>
                                i.id === item.id
                                  ? { ...i, actionsOnPurchase: e.target.value }
                                  : i
                              )
                            )
                          }
                          placeholder="AddConversationTopic MyMod_PurchasedItem 5"
                        />
                      </div>

                      <div className="flex gap-6 mt-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-sm">
                          <input
                            type="checkbox"
                            checked={item.avoidRepeat || false}
                            onChange={(e) =>
                              setShopItems(
                                shopItems.map((i: any) =>
                                  i.id === item.id
                                    ? { ...i, avoidRepeat: e.target.checked }
                                    : i
                                )
                              )
                            }
                            className="accent-blue-500 w-4 h-4 cursor-pointer"
                          />
                          Avoid Repeat
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-sm">
                          <input
                            type="checkbox"
                            checked={item.useObjectDataPrice || false}
                            onChange={(e) =>
                              setShopItems(
                                shopItems.map((i: any) =>
                                  i.id === item.id
                                    ? {
                                        ...i,
                                        useObjectDataPrice: e.target.checked,
                                      }
                                    : i
                                )
                              )
                            }
                            className="accent-blue-500 w-4 h-4 cursor-pointer"
                          />
                          Use ObjectData Price
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-sm">
                          <input
                            type="checkbox"
                            checked={item.ignoreShopPriceModifiers || false}
                            onChange={(e) =>
                              setShopItems(
                                shopItems.map((i: any) =>
                                  i.id === item.id
                                    ? {
                                        ...i,
                                        ignoreShopPriceModifiers:
                                          e.target.checked,
                                      }
                                    : i
                                )
                              )
                            }
                            className="accent-blue-500 w-4 h-4 cursor-pointer"
                          />
                          Ignore Shop Modifiers
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() =>
                    setShopItems([
                      ...shopItems,
                      {
                        id: Date.now(),
                        entryId: `{{ModIdd}}_`,
                        itemId: "(O)",
                        price: "",
                        availableStock: "-1",
                        condition: "",
                        tradeItemId: "",
                        tradeItemAmount: "1",
                        availableStockLimit: "Global",
                        avoidRepeat: false,
                        useObjectDataPrice: false,
                        ignoreShopPriceModifiers: false,
                        applyProfitMargins: "null",
                        perItemCondition: "",
                        actionsOnPurchase: "",
                      },
                    ])
                  }
                  className="mt-2 w-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold py-3 rounded border border-blue-300 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                >
                  + Add Item Manually
                </button>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-700 p-4 shadow-2xl z-50">
              <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-grow w-full">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Generated JSON
                  </label>
                  <textarea
                    className="w-full bg-slate-800 border border-slate-700 text-blue-400 p-3 rounded font-mono text-sm resize-none outline-none focus:border-blue-500 h-20 md:h-32"
                    readOnly
                    value={shopJsonString}
                  />
                </div>
                <button
                  onClick={() => copyToClipboard(shopJsonString)}
                  className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg whitespace-nowrap shadow-lg transition-colors text-lg"
                >
                  Copy Code
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTool === "non_npc_home" && (
          <div className="max-w-6xl mx-auto">
                       
            <button
              onClick={() => setActiveTool("home")}
              className="mb-6 text-stone-600 dark:text-stone-400 font-bold hover:underline flex items-center gap-2"
            >
                            Back to Toolkit Hub            
            </button>
                       
            <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-200 mb-8 text-center mt-8">
                            Non-NPC Tools            
            </h1>
                       
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-6">
                           
              <button
                onClick={() => setActiveTool("chair_tiles")}
                className="group bg-white dark:bg-slate-900 border-2 border-yellow-500 hover:border-yellow-400 p-6 rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl text-left flex flex-col items-start"
              >
                                               
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                                    Chair Tiles Editor                
                </h2>
                               
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                                    Helps decide where the farmer can plant
                  their butt.           
                </p>
                             
              </button>
                           
              <button
                onClick={() => setActiveTool("trash_cans")}
                className="group bg-white dark:bg-slate-900 border-2 border-stone-500 hover:border-stone-400 p-6 rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl text-left flex flex-col items-start"
              >
                               
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-stone-600 dark:group-hover:text-stone-400 transition-colors">
                                    Custom Trash Cans                
                </h2>
                               
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Add new trash cans to the world or edit existing ones.
                </p>
                             
              </button>
                           
              <button
                onClick={() => setActiveTool("item_builder")}
                className="group bg-white dark:bg-slate-900 border-2 border-violet-500 hover:border-violet-400 p-6 rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl text-left flex flex-col items-start"
              >
                               
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                    Item & Recipe Builder                
                </h2>
                               
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                                    Helps to create custom objects, big
                  craftables, and recipes and stuff          
                </p>
                             
              </button>
                         
            </div>
                     
          </div>
        )}
               
        {activeTool === "trash_cans" && (
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setActiveTool("non_npc_home")}
              className="mb-6 text-stone-600 dark:text-stone-400 font-bold hover:underline flex items-center gap-2"
            >
              Back to Non-NPC Tools
            </button>

            <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
              <div className="flex justify-between items-start mb-6">
                <h1 className="text-3xl font-bold text-stone-700 dark:text-stone-400">
                  Custom Trash Cans (1.6)
                </h1>
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-900/30 dark:hover:bg-stone-900/50 text-stone-700 dark:text-stone-400 font-bold py-2 px-4 rounded transition-colors text-sm flex items-center gap-2"
                >
                  🔍 Search IDs (Ctrl+K)
                </button>
              </div>

              {trashCans.map((tc, tcIdx) => (
                <div
                  key={tc.id}
                  className="mb-8 border border-slate-300 dark:border-slate-700 rounded-lg p-4 md:p-6 bg-slate-50 dark:bg-slate-800"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-stone-700 dark:text-stone-300">
                      Trash Can Definition #{tcIdx + 1}
                    </h2>
                    {trashCans.length > 1 && (
                      <button
                        onClick={() =>
                          setTrashCans(trashCans.filter((t) => t.id !== tc.id))
                        }
                        className="text-red-400 hover:text-red-600 font-bold px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded text-sm transition-colors"
                      >
                        Remove Trash Can
                      </button>
                    )}
                  </div>

                  <div className="mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-lg">
                    <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                      Garbage Can Internal ID
                    </label>
                    <input
                      type="text"
                      className="w-full md:w-1/2 border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono"
                      value={tc.canId}
                      onChange={(e) =>
                        setTrashCans(
                          trashCans.map((t) =>
                            t.id === tc.id ? { ...t, canId: e.target.value } : t
                          )
                        )
                      }
                      placeholder="{{ModId}}_CustomTrash"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      In Tiled, on the buildings data layer, give your map tile the custom property:
                      <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-stone-600 dark:text-stone-300 font-bold">
                        Action: Garbage {tc.canId}
                      </code>
                    </p>
                  </div>

                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wide">
                      Trash Drops
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">
                      Total: {tc.drops.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-6">
                    {tc.drops.map((drop: any, idx: number) => (
                      <div
                        key={drop.id}
                        className="bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-700 shadow-sm relative group"
                      >
                        <button
                          onClick={() =>
                            setTrashCans(
                              trashCans.map((t) =>
                                t.id === tc.id
                                  ? {
                                      ...t,
                                      drops: t.drops.filter(
                                        (d: any) => d.id !== drop.id
                                      ),
                                    }
                                  : t
                              )
                            )
                          }
                          className="absolute top-2 right-2 text-red-400 hover:text-red-600 font-bold px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded text-xs transition-colors z-10"
                        >
                          Remove Drop
                        </button>

                        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <div className="bg-stone-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">
                            {idx + 1}
                          </div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Drop Definition
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Drop Entry ID
                            </label>
                            <input
                              type="text"
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                              value={drop.dropId}
                              onChange={(e) =>
                                setTrashCans(
                                  trashCans.map((t) =>
                                    t.id === tc.id
                                      ? {
                                          ...t,
                                          drops: t.drops.map((d: any) =>
                                            d.id === drop.id
                                              ? { ...d, dropId: e.target.value }
                                              : d
                                          ),
                                        }
                                      : t
                                  )
                                )
                              }
                              placeholder="{{ModId}}_DropName"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Item ID to Spawn
                            </label>
                            <input
                              type="text"
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                              value={drop.itemId}
                              onChange={(e) =>
                                setTrashCans(
                                  trashCans.map((t) =>
                                    t.id === tc.id
                                      ? {
                                          ...t,
                                          drops: t.drops.map((d: any) =>
                                            d.id === drop.id
                                              ? { ...d, itemId: e.target.value }
                                              : d
                                          ),
                                        }
                                      : t
                                  )
                                )
                              }
                              placeholder="(O)128"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Spawn Chance (0 to 1)
                            </label>
                            <input
                              type="text"
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                              value={drop.chance}
                              onChange={(e) =>
                                setTrashCans(
                                  trashCans.map((t) =>
                                    t.id === tc.id
                                      ? {
                                          ...t,
                                          drops: t.drops.map((d: any) =>
                                            d.id === drop.id
                                              ? { ...d, chance: e.target.value }
                                              : d
                                          ),
                                        }
                                      : t
                                  )
                                )
                              }
                              placeholder="0.25"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Additional Condition
                            </label>
                            <input
                              type="text"
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                              value={drop.condition}
                              onChange={(e) =>
                                setTrashCans(
                                  trashCans.map((t) =>
                                    t.id === tc.id
                                      ? {
                                          ...t,
                                          drops: t.drops.map((d: any) =>
                                            d.id === drop.id
                                              ? {
                                                  ...d,
                                                  condition: e.target.value,
                                                }
                                              : d
                                          ),
                                        }
                                      : t
                                  )
                                )
                              }
                              placeholder="e.g. SEASON spring"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 mt-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                            <input
                              type="checkbox"
                              checked={drop.ignoreBaseChance}
                              onChange={(e) =>
                                setTrashCans(
                                  trashCans.map((t) =>
                                    t.id === tc.id
                                      ? {
                                          ...t,
                                          drops: t.drops.map((d: any) =>
                                            d.id === drop.id
                                              ? {
                                                  ...d,
                                                  ignoreBaseChance:
                                                    e.target.checked,
                                                }
                                              : d
                                          ),
                                        }
                                      : t
                                  )
                                )
                              }
                              className="accent-stone-500 w-4 h-4 cursor-pointer"
                            />
                            Ignore Base Chance
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                            <input
                              type="checkbox"
                              checked={drop.isMegaSuccess}
                              onChange={(e) =>
                                setTrashCans(
                                  trashCans.map((t) =>
                                    t.id === tc.id
                                      ? {
                                          ...t,
                                          drops: t.drops.map((d: any) =>
                                            d.id === drop.id
                                              ? {
                                                  ...d,
                                                  isMegaSuccess:
                                                    e.target.checked,
                                                }
                                              : d
                                          ),
                                        }
                                      : t
                                  )
                                )
                              }
                              className="accent-stone-500 w-4 h-4 cursor-pointer"
                            />
                            Mega Success (Hat/Lid pop)
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                            <input
                              type="checkbox"
                              checked={drop.isDoubleMegaSuccess}
                              onChange={(e) =>
                                setTrashCans(
                                  trashCans.map((t) =>
                                    t.id === tc.id
                                      ? {
                                          ...t,
                                          drops: t.drops.map((d: any) =>
                                            d.id === drop.id
                                              ? {
                                                  ...d,
                                                  isDoubleMegaSuccess:
                                                    e.target.checked,
                                                }
                                              : d
                                          ),
                                        }
                                      : t
                                  )
                                )
                              }
                              className="accent-stone-500 w-4 h-4 cursor-pointer"
                            />
                            Double Mega Success (Explosion)
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                            <input
                              type="checkbox"
                              checked={drop.addToInventoryDirectly}
                              onChange={(e) =>
                                setTrashCans(
                                  trashCans.map((t) =>
                                    t.id === tc.id
                                      ? {
                                          ...t,
                                          drops: t.drops.map((d: any) =>
                                            d.id === drop.id
                                              ? {
                                                  ...d,
                                                  addToInventoryDirectly:
                                                    e.target.checked,
                                                }
                                              : d
                                          ),
                                        }
                                      : t
                                  )
                                )
                              }
                              className="accent-stone-500 w-4 h-4 cursor-pointer"
                            />
                            Add Direct to Inventory
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                            <input
                              type="checkbox"
                              checked={drop.createMultipleDebris}
                              onChange={(e) =>
                                setTrashCans(
                                  trashCans.map((t) =>
                                    t.id === tc.id
                                      ? {
                                          ...t,
                                          drops: t.drops.map((d: any) =>
                                            d.id === drop.id
                                              ? {
                                                  ...d,
                                                  createMultipleDebris:
                                                    e.target.checked,
                                                }
                                              : d
                                          ),
                                        }
                                      : t
                                  )
                                )
                              }
                              className="accent-stone-500 w-4 h-4 cursor-pointer"
                            />
                            Create Multiple Debris
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      setTrashCans(
                        trashCans.map((t) =>
                          t.id === tc.id
                            ? {
                                ...t,
                                drops: [
                                  ...t.drops,
                                  {
                                    id: Date.now(),
                                    dropId: `{{ModId}}_NewDrop`,
                                    itemId: "(O)",
                                    chance: "0.10",
                                    condition: "",
                                    ignoreBaseChance: false,
                                    isMegaSuccess: false,
                                    isDoubleMegaSuccess: false,
                                    addToInventoryDirectly: false,
                                    createMultipleDebris: false,
                                  },
                                ],
                              }
                            : t
                        )
                      )
                    }
                    className="mt-4 w-full bg-white dark:bg-slate-900 text-stone-700 dark:text-stone-400 font-bold py-3 rounded border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    + Add Drop to this Trash Can
                  </button>
                </div>
              ))}

              <button
                onClick={() =>
                  setTrashCans([
                    ...trashCans,
                    {
                      id: Date.now(),
                      canId: "{{ModId}}_NewTrashCan",
                      drops: [
                        {
                          id: Date.now() + 1,
                          dropId: "{{ModId}}_NewDrop",
                          itemId: "(O)",
                          chance: "0.10",
                          condition: "",
                          ignoreBaseChance: false,
                          isMegaSuccess: false,
                          isDoubleMegaSuccess: false,
                          addToInventoryDirectly: false,
                          createMultipleDebris: false,
                        },
                      ],
                    },
                  ])
                }
                className="w-full bg-stone-100 dark:bg-stone-900/30 text-stone-700 dark:text-stone-400 font-bold py-4 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800/50 transition-colors text-lg"
              >
                + Add Another Trash Can Definition
              </button>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-700 p-4 shadow-2xl z-50">
              <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-grow w-full">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Generated JSON
                  </label>
                  <textarea
                    className="w-full bg-slate-800 border border-slate-700 text-stone-400 p-3 rounded font-mono text-sm resize-none outline-none focus:border-stone-500 h-20 md:h-32"
                    readOnly
                    value={trashJsonString}
                  />
                </div>
                <button
                  onClick={() => copyToClipboard(trashJsonString)}
                  className="w-full md:w-auto bg-stone-600 hover:bg-stone-700 text-white font-bold py-4 px-8 rounded-lg whitespace-nowrap shadow-lg transition-colors text-lg"
                >
                  Copy Code
                </button>
              </div>
            </div>
          </div>
        )}
         
        {activeTool === "item_builder" && (
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setActiveTool("non_npc_home")}
              className="mb-6 text-violet-600 dark:text-violet-400 font-bold hover:underline flex items-center gap-2"
            >
              Back to Non-NPC Tools
            </button>
            <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
              <h1 className="text-3xl font-bold text-violet-700 dark:text-violet-400 mb-6">
                Item & Recipe Builder
              </h1>
              <div className="flex flex-wrap gap-4 mb-6 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                {["Object", "BigCraftable", "Machine", "Recipe"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setItemType(type as any)}
                    className={`flex-1 py-2 font-bold rounded min-w-[120px] ${
                      itemType === type
                        ? "bg-white dark:bg-slate-700 shadow text-violet-600 dark:text-violet-400"
                        : "text-slate-500"
                    }`}
                  >
                    {type === "BigCraftable" ? "Big Craftable" : type}
                  </button>
                ))}
              </div>

              {(itemType === "Object" ||
                itemType === "BigCraftable" ||
                itemType === "Machine") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                      Internal ID
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                      value={itemIdBuilder}
                      onChange={(e) => setItemIdBuilder(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                      Internal Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                    />
                  </div>
                </div>
              )}
              {itemType === "Machine" && (
                <div className="flex flex-col gap-4 mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-sm">
                    Machine Output Rules
                  </h3>
                  {machineRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-100 dark:bg-slate-800 p-4 rounded border border-slate-300 dark:border-slate-600"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Rule ID
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                            value={rule.id}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].id = e.target.value;
                              setMachineRules(newRules);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Trigger
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                            value={rule.trigger}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].trigger = e.target.value;
                              setMachineRules(newRules);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Required Item ID
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                            value={rule.reqItemId}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].reqItemId = e.target.value;
                              setMachineRules(newRules);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Required Tags
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                            value={rule.reqTags}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].reqTags = e.target.value;
                              setMachineRules(newRules);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Required Count
                          </label>
                          <input
                            type="number"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                            value={rule.reqCount}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].reqCount = Number(e.target.value);
                              setMachineRules(newRules);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Condition
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                            value={rule.condition}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].condition = e.target.value;
                              setMachineRules(newRules);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Output Item ID
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                            value={rule.outItemId}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].outItemId = e.target.value;
                              setMachineRules(newRules);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Min Stack
                          </label>
                          <input
                            type="number"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                            value={rule.outMinStack}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].outMinStack = Number(
                                e.target.value
                              );
                              setMachineRules(newRules);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Max Stack
                          </label>
                          <input
                            type="number"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                            value={rule.outMaxStack}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].outMaxStack = Number(
                                e.target.value
                              );
                              setMachineRules(newRules);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Preserve Type
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                            value={rule.preserveType}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].preserveType = e.target.value;
                              setMachineRules(newRules);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Preserve ID
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                            value={rule.preserveId}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].preserveId = e.target.value;
                              setMachineRules(newRules);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Minutes Until Ready
                          </label>
                          <input
                            type="number"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                            value={rule.minsReady}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].minsReady = Number(e.target.value);
                              setMachineRules(newRules);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Days Until Ready
                          </label>
                          <input
                            type="number"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                            value={rule.daysReady}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].daysReady = Number(e.target.value);
                              setMachineRules(newRules);
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                          <input
                            type="checkbox"
                            checked={rule.copyColor}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].copyColor = e.target.checked;
                              setMachineRules(newRules);
                            }}
                            className="accent-violet-500 w-4 h-4 cursor-pointer"
                          />
                          Copy Color
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                          <input
                            type="checkbox"
                            checked={rule.copyPrice}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].copyPrice = e.target.checked;
                              setMachineRules(newRules);
                            }}
                            className="accent-violet-500 w-4 h-4 cursor-pointer"
                          />
                          Copy Price
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                          <input
                            type="checkbox"
                            checked={rule.copyQuality}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].copyQuality = e.target.checked;
                              setMachineRules(newRules);
                            }}
                            className="accent-violet-500 w-4 h-4 cursor-pointer"
                          />
                          Copy Quality
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                          <input
                            type="checkbox"
                            checked={rule.recalculate}
                            onChange={(e) => {
                              const newRules = [...machineRules];
                              newRules[idx].recalculate = e.target.checked;
                              setMachineRules(newRules);
                            }}
                            className="accent-violet-500 w-4 h-4 cursor-pointer"
                          />
                          Recalculate On Collect
                        </label>
                      </div>
                    </div>
                  ))}

                  <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-sm mt-4">
                    Machine Global Properties
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Ready Time Modifier Mode
                      </label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                        value={machineProps.readyTimeModifierMode}
                        onChange={(e) =>
                          setMachineProps({
                            ...machineProps,
                            readyTimeModifierMode: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Clear Contents Overnight Condition
                      </label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                        value={machineProps.clearContentsOvernightCondition}
                        onChange={(e) =>
                          setMachineProps({
                            ...machineProps,
                            clearContentsOvernightCondition: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Working Effect Chance (0 to 1)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                        value={machineProps.workingEffectChance}
                        onChange={(e) =>
                          setMachineProps({
                            ...machineProps,
                            workingEffectChance: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Invalid Item Message
                      </label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                        value={machineProps.invalidItemMessage}
                        onChange={(e) =>
                          setMachineProps({
                            ...machineProps,
                            invalidItemMessage: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Invalid Count Message
                      </label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                        value={machineProps.invalidCountMessage}
                        onChange={(e) =>
                          setMachineProps({
                            ...machineProps,
                            invalidCountMessage: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Interact Method
                      </label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                        value={machineProps.interactMethod}
                        onChange={(e) =>
                          setMachineProps({
                            ...machineProps,
                            interactMethod: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Experience Gain On Harvest
                      </label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                        value={machineProps.experienceGainOnHarvest}
                        onChange={(e) =>
                          setMachineProps({
                            ...machineProps,
                            experienceGainOnHarvest: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={machineProps.allowFairyDust}
                        onChange={(e) =>
                          setMachineProps({
                            ...machineProps,
                            allowFairyDust: e.target.checked,
                          })
                        }
                        className="accent-violet-500 w-4 h-4 cursor-pointer"
                      />
                      Allow Fairy Dust
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={machineProps.onlyCompleteOvernight}
                        onChange={(e) =>
                          setMachineProps({
                            ...machineProps,
                            onlyCompleteOvernight: e.target.checked,
                          })
                        }
                        className="accent-violet-500 w-4 h-4 cursor-pointer"
                      />
                      Only Complete Overnight
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={machineProps.allowLoadWhenFull}
                        onChange={(e) =>
                          setMachineProps({
                            ...machineProps,
                            allowLoadWhenFull: e.target.checked,
                          })
                        }
                        className="accent-violet-500 w-4 h-4 cursor-pointer"
                      />
                      Allow Load When Full
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={machineProps.wobbleWhileWorking}
                        onChange={(e) =>
                          setMachineProps({
                            ...machineProps,
                            wobbleWhileWorking: e.target.checked,
                          })
                        }
                        className="accent-violet-500 w-4 h-4 cursor-pointer"
                      />
                      Wobble While Working
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={machineProps.showNextIndexWhileWorking}
                        onChange={(e) =>
                          setMachineProps({
                            ...machineProps,
                            showNextIndexWhileWorking: e.target.checked,
                          })
                        }
                        className="accent-violet-500 w-4 h-4 cursor-pointer"
                      />
                      Show Next Index While Working
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={machineProps.showNextIndexWhenReady}
                        onChange={(e) =>
                          setMachineProps({
                            ...machineProps,
                            showNextIndexWhenReady: e.target.checked,
                          })
                        }
                        className="accent-violet-500 w-4 h-4 cursor-pointer"
                      />
                      Show Next Index When Ready
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={machineProps.hasInput}
                        onChange={(e) =>
                          setMachineProps({
                            ...machineProps,
                            hasInput: e.target.checked,
                          })
                        }
                        className="accent-violet-500 w-4 h-4 cursor-pointer"
                      />
                      Force Has Input Tag
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={machineProps.hasOutput}
                        onChange={(e) =>
                          setMachineProps({
                            ...machineProps,
                            hasOutput: e.target.checked,
                          })
                        }
                        className="accent-violet-500 w-4 h-4 cursor-pointer"
                      />
                      Force Has Output Tag
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={machineProps.isIncubator}
                        onChange={(e) =>
                          setMachineProps({
                            ...machineProps,
                            isIncubator: e.target.checked,
                          })
                        }
                        className="accent-violet-500 w-4 h-4 cursor-pointer"
                      />
                      Is Incubator
                    </label>
                  </div>
                </div>
              )}

              {itemType === "Recipe" && (
                <div className="flex flex-col gap-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                        Recipe Key / Name
                      </label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="Usually the output item's name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                        Recipe Type
                      </label>
                      <select
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                        value={recipeType}
                        onChange={(e) =>
                          setRecipeType(
                            e.target.value as "Cooking" | "Crafting"
                          )
                        }
                      >
                        <option value="Cooking">Cooking</option>
                        <option value="Crafting">Crafting</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wide">
                        Ingredients List
                      </h3>
                      <button
                        onClick={() =>
                          setRecipeIngredients([
                            ...recipeIngredients,
                            { id: "246", amount: 1 },
                          ])
                        }
                        className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-bold px-3 py-1.5 rounded hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                      >
                        + Add Ingredient
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
                      {recipeIngredients.map((ing, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Item ID or Category (e.g. -4 for Fish)
                            </label>
                            <input
                              type="text"
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm font-mono"
                              value={ing.id}
                              onChange={(e) => {
                                const newIngs = [...recipeIngredients];
                                newIngs[idx].id = e.target.value;
                                setRecipeIngredients(newIngs);
                              }}
                            />
                          </div>
                          <div className="w-24">
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Amount
                            </label>
                            <input
                              type="number"
                              min="1"
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm font-mono text-center"
                              value={ing.amount}
                              onChange={(e) => {
                                const newIngs = [...recipeIngredients];
                                newIngs[idx].amount = Number(e.target.value);
                                setRecipeIngredients(newIngs);
                              }}
                            />
                          </div>
                          {recipeIngredients.length > 1 && (
                            <button
                              onClick={() => {
                                setRecipeIngredients(
                                  recipeIngredients.filter((_, i) => i !== idx)
                                );
                              }}
                              className="text-red-400 hover:text-red-600 font-bold px-2 self-end mb-2"
                            >
                              X
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg flex flex-col gap-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wide">
                  Details
                </h3>

                {(itemType === "Object" ||
                  itemType === "BigCraftable" ||
                  itemType === "Machine") && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                        value={itemDisplayName}
                        onChange={(e) => setItemDisplayName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Description
                      </label>
                      <textarea
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm h-16"
                        value={itemDesc}
                        onChange={(e) => setItemDesc(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Sell Price
                        </label>
                        <input
                          type="number"
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                          value={itemPrice}
                          onChange={(e) => setItemPrice(Number(e.target.value))}
                        />
                      </div>

                      {itemType === "Object" && (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Category
                            </label>
                            <select
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                              value={itemCategory}
                              onChange={(e) => setItemCategory(e.target.value)}
                            >
                              <option value="0">None</option>
                              <option value="-2">Gem</option>
                              <option value="-4">Fish</option>
                              <option value="-5">Egg</option>
                              <option value="-6">Milk</option>
                              <option value="-7">Cooking</option>
                              <option value="-8">Crafting</option>
                              <option value="-12">Mineral</option>
                              <option value="-14">Meat</option>
                              <option value="-15">Metal Resources (-15)</option>
                              <option value="-16">Building Resources</option>
                              <option value="-17">Sell at Pierres</option>
                              <option value="-18">
                                Sell at Pierres/Marnies
                              </option>
                              <option value="-19">Fertilizer </option>
                              <option value="-20">Trash </option>
                              <option value="-21">Bait</option>
                              <option value="-22">Tackle</option>
                              <option value="-23">Sell at Fish Shop</option>
                              <option value="-24">Furniture</option>
                              <option value="-25">Ingredients</option>
                              <option value="-26">Artisan Goods</option>
                              <option value="-27">Syrup</option>
                              <option value="-28">Monster Loot</option>
                              <option value="-29">Equipment</option>
                              <option value="-74">Seed</option>
                              <option value="-75">Vegetable</option>
                              <option value="-79">Fruit</option>
                              <option value="-80">Flower</option>
                              <option value="-81">Forage</option>
                              <option value="-95">Hat</option>
                              <option value="-96">Ring</option>
                              <option value="-97">Boots</option>
                              <option value="-98">Weapon</option>
                              <option value="-99">Tool</option>
                              <option value="-100">Clothing</option>
                              <option value="-101">Trinket</option>
                              <option value="-102">Books</option>
                              <option value="-103">Skill Books</option>
                              <option value="-999">Litter</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Edibility (-300 = inedible)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                                value={itemEdibility}
                                onChange={(e) =>
                                  setItemEdibility(Number(e.target.value))
                                }
                              />
                              <span className="text-xs font-bold text-slate-500 whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded border border-slate-200 dark:border-slate-700">
                                {itemEdibility === -300
                                  ? "Inedible"
                                  : `⚡ ${Math.round(
                                      itemEdibility * 2.5
                                    )} / 💖 ${Math.floor(
                                      Math.max(0, itemEdibility * 1.125)
                                    )}`}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                      {(itemType === "BigCraftable" ||
                        itemType === "Machine") && (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Fragility
                            </label>
                            <select
                              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                              value={bcFragility}
                              onChange={(e) =>
                                setBcFragility(Number(e.target.value))
                              }
                            >
                              <option value={0}>0 (Any tool to pickup)</option>
                              <option value={1}>1 (Destroyed by tools)</option>
                              <option value={2}>2 (Cannot be removed)</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-2 justify-center pt-2">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                              <input
                                type="checkbox"
                                checked={bcCanBePlacedIndoors}
                                onChange={(e) =>
                                  setBcCanBePlacedIndoors(e.target.checked)
                                }
                                className="accent-violet-500 w-4 h-4 cursor-pointer"
                              />
                              Can Be Placed Indoors
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                              <input
                                type="checkbox"
                                checked={bcCanBePlacedOutdoors}
                                onChange={(e) =>
                                  setBcCanBePlacedOutdoors(e.target.checked)
                                }
                                className="accent-violet-500 w-4 h-4 cursor-pointer"
                              />
                              Can Be Placed Outdoors
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-xs">
                              <input
                                type="checkbox"
                                checked={bcIsLamp}
                                onChange={(e) => setBcIsLamp(e.target.checked)}
                                className="accent-violet-500 w-4 h-4 cursor-pointer"
                              />
                              Is Lamp (Emits Light)
                            </label>
                            {itemType === "Machine" && (
                              <div className="mt-1 p-2 bg-violet-100 dark:bg-violet-900/30 rounded border border-violet-200 dark:border-violet-800 text-[10px] text-violet-800 dark:text-violet-300 italic">
                                Machine logic template will be generated in the
                                output below.
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}

                {itemType === "Recipe" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Display Name (if different from key)
                        </label>
                        <input
                          type="text"
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                          value={itemDisplayName}
                          onChange={(e) => setItemDisplayName(e.target.value)}
                          placeholder="Leave blank to use default name"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Yield Item ID (Use (BC) for BigCraftable)
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm font-mono"
                            value={recipeYield}
                            onChange={(e) => setRecipeYield(e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Yield Amount
                          </label>
                          <input
                            type="number"
                            min="1"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm font-mono text-center"
                            value={recipeYieldAmount}
                            onChange={(e) =>
                              setRecipeYieldAmount(Number(e.target.value))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Unlock Condition
                        </label>
                        <select
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm font-mono"
                          value={recipeUnlockType}
                          onChange={(e) =>
                            setRecipeUnlockType(e.target.value as any)
                          }
                        >
                          <option value="default">
                            Learned Automatically (default)
                          </option>
                          <option value="null">
                            Manual / Event Unlock (null)
                          </option>
                          <option value="skill">Level Up Skill</option>
                          {recipeType === "Cooking" && (
                            <option value="friendship">
                              NPC Friendship (Cooking Only)
                            </option>
                          )}
                        </select>
                      </div>

                      {(recipeUnlockType === "skill" ||
                        recipeUnlockType === "friendship") && (
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            {recipeUnlockType === "skill"
                              ? "Skill Level (e.g. Farming 1)"
                              : "NPC & Hearts (e.g. Emily 3)"}
                          </label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm font-mono"
                            value={recipeUnlockParam}
                            onChange={(e) =>
                              setRecipeUnlockParam(e.target.value)
                            }
                            placeholder={
                              recipeUnlockType === "skill"
                                ? "Farming 1"
                                : "Emily 3"
                            }
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-700 p-4 shadow-2xl z-50">
              <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-grow w-full">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Generated JSON
                  </label>
                  <textarea
                    className="w-full bg-slate-800 border border-slate-700 text-violet-400 p-3 rounded font-mono text-sm resize-none outline-none focus:border-violet-500 h-20 md:h-32"
                    readOnly
                    value={itemJsonString}
                  />
                </div>
                <button
                  onClick={() => copyToClipboard(itemJsonString)}
                  className="w-full md:w-auto bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 px-8 rounded-lg whitespace-nowrap shadow-lg transition-colors text-lg"
                >
                  Copy Code
                </button>
              </div>
            </div>
          </div>
        )}
               
        {activeTool === "chair_tiles" && (
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setActiveTool("non_npc_home")}
              className="mb-6 text-yellow-600 dark:text-yellow-400 font-bold hover:underline flex items-center gap-2"
            >
              Back to Non-NPC Tools
            </button>

            <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
              <h1 className="text-3xl font-bold text-yellow-700 dark:text-yellow-400 mb-6">
                Chair Tiles Editor
              </h1>

              <div className="flex flex-col gap-6">
                {chairTiles.map((ct, idx) => (
                  <div
                    key={ct.id}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-lg shadow-sm relative group"
                  >
                    <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="font-bold text-yellow-600 dark:text-yellow-500">
                        Chair Definition #{idx + 1}
                      </span>
                      {chairTiles.length > 1 && (
                        <button
                          onClick={() =>
                            setChairTiles(
                              chairTiles.filter((t) => t.id !== ct.id)
                            )
                          }
                          className="text-red-400 hover:text-red-600 font-bold px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded text-xs"
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Tilesheet Name
                        </label>
                        <input
                          type="text"
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white font-mono text-sm"
                          value={ct.tilesheet}
                          onChange={(e) =>
                            setChairTiles(
                              chairTiles.map((t) =>
                                t.id === ct.id
                                  ? { ...t, tilesheet: e.target.value }
                                  : t
                              )
                            )
                          }
                          placeholder="spring_town"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Tile X Position
                        </label>
                        <input
                          type="number"
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white font-mono text-sm"
                          value={ct.x}
                          onChange={(e) =>
                            setChairTiles(
                              chairTiles.map((t) =>
                                t.id === ct.id
                                  ? { ...t, x: Number(e.target.value) }
                                  : t
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Tile Y Position
                        </label>
                        <input
                          type="number"
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white font-mono text-sm"
                          value={ct.y}
                          onChange={(e) =>
                            setChairTiles(
                              chairTiles.map((t) =>
                                t.id === ct.id
                                  ? { ...t, y: Number(e.target.value) }
                                  : t
                              )
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Tile Width
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white font-mono text-sm"
                          value={ct.width}
                          onChange={(e) =>
                            setChairTiles(
                              chairTiles.map((t) =>
                                t.id === ct.id
                                  ? { ...t, width: Number(e.target.value) }
                                  : t
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Tile Height
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white font-mono text-sm"
                          value={ct.height}
                          onChange={(e) =>
                            setChairTiles(
                              chairTiles.map((t) =>
                                t.id === ct.id
                                  ? { ...t, height: Number(e.target.value) }
                                  : t
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Direction
                        </label>
                        <select
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white font-mono text-sm"
                          value={ct.direction}
                          onChange={(e) =>
                            setChairTiles(
                              chairTiles.map((t) =>
                                t.id === ct.id
                                  ? { ...t, direction: e.target.value }
                                  : t
                              )
                            )
                          }
                        >
                          <option value="up">Up</option>
                          <option value="down">Down</option>
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                          <option value="opposite">Opposite</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Chair Type
                        </label>
                        <select
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white font-mono text-sm"
                          value={ct.type}
                          onChange={(e) =>
                            setChairTiles(
                              chairTiles.map((t) =>
                                t.id === ct.id
                                  ? { ...t, type: e.target.value }
                                  : t
                              )
                            )
                          }
                        >
                          <option value="chair">chair</option>
                          <option value="bench">bench</option>
                          <option value="booth">booth</option>
                          <option value="couch">couch</option>
                          <option value="highback_chair">highback_chair</option>
                          <option value="picnic">picnic</option>
                          <option value="playground">playground</option>
                          <option value="stool">stool</option>
                          <option value="stool short">stool short</option>
                          <option value="stool tall">stool tall</option>
                          <option value="summitbench">summitbench</option>
                          <option value="swings">swings</option>
                          <option value="bathchair tall">bathchair tall</option>
                          <option value="chair tall">chair tall</option>
                          <option value="ccdesk">ccdesk</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Draw Tile X (-1 for none)
                        </label>
                        <input
                          type="number"
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white font-mono text-sm"
                          value={ct.drawX}
                          onChange={(e) =>
                            setChairTiles(
                              chairTiles.map((t) =>
                                t.id === ct.id
                                  ? { ...t, drawX: Number(e.target.value) }
                                  : t
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Draw Tile Y (-1 for none)
                        </label>
                        <input
                          type="number"
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white font-mono text-sm"
                          value={ct.drawY}
                          onChange={(e) =>
                            setChairTiles(
                              chairTiles.map((t) =>
                                t.id === ct.id
                                  ? { ...t, drawY: Number(e.target.value) }
                                  : t
                              )
                            )
                          }
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Alternate Draw Tilesheet
                        </label>
                        <input
                          type="text"
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white font-mono text-sm"
                          value={ct.altTilesheet}
                          onChange={(e) =>
                            setChairTiles(
                              chairTiles.map((t) =>
                                t.id === ct.id
                                  ? { ...t, altTilesheet: e.target.value }
                                  : t
                              )
                            )
                          }
                          placeholder="TileSheets\\CustomTileSheet"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300 text-sm">
                      <input
                        type="checkbox"
                        checked={ct.seasonal}
                        onChange={(e) =>
                          setChairTiles(
                            chairTiles.map((t) =>
                              t.id === ct.id
                                ? { ...t, seasonal: e.target.checked }
                                : t
                            )
                          )
                        }
                        className="accent-yellow-500 w-4 h-4"
                      />
                      Is Seasonal (Spring/Summer/Fall/Winter setup required)
                    </label>
                  </div>
                ))}

                <button
                  onClick={() =>
                    setChairTiles([
                      ...chairTiles,
                      {
                        id: Date.now(),
                        tilesheet: "",
                        x: 0,
                        y: 0,
                        width: 1,
                        height: 1,
                        direction: "down",
                        type: "chair",
                        drawX: -1,
                        drawY: -1,
                        seasonal: false,
                        altTilesheet: "",
                      },
                    ])
                  }
                  className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-bold py-3 rounded border border-yellow-300 dark:border-yellow-700 hover:bg-yellow-200 dark:hover:bg-yellow-800/50"
                >
                  + Add Chair Tile Definition
                </button>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-700 p-4 shadow-2xl z-50">
              <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-grow w-full">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Generated JSON
                  </label>
                  <textarea
                    className="w-full bg-slate-800 border border-slate-700 text-yellow-400 p-3 rounded font-mono text-sm resize-none outline-none focus:border-yellow-500 h-20 md:h-32"
                    readOnly
                    value={chairTilesJsonString}
                  />
                </div>
                <button
                  onClick={() => copyToClipboard(chairTilesJsonString)}
                  className="w-full md:w-auto bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-8 rounded-lg whitespace-nowrap shadow-lg transition-colors text-lg"
                >
                  Copy Code
                </button>
              </div>
            </div>
          </div>
        )}
               
        {activeTool === "quests" && (
          <div className="max-w-4xl mx-auto">
                       
            <button
              onClick={() => setActiveTool("home")}
              className="mb-6 text-cyan-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-2"
            >
                            Back to Toolkit Hub            
            </button>
                       
            <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
                           
              <h1 className="text-3xl font-bold text-cyan-700 dark:text-cyan-400 mb-6">
                                Quest Builder              
              </h1>
                           
              <div className="flex gap-4 mb-6 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                               
                <button
                  onClick={() => setQuestFormat("quest")}
                  className={`flex-1 py-2 font-bold rounded ${
                    questFormat === "quest"
                      ? "bg-white dark:bg-slate-700 shadow text-cyan-600 dark:text-cyan-400"
                      : "text-slate-500"
                  }`}
                >
                                    Standard Quest                
                </button>
                               
                <button
                  onClick={() => setQuestFormat("special_order")}
                  className={`flex-1 py-2 font-bold rounded ${
                    questFormat === "special_order"
                      ? "bg-white dark:bg-slate-700 shadow text-cyan-600 dark:text-cyan-400"
                      : "text-slate-500"
                  }`}
                >
                                    Special Order                
                </button>
                             
              </div>
                           
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                               
                <div>
                                   
                  <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                                        Quest/Order ID                  
                  </label>
                                   
                  <input
                    type="text"
                    className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                    value={questId}
                    onChange={(e) => setQuestId(e.target.value)}
                  />
                                 
                </div>
                               
                <div>
                                   
                  <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">
                                        Target NPC (Requester)                  
                  </label>
                                   
                  <input
                    type="text"
                    className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                    value={questNpc}
                    onChange={(e) => setQuestNpc(e.target.value)}
                  />
                                 
                </div>
                             
              </div>
                           
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg flex flex-col gap-4 mb-6">
                               
                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wide">
                                    Quest Details                
                </h3>
                               
                <div>
                                   
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                                        Quest Title                  
                  </label>
                                   
                  <input
                    type="text"
                    className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                    value={questTitle}
                    onChange={(e) => setQuestTitle(e.target.value)}
                  />
                                 
                </div>
                               
                <div>
                                   
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                                        Quest Description / Text                
                     
                  </label>
                                   
                  <textarea
                    className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm h-20"
                    value={questDesc}
                    onChange={(e) => setQuestDesc(e.target.value)}
                  />
                                 
                </div>
                               
                {questFormat === "quest" && (
                  <div>
                                       
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                                            Completion Dialogue                
                         
                    </label>
                                       
                    <textarea
                      className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm h-16"
                      value={questDialogue}
                      onChange={(e) => setQuestDialogue(e.target.value)}
                    />
                                     
                  </div>
                )}
                             
              </div>
                           
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg flex flex-col gap-4">
                               
                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wide">
                                    Objectives & Rewards                
                </h3>
                               
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                   
                  <div>
                                       
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                                            Objective Type                    
                    </label>
                                       
                    <select
                      className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                      value={questType}
                      onChange={(e) => setQuestType(e.target.value)}
                    >
                                           
                      <option value="ItemDelivery">
                                                Item Delivery / Deliver        
                                     
                      </option>
                                           
                      <option value="ItemHarvest">Item Harvest / Gather</option>
                                           
                      <option value="Monster">Monster Slay / Slay</option>     
                                   
                    </select>
                                     
                  </div>
                                   
                  <div className="relative">
                                       
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                                            Target Item/Monster                
                         
                    </label>
                                       
                    <input
                      type="text"
                      className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                      value={questObj}
                      onChange={(e) => setQuestObj(e.target.value)}
                      placeholder="e.g. 388 or Slime"
                    />
                                     
                  </div>
                                   
                  <div>
                                       
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                                            Amount Required                    
                    </label>
                                       
                    <input
                      type="number"
                      className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                      value={questObjAmount}
                      onChange={(e) =>
                        setQuestObjAmount(Number(e.target.value))
                      }
                    />
                                     
                  </div>
                                 
                </div>
                               
                <div>
                                   
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                                        Gold Reward                  
                  </label>
                                   
                  <input
                    type="number"
                    className="w-full md:w-1/3 border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                    value={questReward}
                    onChange={(e) => setQuestReward(Number(e.target.value))}
                  />
                                 
                </div>
                             
              </div>
                         
            </div>
                       
            <div className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-700 p-4 shadow-2xl z-50">
                           
              <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-center">
                               
                <div className="flex-grow w-full">
                                   
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Generated JSON                  
                  </label>
                                   
                  <textarea
                    className="w-full bg-slate-800 border border-slate-700 text-cyan-400 p-3 rounded font-mono text-sm resize-none outline-none focus:border-cyan-500 h-20 md:h-32"
                    readOnly
                    value={questJsonString}
                  />
                                 
                </div>
                               
                <button
                  onClick={() => copyToClipboard(questJsonString)}
                  className="w-full md:w-auto bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-8 rounded-lg whitespace-nowrap shadow-lg transition-colors text-lg"
                >
                                    Copy Code                
                </button>
                             
              </div>
                         
            </div>
                     
          </div>
        )}
               
        {activeTool === "wizard" && (
          <div className="max-w-4xl mx-auto">
                       
            <button
              onClick={() => setActiveTool("home")}
              className="mb-6 text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-2"
            >
                            Back to Toolkit Hub            
            </button>
                       
            <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8 transition-all">
                           
              <div className="flex justify-between items-center mb-8 border-b border-slate-200 dark:border-slate-700 pb-4">
                               
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                                    New NPC Wizard                
                </h1>
                               
                <div className="flex gap-2">
                                   
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div
                      key={step}
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                        wizardStep === step
                          ? "bg-indigo-600 text-white"
                          : wizardStep > step
                          ? "bg-indigo-200 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                      }`}
                    >
                                            {step}                   
                    </div>
                  ))}
                                 
                </div>
                             
              </div>
                           
              {wizardStep === 1 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                   
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
                    Step 1: The Basics                  
                  </h2>
                                   
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Let's start with the fundamental IDs. This forms the
                    backbone of how Stardew Valley recognizes your character.   
                             
                  </p>
                                   
                  <div className="flex flex-col gap-6">
                                       
                    <div>
                                           
                      <label className="block text-sm font-bold mb-1 text-slate-700 dark:text-slate-300">
                                                Internal NPC ID
                        <span className="text-red-500">*</span>                 
                           
                      </label>
                                           
                      <p className="text-xs text-slate-500 mb-2">
  Used internally. Should be unique to avoid mod
  conflicts. Best practice is to use {"{{ModId}}"}_Name.
  E.g.,                        
  <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
  {"{{ModId}}"}_MayorMcButtface would read as Huskyn1nja.CoolGuyMod_MayorMcButtface       
  </code>                                             
</p>
                                           
                      <input
                        type="text"
                        className="w-full border border-slate-300 dark:border-slate-600 p-3 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono"
                        value={charId}
                        onChange={(e) => {
                          setCharId(e.target.value);
                          setGiftNpcId(e.target.value);
                        }}
                      />
                                         
                    </div>
                                       
                    <div>
                                           
                      <label className="block text-sm font-bold mb-1 text-slate-700 dark:text-slate-300">
                                                Display Name
                        <span className="text-red-500">*</span>                 
                           
                      </label>
                                           
                      <p className="text-xs text-slate-500 mb-2">
                                                What the player sees in-game.  
                                           
                      </p>
                                           
                      <input
                        type="text"
                        className="w-full border border-slate-300 dark:border-slate-600 p-3 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                        value={charDisplayName}
                        onChange={(e) => setCharDisplayName(e.target.value)}
                      />
                                         
                    </div>
                                     
                  </div>
                                 
                </div>
              )}
                           
              {wizardStep === 2 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                   
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
                                        Step 2: Demographics & Personality      
                               
                  </h2>
                                   
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                       
                    <div className="flex gap-4">
                                           
                      <div className="flex-1">
                                               
                        <label className="block text-sm font-bold mb-1 text-slate-700 dark:text-slate-300">
                                                    Birth Season                
                                 
                        </label>
                                               
                        <select
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                          value={charBirthSeason}
                          onChange={(e) => setCharBirthSeason(e.target.value)}
                        >
                                                   
                          {["Spring", "Summer", "Fall", "Winter"].map((s) => (
                            <option key={s} value={s}>
                                                            {s}                 
                                       
                            </option>
                          ))}
                                                 
                        </select>
                                             
                      </div>
                                           
                      <div className="flex-1">
                                               
                        <label className="block text-sm font-bold mb-1 text-slate-700 dark:text-slate-300">
                                                    Birth Day                  
                               
                        </label>
                                               
                        <input
                          type="number"
                          min="1"
                          max="28"
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                          value={charBirthDay}
                          onChange={(e) => setCharBirthDay(e.target.value)}
                        />
                                             
                      </div>
                                         
                    </div>
                                       
                    <div className="flex gap-4">
                                           
                      <div className="flex-1">
                                               
                        <label className="block text-sm font-bold mb-1 text-slate-700 dark:text-slate-300">
                                                    Gender                      
                           
                        </label>
                                               
                        <select
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
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
                                               
                        <label className="block text-sm font-bold mb-1 text-slate-700 dark:text-slate-300">
                                                    Age                        
                        </label>
                                               
                        <select
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
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
                                           
                      <label className="block text-sm font-bold mb-1 text-slate-700 dark:text-slate-300">
                                                Manner                      
                      </label>
                                           
                      <select
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
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
                                       
                    <div>
                                           
                      <label className="block text-sm font-bold mb-1 text-slate-700 dark:text-slate-300">
                                                Social Anxiety                  
                           
                      </label>
                                           
                      <select
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
                        value={charSocialAnxiety}
                        onChange={(e) => setCharSocialAnxiety(e.target.value)}
                      >
                                               
                        {["Neutral", "Outgoing", "Shy"].map((s) => (
                          <option key={s} value={s}>
                                                        {s}                     
                               
                          </option>
                        ))}
                                             
                      </select>
                                         
                    </div>
                                       
                    <div>
                                           
                      <label className="block text-sm font-bold mb-1 text-slate-700 dark:text-slate-300">
                                                Optimism                      
                      </label>
                                           
                      <select
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white"
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
                                       
                    <div className="flex items-center pt-6">
                                           
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300 text-sm">
                                               
                        <input
                          type="checkbox"
                          checked={charCanBeRomanced}
                          onChange={(e) =>
                            setCharCanBeRomanced(e.target.checked)
                          }
                          className="accent-indigo-500 w-5 h-5 cursor-pointer"
                        />
                                                Is Romancable                  
                           
                      </label>
                                         
                    </div>
                                     
                  </div>
                                 
                </div>
              )}
                           
              {wizardStep === 3 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                   
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
                                        Step 3: Initial Spawns & Default Data  
                                   
                  </h2>
                                   
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 mb-6">
                                       
                    <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-2">
                                            Default Home (Spawn Point)          
                               
                    </h3>
                                       
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                           
                      <div className="md:col-span-2">
                                               
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                                                    Map Name                    
                             
                        </label>
                                               
                        <input
                          type="text"
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                          value={charHomeLocation}
                          onChange={(e) => setCharHomeLocation(e.target.value)}
                          placeholder="Town"
                        />
                                             
                      </div>
                                           
                      <div>
                                               
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                                                    Tile X                      
                           
                        </label>
                                               
                        <input
                          type="number"
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                          value={charHomeX}
                          onChange={(e) => setCharHomeX(e.target.value)}
                        />
                                             
                      </div>
                                           
                      <div>
                                               
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                                                    Tile Y                      
                           
                        </label>
                                               
                        <input
                          type="number"
                          className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-900 dark:text-white text-sm"
                          value={charHomeY}
                          onChange={(e) => setCharHomeY(e.target.value)}
                        />
                                             
                      </div>
                                         
                    </div>
                                     
                  </div>
                                   
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
                                       
                    <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-2">
                                            Basic Gift Tastes                  
                       
                    </h3>
                                       
                    <p className="text-xs text-slate-500 mb-4">
                                            You can expand this later in the
                      full Gift tool. Give them at least one Loved and Hated item ID.                    
                    </p>
                                       
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                           
                      <div>
                                               
                        <label className="block text-xs font-bold text-pink-500 mb-1">
                                                    Loved Items (Space Separated
                          IDs)                        
                        </label>
                                               
                        <input
                          type="text"
                          className="w-full border border-pink-300 dark:border-pink-800 p-2 rounded bg-white dark:bg-slate-900 dark:text-white font-mono text-sm"
                          value={giftTastes.love.items}
                          onChange={(e) =>
                            setGiftTastes({
                              ...giftTastes,
                              love: {
                                ...giftTastes.love,
                                items: e.target.value,
                              },
                            })
                          }
                          placeholder="e.g. 66 128"
                        />
                                             
                      </div>
                                           
                      <div>
                                               
                        <label className="block text-xs font-bold text-red-500 mb-1">
                                                    Hated Items (Space Separated
                          IDs)                        
                        </label>
                                               
                        <input
                          type="text"
                          className="w-full border border-red-300 dark:border-red-800 p-2 rounded bg-white dark:bg-slate-900 dark:text-white font-mono text-sm"
                          value={giftTastes.hate.items}
                          onChange={(e) =>
                            setGiftTastes({
                              ...giftTastes,
                              hate: {
                                ...giftTastes.hate,
                                items: e.target.value,
                              },
                            })
                          }
                          placeholder="e.g. 330"
                        />
                                             
                      </div>
                                         
                    </div>
                                     
                  </div>
                                 
                </div>
              )}
                           
              {wizardStep === 4 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                   
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
                                        Step 4: Default Schedule                
                     
                  </h2>
                                   
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Where does {charDisplayName} go on a normal Spring day? Create a simple routine below. You can always expand it later.                
                  </p>
                                   
                  <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg min-h-[300px] flex flex-col">
                                       
                    <div className="flex flex-col gap-4 flex-grow">
                                           
                      {schedules["spring"]?.map((pt, idx) => (
                        <div
                          key={pt.id}
                          className="flex flex-col gap-3 bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-700 shadow-sm relative"
                        >
                                                   
                          <button
                            onClick={() => removeSchedulePoint("spring", pt.id)}
                            className="absolute top-2 right-2 text-red-400 hover:text-red-600 font-bold px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded text-xs"
                          >
                                                        Delete                  
                                   
                          </button>
                                                   
                          <div className="flex items-center gap-2 mb-1">
                                                       
                            <div className="bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">
                                                            {idx + 1}           
                                             
                            </div>
                                                     
                          </div>
                                                   
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                       
                            <div className="col-span-1">
                                                           
                              <label className="block text-xs font-bold text-slate-500 mb-1">
                                                                Time            
                                                 
                              </label>
                                                           
                              <input
                                type="text"
                                className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                                value={pt.time}
                                onChange={(e) =>
                                  updateSchedulePoint(
                                    "spring",
                                    pt.id,
                                    "time",
                                    e.target.value
                                  )
                                }
                                placeholder="900"
                              />
                                                         
                            </div>
                                                       
                            <div className="col-span-1 md:col-span-1">
                                                           
                              <label className="block text-xs font-bold text-slate-500 mb-1">
                                                                Location        
                                                     
                              </label>
                                                           
                              <input
                                type="text"
                                className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                                value={pt.location}
                                onChange={(e) =>
                                  updateSchedulePoint(
                                    "spring",
                                    pt.id,
                                    "location",
                                    e.target.value
                                  )
                                }
                                placeholder="Town"
                              />
                                                         
                            </div>
                                                       
                            <div className="col-span-1">
                                                           
                              <label className="block text-xs font-bold text-slate-500 mb-1">
                                                                X / Y          
                                                   
                              </label>
                                                           
                              <div className="flex gap-1">
                                                               
                                <input
                                  type="text"
                                  className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm text-center"
                                  value={pt.x}
                                  onChange={(e) =>
                                    updateSchedulePoint(
                                      "spring",
                                      pt.id,
                                      "x",
                                      e.target.value
                                    )
                                  }
                                  placeholder="X"
                                />
                                                               
                                <input
                                  type="text"
                                  className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm text-center"
                                  value={pt.y}
                                  onChange={(e) =>
                                    updateSchedulePoint(
                                      "spring",
                                      pt.id,
                                      "y",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Y"
                                />
                                                             
                              </div>
                                                         
                            </div>
                                                       
                            <div className="col-span-1">
                                                           
                              <label className="block text-xs font-bold text-slate-500 mb-1">
                                                                Facing          
                                                   
                              </label>
                                                           
                              <select
                                className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm"
                                value={pt.facing}
                                onChange={(e) =>
                                  updateSchedulePoint(
                                    "spring",
                                    pt.id,
                                    "facing",
                                    e.target.value
                                  )
                                }
                              >
                                                               
                                <option value="0">Up</option>                   
                                            <option value="1">Right</option>   
                                                           
                                <option value="2">Down</option>                 
                                              <option value="3">Left</option>   
                                                         
                              </select>
                                                         
                            </div>
                                                     
                          </div>
                                                 
                        </div>
                      ))}
                                         
                    </div>
                                       
                    <button
                      onClick={() => addSchedulePoint("spring")}
                      className="mt-4 w-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-4 py-3 rounded text-sm font-bold border border-indigo-200 dark:border-indigo-800 transition-colors hover:bg-indigo-200 dark:hover:bg-indigo-800/50"
                    >
                                            + Add Waypoint                    
                    </button>
                                     
                  </div>
                                 
                </div>
              )}
                           
              {wizardStep === 5 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-8">
                                    <div className="text-6xl mb-6">🎉</div>     
                             
                  <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">
                                        Hooray! You did it!                  
                  </h2>
                                   
                  <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-lg mx-auto">
                    Your character's basic info, default schedule, and gift
                    tastes have been compiled into a complete Content Patcher
                    formatted mod file.                  
                  </p>
                                   
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                                       
                    <button
                      onClick={handleDownloadMod}
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-lg flex items-center justify-center gap-2"
                    >
                                           
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                                               
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                                             
                      </svg>
                                            Download Mod Files                  
                       
                    </button>
                                     
                  </div>
                                   
                  <p className="text-xs text-slate-400 mt-6">
                                        (This will download a content.json, and dialogue.json if you created specific gift dialogues.)                  
                  </p>
                                 
                </div>
              )}
                           
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                               
                <button
                  onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
                  disabled={wizardStep === 1}
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 px-6 rounded transition-colors disabled:opacity-30"
                >
                                    Back                
                </button>
                               
                {wizardStep < 5 && (
                  <button
                    onClick={() => setWizardStep(wizardStep + 1)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-8 rounded transition-colors shadow"
                  >
                    Next Step
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
