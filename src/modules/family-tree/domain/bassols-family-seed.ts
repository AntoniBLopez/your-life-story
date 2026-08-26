import type { FamilyPerson, RelationshipType } from "./family-graph";

type SeedPerson = Omit<FamilyPerson, "id" | "userId"> & { key: string };

type SeedRelationship = {
  sourceKey: string;
  targetKey: string;
  relationshipType: RelationshipType;
};

const catalunya = "Catalunya";
const spain = "España";
const day = "day" as const;

export const BASSOLS_FAMILY_SEED: { people: SeedPerson[]; relationships: SeedRelationship[] } = {
  people: [
    { key: "antoni", fullName: "Antoni B. López", birthDate: "1997-11-01", birthDatePrecision: day, deathDate: null, deathDatePrecision: null, birthCity: "Olot", birthCountry: catalunya, gender: "male", baptized: true, notes: null, isSubject: true },
    { key: "mireya", fullName: "Mireya Bassols López", birthDate: "1996-02-21", birthDatePrecision: day, deathDate: null, deathDatePrecision: null, birthCity: "Olot", birthCountry: catalunya, gender: "female", baptized: true, notes: null, isSubject: false },
    { key: "kevin", fullName: "Kevin Campos Lopez", birthDate: "2003-10-01", birthDatePrecision: day, deathDate: null, deathDatePrecision: null, birthCity: "Palamós", birthCountry: catalunya, gender: "male", baptized: false, notes: null, isSubject: false },
    { key: "rosario", fullName: "Rosario Lopez Lechado", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Loja", birthCountry: spain, gender: "female", baptized: null, notes: "Fuente Vaqueros, Granada", isSubject: false },
    { key: "antoni_padre", fullName: "Antoni Bassols Corcoy", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Olot", birthCountry: catalunya, gender: "male", baptized: null, notes: null, isSubject: false },
    { key: "manuel", fullName: "Manuel Campos Serrano", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: null, birthCountry: spain, gender: "male", baptized: null, notes: null, isSubject: false },
    { key: "francisco", fullName: "Francisco", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Fuente Vaqueros", birthCountry: spain, gender: "male", baptized: null, notes: "Granada", isSubject: false },
    { key: "carmen", fullName: "Carmen", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Fuente Vaqueros", birthCountry: spain, gender: "female", baptized: null, notes: "Granada", isSubject: false },
    { key: "jose", fullName: "Jose", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Fuente Vaqueros", birthCountry: spain, gender: "male", baptized: null, notes: null, isSubject: false },
    { key: "odulia", fullName: "Odulia", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Fuente Vaqueros", birthCountry: spain, gender: "female", baptized: null, notes: null, isSubject: false },
    { key: "fernando", fullName: "Fernando", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Fuente Vaqueros", birthCountry: spain, gender: "male", baptized: null, notes: null, isSubject: false },
    { key: "inocencia", fullName: "Inocencia", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Fuente Vaqueros", birthCountry: spain, gender: "female", baptized: null, notes: null, isSubject: false },
    { key: "restitut", fullName: "Restitut Bassols", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Olot", birthCountry: spain, gender: "male", baptized: null, notes: null, isSubject: false },
    { key: "montserrat", fullName: "Montserrat", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Olot", birthCountry: spain, gender: "female", baptized: null, notes: null, isSubject: false },
    { key: "anton", fullName: "Anton", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Olot", birthCountry: spain, gender: "male", baptized: null, notes: "Corcoll Carrer", isSubject: false },
    { key: "enriqueta", fullName: "Enriqueta", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Olot", birthCountry: spain, gender: "female", baptized: null, notes: "Puig de Mont Plana. Murió con 7 años.", isSubject: false },
    { key: "teresa", fullName: "Teresa Sanchez Carbonell", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Olot", birthCountry: spain, gender: "female", baptized: null, notes: null, isSubject: false },
    { key: "toni_corcoll", fullName: "Toni Corcoll Sanchez", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Olot", birthCountry: spain, gender: "male", baptized: null, notes: null, isSubject: false },
    { key: "dolors", fullName: "Dolors Plana", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Viaña", birthCountry: spain, gender: "female", baptized: null, notes: null, isSubject: false },
    { key: "miquel", fullName: "Miquel", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Viaña", birthCountry: spain, gender: "male", baptized: null, notes: null, isSubject: false },
    { key: "montserrat_inferior", fullName: "Montserrat", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCity: "Olot", birthCountry: spain, gender: "female", baptized: null, notes: "Rama inferior del árbol familiar", isSubject: false },
  ],
  relationships: [
    { sourceKey: "antoni_padre", targetKey: "rosario", relationshipType: "partner" },
    { sourceKey: "manuel", targetKey: "rosario", relationshipType: "partner" },
    { sourceKey: "antoni_padre", targetKey: "antoni", relationshipType: "parent" },
    { sourceKey: "rosario", targetKey: "antoni", relationshipType: "parent" },
    { sourceKey: "antoni_padre", targetKey: "mireya", relationshipType: "parent" },
    { sourceKey: "rosario", targetKey: "mireya", relationshipType: "parent" },
    { sourceKey: "manuel", targetKey: "kevin", relationshipType: "parent" },
    { sourceKey: "rosario", targetKey: "kevin", relationshipType: "parent" },
    { sourceKey: "francisco", targetKey: "carmen", relationshipType: "partner" },
    { sourceKey: "francisco", targetKey: "rosario", relationshipType: "parent" },
    { sourceKey: "carmen", targetKey: "rosario", relationshipType: "parent" },
    { sourceKey: "francisco", targetKey: "jose", relationshipType: "parent" },
    { sourceKey: "carmen", targetKey: "jose", relationshipType: "parent" },
    { sourceKey: "francisco", targetKey: "odulia", relationshipType: "parent" },
    { sourceKey: "carmen", targetKey: "odulia", relationshipType: "parent" },
    { sourceKey: "francisco", targetKey: "fernando", relationshipType: "parent" },
    { sourceKey: "carmen", targetKey: "fernando", relationshipType: "parent" },
    { sourceKey: "francisco", targetKey: "inocencia", relationshipType: "parent" },
    { sourceKey: "carmen", targetKey: "inocencia", relationshipType: "parent" },
    { sourceKey: "restitut", targetKey: "montserrat", relationshipType: "partner" },
    { sourceKey: "restitut", targetKey: "anton", relationshipType: "parent" },
    { sourceKey: "montserrat", targetKey: "anton", relationshipType: "parent" },
    { sourceKey: "restitut", targetKey: "enriqueta", relationshipType: "parent" },
    { sourceKey: "montserrat", targetKey: "enriqueta", relationshipType: "parent" },
    { sourceKey: "anton", targetKey: "teresa", relationshipType: "partner" },
    { sourceKey: "anton", targetKey: "antoni_padre", relationshipType: "parent" },
    { sourceKey: "teresa", targetKey: "antoni_padre", relationshipType: "parent" },
    { sourceKey: "anton", targetKey: "toni_corcoll", relationshipType: "parent" },
    { sourceKey: "teresa", targetKey: "toni_corcoll", relationshipType: "parent" },
    { sourceKey: "dolors", targetKey: "miquel", relationshipType: "partner" },
    { sourceKey: "anton", targetKey: "montserrat_inferior", relationshipType: "partner" },
  ],
};
