import type { FamilyPerson, FamilyRelationship } from "@/modules/family-tree/domain/family-graph";
import type { LifeEntry } from "@/modules/life-story/domain/life-entry";

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

export const demoEntries: LifeEntry[] = [
  { id: "demo-entry-1", userId: DEMO_USER_ID, startDate: "2024-03-12", endDate: null, datePrecision: "day", title: "Un cambio de dirección", narrative: "Decidí hacer espacio para un trabajo más alineado con la vida que quiero construir.", lifeArea: "work", changeDirection: "improved", difficulty: "Dejar atrás lo conocido.", learning: "Pedir ayuda acelera los cambios importantes.", transformation: "Más claridad sobre mis prioridades.", tags: ["trabajo", "decisiones"], createdAt: "2024-03-12T09:00:00.000Z" },
  { id: "demo-entry-2", userId: DEMO_USER_ID, startDate: "2023-08-21", endDate: "2023-09-02", datePrecision: "day", title: "Un verano para volver a mí", narrative: "Unos días tranquilos con la familia me recordaron qué conversaciones quiero cuidar.", lifeArea: "relationships", changeDirection: "mixed", difficulty: "Encontrar tiempo sin prisa.", learning: "La presencia también es una forma de cuidado.", transformation: "Estoy escuchando de otra manera.", tags: ["familia", "cuidado"], createdAt: "2023-09-02T09:00:00.000Z" },
  { id: "demo-entry-3", userId: DEMO_USER_ID, startDate: "2022-01-15", endDate: null, datePrecision: "month", title: "Aprender a pedir ayuda", narrative: "Empecé a reconocer que sostenerlo todo a solas no era una señal de fortaleza.", lifeArea: "identity", changeDirection: "improved", difficulty: null, learning: "La vulnerabilidad puede abrir una conversación honesta.", transformation: "Más paciencia conmigo.", tags: ["aprendizaje", "bienestar"], createdAt: "2022-01-15T09:00:00.000Z" },
];

export const demoPeople: FamilyPerson[] = [
  { id: "demo-person-1", userId: DEMO_USER_ID, fullName: "Tú", birthDate: "1990-04-18", birthDatePrecision: "day", deathDate: null, deathDatePrecision: null, birthCountry: "España", birthCity: "Madrid", isSubject: true },
  { id: "demo-person-2", userId: DEMO_USER_ID, fullName: "María García", birthDate: "1962-11-06", birthDatePrecision: "day", deathDate: null, deathDatePrecision: null, birthCountry: "España", birthCity: "Toledo", isSubject: false },
  { id: "demo-person-3", userId: DEMO_USER_ID, fullName: "Luis García", birthDate: "1960-07-22", birthDatePrecision: "day", deathDate: null, deathDatePrecision: null, birthCountry: "España", birthCity: "Madrid", isSubject: false },
  { id: "demo-person-4", userId: DEMO_USER_ID, fullName: "Clara García", birthDate: "2018-02-14", birthDatePrecision: "day", deathDate: null, deathDatePrecision: null, birthCountry: "España", birthCity: "Madrid", isSubject: false },
];

export const demoRelationships: FamilyRelationship[] = [
  { id: "demo-relation-1", userId: DEMO_USER_ID, sourcePersonId: "demo-person-2", targetPersonId: "demo-person-1", relationshipType: "parent" },
  { id: "demo-relation-2", userId: DEMO_USER_ID, sourcePersonId: "demo-person-3", targetPersonId: "demo-person-1", relationshipType: "parent" },
  { id: "demo-relation-3", userId: DEMO_USER_ID, sourcePersonId: "demo-person-1", targetPersonId: "demo-person-4", relationshipType: "parent" },
];