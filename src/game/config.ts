export const CONFIG = {
  width: 20,
  height: 14,
  capacity: 6,
  credits: 600,
  firstEggSeconds: 60,
  eggSeconds: 5400,
  syncSeconds: 60,
  offlineHours: 72,
  incomeHours: 24,
  stepSeconds: 20,
  freeFood: 48,
  foodPackSize: 12,
  foodPackPrice: 10,
  maxFoodReserve: 240,
  careCooldown: 30,
  maxEggs: 2,
  expansionPrice: 1800,
  expandedWidth: 24,
  expandedHeight: 16,
  expandedCapacity: 10,
  babyHours: 6,
  adultHours: 24,
  veteranHours: 120,
} as const;
export const needLabels = {
  health: "Saúde",
  satiety: "Alimentação",
  hydration: "Hidratação",
  energy: "Energia",
  hygiene: "Higiene",
  social: "Social",
  fun: "Lazer",
  comfort: "Conforto",
};
export type Need = keyof typeof needLabels;
export type Rarity = "common" | "uncommon" | "rare";
export const rarities = {
  common: { label: "Comum", color: "#62a974", baseValue: 250 },
  uncommon: { label: "Incomum", color: "#559abf", baseValue: 425 },
  rare: { label: "Raro", color: "#9275ba", baseValue: 750 },
} as const;
type SpeciesDefinition = {
  name: string;
  color: string;
  region: string;
  regionKey: "mata" | "caatinga" | "cerrado";
  trait: string;
  rarity: Rarity;
  description: string;
  defaultName: string;
};
const sp = (v: SpeciesDefinition) => v;
export const species = {
  musguito: sp({
    name: "Musguito",
    color: "#88b65b",
    region: "Mata Atlântica",
    regionKey: "mata",
    trait: "Preguiçoso",
    rarity: "common",
    defaultName: "Fubá",
    description:
      "Um pedacinho de musgo que aprendeu a abraçar. Adora uma soneca na sombra.",
  }),
  capinzim: sp({
    name: "Capinzim",
    color: "#edc45e",
    region: "Cerrado",
    regionKey: "cerrado",
    trait: "Brincalhão",
    rarity: "common",
    defaultName: "Pipoca",
    description:
      "Sua franja de capim dança antes mesmo de ele começar a pular.",
  }),
  espinim: sp({
    name: "Espinim",
    color: "#a6ceb0",
    region: "Caatinga",
    regionKey: "caatinga",
    trait: "Tímido",
    rarity: "common",
    defaultName: "Dengo",
    description: "Espinhos de feltro e um coração enorme. Chegue devagar.",
  }),
  pingocu: sp({
    name: "Pingoçu",
    color: "#7db9d6",
    region: "Mata Atlântica",
    regionKey: "mata",
    trait: "Serelepe",
    rarity: "uncommon",
    defaultName: "Pingo",
    description:
      "Uma gotinha de chuva de patas curtas e bochechas corais. Nunca perde uma poça.",
  }),
  bromeluz: sp({
    name: "Bromeluz",
    color: "#e4a6c4",
    region: "Mata Atlântica",
    regionKey: "mata",
    trait: "Carinhoso",
    rarity: "rare",
    defaultName: "Lumi",
    description:
      "Uma coroa de bromélias guarda um brilho macio. Floresce quando recebe carinho.",
  }),
  girassu: sp({
    name: "Girassu",
    color: "#e9bc65",
    region: "Cerrado",
    regionKey: "cerrado",
    trait: "Sociável",
    rarity: "uncommon",
    defaultName: "Sol",
    description:
      "Orelhas de pétala e um rosto redondo de sol. Faz amizade até com a própria sombra.",
  }),
  cerrilume: sp({
    name: "Cerrilume",
    color: "#c98c73",
    region: "Cerrado",
    regionKey: "cerrado",
    trait: "Aventureiro",
    rarity: "rare",
    defaultName: "Faísca",
    description:
      "Um pequeno viajante de terracota, cauda longa e pintinhas de vaga-lume.",
  }),
  xiquinho: sp({
    name: "Xiquinho",
    color: "#82ad96",
    region: "Caatinga",
    regionKey: "caatinga",
    trait: "Teimoso",
    rarity: "uncommon",
    defaultName: "Xico",
    description:
      "Um cacto estrelado de braços macios, flor roxa e ideias muito próprias.",
  }),
  pedruxo: sp({
    name: "Pedruxo",
    color: "#c6a1a0",
    region: "Caatinga",
    regionKey: "caatinga",
    trait: "Solitário",
    rarity: "rare",
    defaultName: "Seixo",
    description:
      "Pedrinhas de areia rosada se juntaram para passear. Gosta de cantinhos tranquilos.",
  }),
};
export type Species = keyof typeof species;
export const starters: Species[] = ["musguito", "capinzim", "espinim"];
export type ItemDefinition = {
  name: string;
  category: string;
  price: number;
  color: string;
  need: Need | null;
  description: string;
  width: number;
  height: number;
  capacity: number;
  effect: number;
  stockMax: number;
  charm: number;
  activity: string;
  extra: Partial<Record<Need, number>>;
};
const item = (
  v: Pick<ItemDefinition, "name" | "category" | "price" | "description"> &
    Partial<ItemDefinition>,
): ItemDefinition => ({
  color: "#a5bb86",
  need: null,
  width: 1,
  height: 1,
  capacity: 1,
  effect: 25,
  stockMax: 0,
  charm: 0,
  activity: "Observando",
  extra: {},
  ...v,
});
export const items = {
  food: item({
    name: "Comedouro",
    category: "Alimentação",
    price: 80,
    color: "#e99077",
    need: "satiety",
    stockMax: 12,
    activity: "Comendo",
    description: "Um lanchinho sempre por perto.",
  }),
  water: item({
    name: "Bebedouro",
    category: "Água",
    price: 70,
    color: "#79c9d2",
    need: "hydration",
    activity: "Bebendo",
    description: "Água fresquinha, de graça.",
  }),
  bed: item({
    name: "Cama de palha",
    category: "Descanso",
    price: 100,
    color: "#dfbc72",
    need: "energy",
    activity: "Dormindo",
    description: "Um ninho macio para sonhar.",
  }),
  toy: item({
    name: "Bolinha de corda",
    category: "Lazer",
    price: 90,
    color: "#b3a0d4",
    need: "fun",
    activity: "Brincando",
    description: "Uma bolinha, mil possibilidades.",
  }),
  doublefood: item({
    name: "Comedouro duplo",
    category: "Alimentação",
    price: 220,
    width: 2,
    capacity: 2,
    stockMax: 24,
    need: "satiety",
    activity: "Comendo",
    description: "Dois lugares à mesa, sem esperar a vez.",
  }),
  fruit: item({
    name: "Mesa de frutas",
    category: "Alimentação",
    price: 350,
    width: 2,
    height: 2,
    capacity: 3,
    stockMax: 36,
    need: "satiety",
    activity: "Comendo",
    extra: { social: 5 },
    description: "Frutinhas para compartilhar um encontro.",
  }),
  fountain: item({
    name: "Fonte de pedra",
    category: "Água",
    price: 240,
    width: 2,
    height: 2,
    capacity: 2,
    need: "hydration",
    activity: "Bebendo",
    extra: { comfort: 8 },
    charm: 6,
    description: "Água de graça e um barulhinho de paz.",
  }),
  cushion: item({
    name: "Almofadona",
    category: "Descanso",
    price: 220,
    width: 2,
    height: 2,
    capacity: 2,
    need: "energy",
    activity: "Dormindo",
    extra: { comfort: 10 },
    description: "Uma almofada grande, dois sonhos fofinhos.",
  }),
  house: item({
    name: "Casinha de madeira",
    category: "Descanso",
    price: 650,
    width: 3,
    height: 3,
    capacity: 3,
    need: "energy",
    activity: "Dormindo",
    extra: { comfort: 15 },
    charm: 8,
    description: "Abrigo de madeira para três pequenos amigos.",
  }),
  tunnel: item({
    name: "Túnel fofinho",
    category: "Lazer",
    price: 260,
    width: 3,
    capacity: 2,
    need: "fun",
    activity: "Brincando",
    extra: { social: 4 },
    description: "Entrar, espiar e sair do outro lado.",
  }),
  bench: item({
    name: "Banco do encontro",
    category: "Social",
    price: 240,
    width: 2,
    capacity: 2,
    need: "social",
    activity: "Socializando",
    extra: { comfort: 8 },
    description: "Um convite para sentar juntinho.",
  }),
  bath: item({
    name: "Banheira rasa",
    category: "Higiene",
    price: 240,
    width: 2,
    height: 2,
    need: "hygiene",
    activity: "Tomando banho",
    extra: { fun: 5 },
    description: "Bolhinhas e um banho bem tranquilo.",
  }),
  clinic: item({
    name: "Postinho de cuidado",
    category: "Saúde",
    price: 850,
    width: 3,
    height: 2,
    need: "health",
    effect: 10,
    activity: "Recebendo cuidados",
    description: "Descanso e cuidados extras para recuperar a saúde.",
  }),
  flowers: item({
    name: "Canteiro de flores",
    category: "Decoração",
    price: 60,
    width: 2,
    capacity: 0,
    charm: 8,
    description: "Um pedacinho de cor, com oito pontos de charme.",
  }),
  tree: item({
    name: "Árvore redonda",
    category: "Decoração",
    price: 180,
    width: 2,
    height: 2,
    capacity: 0,
    charm: 15,
    description: "Sombra para quem descansa por perto.",
  }),
  lantern: item({
    name: "Luminária-vagalume",
    category: "Decoração",
    price: 150,
    capacity: 0,
    charm: 5,
    description: "Uma luzinha de boas-vindas para o refúgio.",
  }),
};
export type ItemKey = keyof typeof items;
export const kitKeys: ItemKey[] = ["food", "water", "bed", "toy"];
export const regions = {
  mata: {
    name: "Mata Atlântica",
    price: 90,
    seconds: 480,
    level: 1,
    active: true,
    color: "#739b77",
    description: "Bromélias, musgo macio e riachos escondidos.",
  },
  caatinga: {
    name: "Caatinga",
    price: 90,
    seconds: 480,
    level: 1,
    active: true,
    color: "#ba9a7c",
    description: "Flores inesperadas entre cactos e pedras rosadas.",
  },
  cerrado: {
    name: "Cerrado",
    price: 160,
    seconds: 900,
    level: 2,
    active: true,
    color: "#bcaa68",
    description: "Capins dourados e árvores que abraçam o céu.",
  },
  litoral: {
    name: "Litoral",
    price: 160,
    seconds: 900,
    level: 2,
    active: false,
    color: "#7fbbbd",
    description: "Conchas e ondas: um caminho para uma próxima etapa.",
  },
  pantanal: {
    name: "Pantanal",
    price: 240,
    seconds: 1200,
    level: 3,
    active: false,
    color: "#7aa6a2",
    description: "Águas tranquilas e jardins que flutuam.",
  },
  sertao: {
    name: "Sertão",
    price: 240,
    seconds: 1200,
    level: 3,
    active: false,
    color: "#ba9674",
    description: "Um horizonte grande, cheio de pequenas histórias.",
  },
  amazonia: {
    name: "Amazônia",
    price: 400,
    seconds: 1800,
    level: 4,
    active: false,
    color: "#6b9a82",
    description: "Folhas gigantes e caminhos luminosos.",
  },
} as const;
export type RegionKey = keyof typeof regions;
export const expeditionChances = {
  common: 55 + 5 + 1,
  uncommon: 25,
  rare: 10,
  resources: 4,
} as const;
export const decay: Record<Need, number> = {
  health: 0,
  satiety: 6,
  hydration: 8,
  energy: 5,
  hygiene: 2,
  social: 2,
  fun: 3,
  comfort: 0,
};
