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
  careCooldown: 30,
} as const;
export const species = {
  musguito: {
    name: "Musguito",
    color: "#88b65b",
    region: "Mata Atlântica",
    trait: "Preguiçoso",
    description:
      "Um pedacinho de musgo que aprendeu a abraçar. Adora uma soneca na sombra.",
  },
  capinzim: {
    name: "Capinzim",
    color: "#edc45e",
    region: "Cerrado",
    trait: "Brincalhão",
    description:
      "Sua franja de capim dança antes mesmo de ele começar a pular.",
  },
  espinim: {
    name: "Espinim",
    color: "#a6ceb0",
    region: "Caatinga",
    trait: "Tímido",
    description:
      "Por trás dos espinhos de feltro mora um coração enorme. Chegue devagar.",
  },
} as const;
export type Species = keyof typeof species;
export const items = {
  food: {
    name: "Comedouro",
    category: "Alimentação",
    price: 80,
    color: "#e99077",
    need: "satiety",
    description: "Um lanchinho sempre por perto.",
  },
  water: {
    name: "Bebedouro",
    category: "Água",
    price: 70,
    color: "#79c9d2",
    need: "hydration",
    description: "Água fresquinha, de graça.",
  },
  bed: {
    name: "Cama de palha",
    category: "Descanso",
    price: 100,
    color: "#dfbc72",
    need: "energy",
    description: "Um ninho macio para sonhar.",
  },
  toy: {
    name: "Bolinha de corda",
    category: "Lazer",
    price: 90,
    color: "#b3a0d4",
    need: "fun",
    description: "Uma bolinha, mil possibilidades.",
  },
} as const;
export type ItemKey = keyof typeof items;
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
