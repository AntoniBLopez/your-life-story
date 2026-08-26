"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Background, Controls, MiniMap, ReactFlow, useNodesState, type Edge, type Node } from "@xyflow/react";
import { CalendarDays, Download, HeartHandshake, MapPin, Pencil, Plus, Upload, UserPlus, UsersRound, X } from "lucide-react";
import { createFamilyPersonAction, createFamilyRelationshipAction, importBassolsFamilySeedAction, importGedcomAction, updateFamilyPersonAction } from "@/modules/family-tree/application/family-actions";
import { relationToSubject, type FamilyPerson, type FamilyRelationship } from "@/modules/family-tree/domain/family-graph";
import { buildFamilyPositions, FAMILY_LAYOUT, listImpliedCoParentEdges } from "@/modules/family-tree/domain/family-layout";

type Props = { locale: "es" | "en"; people: FamilyPerson[]; relationships: FamilyRelationship[] };

export function FamilyTreePage({ locale, people, relationships }: Props) {
  const router = useRouter();
  const [personOpen, setPersonOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<FamilyPerson>();
  const [relationshipOpen, setRelationshipOpen] = useState(false);
  const gedcomRef = useRef<HTMLDetailsElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const subject = people.find((person) => person.isSubject);
  const t = locale === "es" ? { eyebrow: "Herramienta complementaria", title: "Mi familia", intro: "Construye tu árbol familiar a tu ritmo. Empieza por ti y conecta a las personas que importan.", person: "Añadir persona", edit: "Editar datos", details: "Datos de la persona", close: "Cerrar", link: "Crear vínculo", name: "Nombre completo", birth: "Nacimiento", death: "Fallecimiento", country: "País de nacimiento", city: "Ciudad de nacimiento", gender: "Género", genderUnknown: "No indicado", genderMale: "Hombre", genderFemale: "Mujer", baptized: "Bautismo", baptizedUnknown: "No indicado", baptizedYes: "Bautizado/a", baptizedNo: "No bautizado/a", notes: "Notas", me: "Esta persona soy yo", save: "Guardar persona", update: "Guardar cambios", origin: "Origen", target: "Destino", type: "Relación", parent: "es progenitor de", partner: "es pareja de", sibling: "es hermano/a de", empty: "Empieza contigo", emptyBody: "Añádete como persona principal y después conecta el resto de tu historia familiar.", example: "Así podría verse tu árbol familiar", mapHelp: "Cada fila se ordena por fecha de nacimiento (izquierda = antes). Los corazones discontinuos unen progenitores del mismo hijo.", relation: "Relación", linked: "Vínculo creado", import: "Importar GEDCOM", export: "Exportar GEDCOM", loadSeed: "Cargar árbol Bassols-López", loadSeedConfirm: "Esto sustituirá tu árbol familiar actual por el de la plantilla. ¿Continuar?", file: "Archivo GEDCOM" } : { eyebrow: "Companion tool", title: "My family", intro: "Build your family tree at your own pace. Start with yourself and connect the people who matter.", person: "Add person", edit: "Edit details", details: "Person details", close: "Close", link: "Create relationship", name: "Full name", birth: "Birth", death: "Death", country: "Country of birth", city: "City of birth", gender: "Gender", genderUnknown: "Not specified", genderMale: "Male", genderFemale: "Female", baptized: "Baptism", baptizedUnknown: "Not specified", baptizedYes: "Baptized", baptizedNo: "Not baptized", notes: "Notes", me: "This person is me", save: "Save person", update: "Save changes", origin: "From", target: "To", type: "Relationship", parent: "is parent of", partner: "is partner of", sibling: "is sibling of", empty: "Start with yourself", emptyBody: "Add yourself as the main person and then connect the rest of your family story.", example: "This is how your family tree could look", mapHelp: "Each row is sorted by birth date (left = earlier). Dashed hearts connect co-parents of the same child.", relation: "Relationship", linked: "Relationship created", import: "Import GEDCOM", export: "Export GEDCOM", loadSeed: "Load Bassols-López tree", loadSeedConfirm: "This will replace your current family tree with the template. Continue?", file: "GEDCOM file" };

  const graph = useMemo(() => buildGraph(people, relationships, subject?.id, locale), [people, relationships, subject?.id, locale]);
  const [nodes, , onNodesChange] = useNodesState(graph.nodes);
  useEffect(() => {
    onNodesChange(graph.nodes.map((node) => ({ type: "position", id: node.id, position: node.position })));
  }, [graph.nodes, onNodesChange]);
  useEffect(() => {
    function closeGedcom(event: PointerEvent) {
      const details = gedcomRef.current;
      if (!details?.open || !(event.target instanceof Node) || details.contains(event.target)) return;
      details.open = false;
    }
    document.addEventListener("pointerdown", closeGedcom);
    return () => document.removeEventListener("pointerdown", closeGedcom);
  }, []);

  function submitPerson(formData: FormData) { setError(undefined); formData.set("locale", locale); if (selectedPerson) formData.set("personId", selectedPerson.id); startTransition(async () => { const result = selectedPerson ? await updateFamilyPersonAction(formData) : await createFamilyPersonAction(formData); if (!result.ok) setError(result.error); else { setPersonOpen(false); setSelectedPerson(undefined); router.refresh(); } }); }
  function submitRelationship(formData: FormData) { setError(undefined); formData.set("locale", locale); startTransition(async () => { const result = await createFamilyRelationshipAction(formData); if (!result.ok) setError(result.error); else { setRelationshipOpen(false); router.refresh(); } }); }
  function submitGedcom(formData: FormData) { setError(undefined); formData.set("locale", locale); startTransition(async () => { const result = await importGedcomAction(formData); if (!result.ok) setError(result.error); else router.refresh(); }); }
  function loadSeed() {
    if (!window.confirm(t.loadSeedConfirm)) return;
    setError(undefined);
    startTransition(async () => {
      const result = await importBassolsFamilySeedAction(locale);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return <div className="fade-in"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">{t.eyebrow}</p><h1 className="display mt-2 text-4xl sm:text-5xl">{t.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{t.intro}</p></div><div className="flex flex-wrap items-center gap-2"><details ref={gedcomRef} className="relative"><summary aria-label="GEDCOM" className="btn btn-secondary !h-[50px] !px-3 marker:hidden" title="GEDCOM"><Download size={16} /><span className="hidden sm:inline">GEDCOM</span></summary><div className="absolute right-0 top-14 z-30 grid min-w-64 gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-3 shadow-xl"><form action={submitGedcom} onChange={(event) => { const input = event.target; if (input instanceof HTMLInputElement && input.files?.length) event.currentTarget.requestSubmit(); }}><label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--moss)]/50 px-4 py-3 text-center text-xs font-bold text-[var(--moss-deep)] transition hover:bg-[#edf3eb]"><Upload size={18} /><span>{t.import}</span><span className="text-[10px] font-medium text-[var(--muted)]">{locale === "es" ? "Arrastra o elige un archivo .GED" : "Drop or choose a .GED file"}</span><input className="sr-only" type="file" name="gedcom" accept=".ged,.gedcom,text/plain" required /></label></form><a className="btn btn-quiet justify-start" href={`/${locale}/api/family/gedcom`}><Download size={16} />{t.export}</a><button type="button" className="btn btn-quiet justify-start" onClick={loadSeed} disabled={pending}>{t.loadSeed}</button></div></details><button className="btn btn-secondary" onClick={() => setRelationshipOpen(!relationshipOpen)} disabled={people.length < 2} title={people.length < 2 ? (locale === "es" ? "Añade al menos dos personas para crear un vínculo" : "Add at least two people to create a relationship") : undefined}><HeartHandshake size={16} />{t.link}</button><button className="btn btn-primary" onClick={() => setPersonOpen(!personOpen)}><UserPlus size={16} />{t.person}</button></div></div>
    {personOpen && <section className="card mt-6 p-5"><h2 className="display text-2xl">{selectedPerson ? t.edit : t.person}</h2><form key={selectedPerson?.id ?? "new"} action={submitPerson} className="mt-4 grid gap-4 md:grid-cols-3"><label className="md:col-span-2"><span className="field-label">{t.name}</span><input className="input" name="fullName" required minLength={2} defaultValue={selectedPerson?.fullName ?? ""} /></label><label className="flex items-end gap-2 pb-3 text-sm font-bold"><input type="checkbox" name="isSubject" defaultChecked={selectedPerson?.isSubject ?? !subject} />{t.me}</label><label><span className="field-label">{t.birth}</span><input type="date" className="input" name="birthDate" defaultValue={selectedPerson?.birthDate ?? ""} /></label><label><span className="field-label">{t.death}</span><input type="date" className="input" name="deathDate" defaultValue={selectedPerson?.deathDate ?? ""} /></label><label><span className="field-label">{t.country}</span><input className="input" name="birthCountry" defaultValue={selectedPerson?.birthCountry ?? ""} /></label><label><span className="field-label">{t.city}</span><input className="input" name="birthCity" defaultValue={selectedPerson?.birthCity ?? ""} /></label><label><span className="field-label">{t.gender}</span><select className="select" name="gender" defaultValue={selectedPerson?.gender ?? ""}><option value="">{t.genderUnknown}</option><option value="male">{t.genderMale}</option><option value="female">{t.genderFemale}</option></select></label><label><span className="field-label">{t.baptized}</span><select className="select" name="baptized" defaultValue={selectedPerson?.baptized === true ? "true" : selectedPerson?.baptized === false ? "false" : ""}><option value="">{t.baptizedUnknown}</option><option value="true">{t.baptizedYes}</option><option value="false">{t.baptizedNo}</option></select></label><label className="md:col-span-3"><span className="field-label">{t.notes}</span><textarea className="textarea !min-h-20" name="notes" maxLength={300} defaultValue={selectedPerson?.notes ?? ""} /></label><div className="flex items-end"><button disabled={pending} className="btn btn-primary w-full" type="submit"><Plus size={16} />{selectedPerson ? t.update : t.save}</button></div></form></section>}
    {relationshipOpen && <section className="card mt-6 p-5"><h2 className="display text-2xl">{t.link}</h2><form action={submitRelationship} className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr_auto]"><label><span className="field-label">{t.origin}</span><select className="select" name="sourcePersonId" required defaultValue=""><option value="" disabled>—</option>{people.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</select></label><label><span className="field-label">{t.type}</span><select className="select" name="relationshipType"><option value="parent">{t.parent}</option><option value="partner">{t.partner}</option><option value="sibling">{t.sibling}</option></select></label><label><span className="field-label">{t.target}</span><select className="select" name="targetPersonId" required defaultValue=""><option value="" disabled>—</option>{people.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</select></label><div className="flex items-end"><button disabled={pending} className="btn btn-primary" type="submit">{t.link}</button></div></form></section>}
    {error && <p className="field-error mt-3">{error}</p>}
    {people.length === 0 ? <section className="card mt-8 p-8 sm:p-12"><div className="text-center"><UsersRound className="mx-auto text-[var(--moss)]" size={28} /><h2 className="display mt-4 text-3xl">{t.empty}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">{t.emptyBody}</p><button onClick={() => setPersonOpen(true)} className="btn btn-primary mt-6">{t.person}</button></div><div className="mt-8"><p className="text-center text-xs font-bold uppercase tracking-[.08em] text-[var(--muted)]">{t.example}</p><div className="placeholder-preview family-ghost-canvas mt-4" aria-hidden="true"><div className="family-ghost-line" style={{ left: "50%", top: "38%", width: 1, height: 52 }} /><div className="family-ghost-line" style={{ left: "28%", top: "38%", width: "44%", height: 1 }} /><div className="family-ghost-node" style={{ left: "calc(50% - 3.75rem)", top: "12%" }}><strong>{locale === "es" ? "María" : "Mary"}</strong><span>{locale === "es" ? "Madre" : "Mother"}</span></div><div className="family-ghost-node" style={{ left: "calc(50% - 3.75rem)", top: "58%" }}><strong>{locale === "es" ? "Tú" : "You"}</strong><span>{locale === "es" ? "Persona principal" : "Main person"}</span></div><div className="family-ghost-node" style={{ left: "calc(72% - 3.75rem)", top: "12%" }}><strong>{locale === "es" ? "Luis" : "Louis"}</strong><span>{locale === "es" ? "Padre" : "Father"}</span></div><span className="placeholder-badge absolute right-4 top-4">{locale === "es" ? "Ejemplo" : "Example"}</span></div></div></section> : <section className="card mt-8 w-full overflow-hidden"><div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-3"><p className="text-xs font-semibold text-[var(--muted)]">{t.mapHelp}</p><span className="pill">{people.length} {locale === "es" ? "personas" : "people"}</span></div><div className="relative h-[clamp(400px,58vh,620px)] w-full"><ReactFlow nodes={nodes} edges={graph.edges} onNodesChange={onNodesChange} onPaneClick={() => setSelectedPerson(undefined)} onNodeClick={(_, node) => { const person = people.find((item) => item.id === node.id); if (person) { setSelectedPerson(person); setPersonOpen(false); } }} nodesDraggable nodesConnectable={false} elevateNodesOnSelect fitView fitViewOptions={{ padding: 0.25 }} minZoom={0.2} maxZoom={1.6}><Background gap={18} size={1} color="#dce5db" /><Controls /><MiniMap zoomable pannable /></ReactFlow>{selectedPerson && !personOpen && <aside className="absolute right-4 top-4 z-10 w-[min(300px,calc(100%-2rem))] rounded-2xl border border-[var(--moss)]/30 bg-[var(--paper)]/95 p-4 shadow-2xl backdrop-blur"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{selectedPerson.isSubject ? (locale === "es" ? "Tu persona" : "You") : t.details}</p><h2 className="display mt-1 text-xl">{selectedPerson.fullName}</h2></div><button aria-label={t.close} className="btn btn-quiet !p-1" onClick={() => setSelectedPerson(undefined)}><X size={16} /></button></div><dl className="mt-4 grid gap-2 text-xs"><div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{t.birth}</dt><dd>{selectedPerson.birthDate ?? "—"}</dd></div><div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{t.death}</dt><dd>{selectedPerson.deathDate ?? "—"}</dd></div><div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{t.city}</dt><dd className="text-right">{selectedPerson.birthCity ?? "—"}</dd></div><div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{t.country}</dt><dd className="text-right">{selectedPerson.birthCountry ?? "—"}</dd></div>{selectedPerson.baptized !== null && <div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{t.baptized}</dt><dd className="text-right">{selectedPerson.baptized ? t.baptizedYes : t.baptizedNo}</dd></div>}{selectedPerson.notes && <div><dt className="font-bold text-[var(--muted)]">{t.notes}</dt><dd className="mt-1 text-[var(--ink)]">{selectedPerson.notes}</dd></div>}</dl><button className="btn btn-primary mt-4 w-full" onClick={() => setPersonOpen(true)}><Pencil size={15} />{t.edit}</button></aside>}</div></section>}
  </div>;
}

function buildGraph(people: FamilyPerson[], relationships: FamilyRelationship[], subjectId: string | undefined, locale: "es" | "en") {
  const { positions } = buildFamilyPositions(people, relationships, subjectId);
  const nodes: Node[] = people.map((person) => {
    const position = positions.get(person.id) ?? { x: FAMILY_LAYOUT.paddingX, y: FAMILY_LAYOUT.paddingY };
    return {
      id: person.id,
      position: { x: position.x, y: position.y },
      style: {
        width: FAMILY_LAYOUT.nodeWidth,
        ...(person.isSubject ? { border: "2px solid #3d654c", background: "#eef5ec", boxShadow: "0 0 0 4px #dbe8d8, 0 12px 24px #244a3630" } : {}),
      },
      data: {
        label: <FamilyNode person={person} label={relationToSubject(person.id, subjectId, relationships, people, locale)} locale={locale} />,
      },
    };
  });

  const parentEdges: Edge[] = relationships.map((relationship) => ({
    id: relationship.id,
    source: relationship.sourcePersonId,
    target: relationship.targetPersonId,
    label: relationship.relationshipType === "parent" ? undefined : relationship.relationshipType === "partner" ? "♥" : "↔",
    animated: relationship.relationshipType === "partner",
    style: {
      stroke: relationship.relationshipType === "parent" ? "#7fa87f" : "#c89f78",
      strokeWidth: relationship.relationshipType === "parent" ? 1.5 : 1.5,
      strokeDasharray: relationship.relationshipType === "sibling" ? "5 4" : undefined,
    },
    labelStyle: { fill: "#6b746d", fontSize: 12 },
  }));

  const coParentEdges: Edge[] = listImpliedCoParentEdges(relationships).map((pair, index) => ({
    id: `co-parent-${index}`,
    source: pair.source,
    target: pair.target,
    label: "♥",
    animated: false,
    style: { stroke: "#c89f78", strokeWidth: 1.5, strokeDasharray: "6 4" },
    labelStyle: { fill: "#a96d4d", fontSize: 12 },
  }));

  return { nodes, edges: [...parentEdges, ...coParentEdges] };
}

function baptizedLabel(person: FamilyPerson, locale: "es" | "en") {
  if (person.baptized === true) return locale === "es" ? "Bautizado/a" : "Baptized";
  if (person.baptized === false) return locale === "es" ? "No bautizado/a" : "Not baptized";
  return null;
}

function FamilyNode({ person, label, locale }: { person: FamilyPerson; label: string; locale: "es" | "en" }) {
  const hasDates = person.birthDate || person.deathDate;
  const baptism = baptizedLabel(person, locale);
  const relationStyle = person.isSubject ? "bg-[var(--moss-deep)] text-white" : "bg-[#f4eee5] text-[#765b43]";
  return <div className="min-w-52 max-w-56 space-y-2 p-1 text-center">
    <strong className="block truncate text-center text-base font-extrabold leading-tight tracking-normal text-[var(--ink)]" title={person.fullName}>{person.fullName}</strong>
    {(person.isSubject || label) && <span className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${relationStyle}`}>{person.isSubject ? (locale === "es" ? "TÚ" : "YOU") : label}</span>}
    {baptism && <span className="block text-[10px] font-semibold text-[#8a5a3d]">{baptism}</span>}
    {hasDates && <span className="flex w-full items-center justify-center gap-1.5 text-center text-[10px] font-semibold tabular-nums text-[var(--muted)]"><CalendarDays size={13} className="shrink-0 text-[var(--moss)]" />{formatNodeDate(person.birthDate)} <span className="text-[#b7a99a]">/</span> {formatNodeDate(person.deathDate)}</span>}
    {(person.birthCity || person.birthCountry) && <span className="flex w-full items-center justify-center gap-1.5 truncate text-center text-[10px] font-medium text-[var(--muted)]"><MapPin size={13} className="shrink-0 text-[#b7835f]" />{person.birthCity}{person.birthCity && person.birthCountry ? ", " : ""}{person.birthCountry}</span>}
    {person.notes && <span className="block px-1 text-[10px] leading-4 text-[var(--muted)]">{person.notes}</span>}
  </div>;
}

function formatNodeDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}
