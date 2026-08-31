"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useNodesState, type Edge, type Node } from "@xyflow/react";
import { CalendarDays, Download, HeartHandshake, Mail, MapPin, Pencil, Plus, Upload, UserPlus, UsersRound, X } from "lucide-react";
import { createFamilyPersonAction, importBassolsFamilySeedAction, importGedcomAction, updateFamilyPersonAction } from "@/modules/family-tree/application/family-actions";
import { relationToSubject, resolveParentSlots, type FamilyPerson, type FamilyRelationship } from "@/modules/family-tree/domain/family-graph";
import { buildFamilyPositions, FAMILY_LAYOUT, filterParentEdgesForDisplay, listPartnerLinks, mergeSavedLayoutPositions, orientPartnerEdge } from "@/modules/family-tree/domain/family-layout";
import { FamilyTreeCanvas } from "@/modules/family-tree/presentation/components/family-tree-canvas";

type Props = { locale: "es" | "en"; people: FamilyPerson[]; relationships: FamilyRelationship[]; readOnly?: boolean; embedded?: boolean; youPersonId?: string };

export function FamilyTreePage({ locale, people, relationships, readOnly, embedded, youPersonId }: Props) {
  const router = useRouter();
  const [personOpen, setPersonOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<FamilyPerson>();
  const gedcomRef = useRef<HTMLDetailsElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [asMe, setAsMe] = useState(false);
  const subject = people.find((person) => person.isSubject);
  const t = locale === "es" ? { eyebrow: "Herramienta complementaria", title: "Mi familia", intro: "Construye tu árbol familiar a tu ritmo. Empieza por ti y asigna madre y padre en los datos de cada persona.", person: "Añadir persona", edit: "Editar datos", details: "Datos de la persona", close: "Cerrar", name: "Nombre completo", birth: "Nacimiento", death: "Fallecimiento", country: "País de nacimiento", city: "Ciudad de nacimiento", gender: "Género", genderUnknown: "No indicado", genderMale: "Hombre", genderFemale: "Mujer", baptized: "Bautismo", baptizedUnknown: "No indicado", baptizedYes: "Bautizado/a", baptizedNo: "No bautizado/a", notes: "Notas", email: "Email", share: "Puede leer mi cronograma", shareHelp: "Si se registra con este email, verá tu historia en solo lectura porque forma parte de tu árbol.", shared: "Lee tu cronograma", me: "Esta persona soy yo", save: "Guardar persona", update: "Guardar cambios", mother: "Madre", father: "Padre", parents: "Progenitores", parentNone: "Sin asignar", empty: "Empieza contigo", emptyBody: "Añádete como persona principal y después conecta el resto de tu historia familiar.", example: "Así podría verse tu árbol familiar", mapHelp: "Disposición piramidal: ancestros arriba, descendientes abajo. Cada fila se ordena por fecha de nacimiento (izquierda = antes). Solo la madre se une a los hijos; entre progenitores, una línea horizontal con icono de pareja.", import: "Importar GEDCOM", export: "Exportar GEDCOM", loadSeed: "Cargar árbol Bassols-López", loadSeedConfirm: "Esto sustituirá tu árbol familiar actual por el de la plantilla. ¿Continuar?", file: "Archivo GEDCOM" } : { eyebrow: "Companion tool", title: "My family", intro: "Build your family tree at your own pace. Start with yourself and assign mother and father in each person's details.", person: "Add person", edit: "Edit details", details: "Person details", close: "Close", name: "Full name", birth: "Birth", death: "Death", country: "Country of birth", city: "City of birth", gender: "Gender", genderUnknown: "Not specified", genderMale: "Male", genderFemale: "Female", baptized: "Baptism", baptizedUnknown: "Not specified", baptizedYes: "Baptized", baptizedNo: "Not baptized", notes: "Notes", email: "Email", share: "Can read my timeline", shareHelp: "If they register with this email, they will see your story in read-only view because they are part of your tree.", shared: "Reads your timeline", me: "This person is me", save: "Save person", update: "Save changes", mother: "Mother", father: "Father", parents: "Parents", parentNone: "Not assigned", empty: "Start with yourself", emptyBody: "Add yourself as the main person and then connect the rest of your family story.", example: "This is how your family tree could look", mapHelp: "Pyramid layout: ancestors on top, descendants below. Each row is sorted by birth date (left = earlier). Only the mother links to children; co-parents are joined by a horizontal line with a partner icon.", import: "Import GEDCOM", export: "Export GEDCOM", loadSeed: "Load Bassols-López tree", loadSeedConfirm: "This will replace your current family tree with the template. Continue?", file: "GEDCOM file" };
  const parentSlots = useMemo(
    () => (selectedPerson ? resolveParentSlots(selectedPerson.id, relationships, people) : { motherId: null, fatherId: null }),
    [selectedPerson, relationships, people],
  );
  const parentCandidates = useMemo(
    () => people.filter((person) => person.id !== (personOpen && selectedPerson ? selectedPerson.id : undefined)),
    [people, personOpen, selectedPerson],
  );
  const selectedParents = useMemo(() => {
    if (!selectedPerson) return { mother: undefined, father: undefined };
    const slots = resolveParentSlots(selectedPerson.id, relationships, people);
    return {
      mother: people.find((person) => person.id === slots.motherId),
      father: people.find((person) => person.id === slots.fatherId),
    };
  }, [selectedPerson, relationships, people]);

  const graph = useMemo(() => buildGraph(people, relationships, subject?.id, locale, youPersonId, Boolean(readOnly)), [people, relationships, subject?.id, locale, youPersonId, readOnly]);
  useEffect(() => {
    if (!personOpen) return;
    setAsMe(Boolean(selectedPerson?.isSubject ?? !subject));
  }, [personOpen, selectedPerson, subject]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const manualNodeIds = useRef(new Set<string>());
  const savedNodeIds = useMemo(
    () => new Set(people.filter((person) => person.layoutX != null && person.layoutY != null).map((person) => person.id)),
    [people],
  );
  useEffect(() => {
    setNodes((current) => {
      const currentById = new Map(current.map((node) => [node.id, node]));
      return graph.nodes.map((graphNode) => {
        const existing = currentById.get(graphNode.id);
        const keepManualPosition = existing && (savedNodeIds.has(graphNode.id) || manualNodeIds.current.has(graphNode.id));
        return keepManualPosition ? { ...graphNode, position: existing.position } : graphNode;
      });
    });
  }, [graph.nodes, savedNodeIds, setNodes]);
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

  return <div className="fade-in">{!embedded && <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">{t.eyebrow}</p><h1 className="display mt-2 text-4xl sm:text-5xl">{t.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{t.intro}</p></div>{!readOnly && <div className="flex flex-wrap items-center gap-2"><details ref={gedcomRef} className="relative"><summary aria-label="GEDCOM" className="btn btn-secondary !h-[50px] !px-3 marker:hidden" title="GEDCOM"><Download size={16} /><span className="hidden sm:inline">GEDCOM</span></summary><div className="absolute right-0 top-14 z-30 grid min-w-64 gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-3 shadow-xl"><form action={submitGedcom} onChange={(event) => { const input = event.target; if (input instanceof HTMLInputElement && input.files?.length) event.currentTarget.requestSubmit(); }}><label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--moss)]/50 px-4 py-3 text-center text-xs font-bold text-[var(--moss-deep)] transition hover:bg-[#edf3eb]"><Upload size={18} /><span>{t.import}</span><span className="text-[10px] font-medium text-[var(--muted)]">{locale === "es" ? "Arrastra o elige un archivo .GED" : "Drop or choose a .GED file"}</span><input className="sr-only" type="file" name="gedcom" accept=".ged,.gedcom,text/plain" required /></label></form><a className="btn btn-quiet justify-start" href={`/${locale}/api/family/gedcom`}><Download size={16} />{t.export}</a><button type="button" className="btn btn-quiet justify-start" onClick={loadSeed} disabled={pending}>{t.loadSeed}</button></div></details><button className="btn btn-primary" onClick={() => { setSelectedPerson(undefined); setPersonOpen(true); }}><UserPlus size={16} />{t.person}</button></div>}</div>}
    {personOpen && !readOnly && <section className="card mt-6 p-5"><h2 className="display text-2xl">{selectedPerson ? t.edit : t.person}</h2><form key={selectedPerson?.id ?? "new"} action={submitPerson} className="mt-4 grid gap-4 md:grid-cols-3"><label className="md:col-span-2"><span className="field-label">{t.name}</span><input className="input" name="fullName" required minLength={2} defaultValue={selectedPerson?.fullName ?? ""} /></label><label className="flex items-end gap-2 pb-3 text-sm font-bold"><input type="checkbox" name="isSubject" defaultChecked={selectedPerson?.isSubject ?? !subject} onChange={(event) => setAsMe(event.target.checked)} />{t.me}</label><label><span className="field-label">{t.birth}</span><input type="date" className="input" name="birthDate" defaultValue={selectedPerson?.birthDate ?? ""} /></label><label><span className="field-label">{t.death}</span><input type="date" className="input" name="deathDate" defaultValue={selectedPerson?.deathDate ?? ""} /></label><label><span className="field-label">{t.country}</span><input className="input" name="birthCountry" defaultValue={selectedPerson?.birthCountry ?? ""} /></label><label><span className="field-label">{t.city}</span><input className="input" name="birthCity" defaultValue={selectedPerson?.birthCity ?? ""} /></label><label><span className="field-label">{t.gender}</span><select className="select" name="gender" defaultValue={selectedPerson?.gender ?? ""}><option value="">{t.genderUnknown}</option><option value="male">{t.genderMale}</option><option value="female">{t.genderFemale}</option></select></label><label><span className="field-label">{t.baptized}</span><select className="select" name="baptized" defaultValue={selectedPerson?.baptized === true ? "true" : selectedPerson?.baptized === false ? "false" : ""}><option value="">{t.baptizedUnknown}</option><option value="true">{t.baptizedYes}</option><option value="false">{t.baptizedNo}</option></select></label>{parentCandidates.length > 0 && <><label><span className="field-label">{t.mother}</span><select className="select" name="motherId" defaultValue={parentSlots.motherId ?? ""}><option value="">{t.parentNone}</option>{parentCandidates.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</select></label><label><span className="field-label">{t.father}</span><select className="select" name="fatherId" defaultValue={parentSlots.fatherId ?? ""}><option value="">{t.parentNone}</option>{parentCandidates.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</select></label></>}{parentCandidates.length > 0 && <p className="md:col-span-3 text-xs leading-5 text-[var(--muted)]">{locale === "es" ? "Elige la madre y el padre de esta persona entre las personas ya añadidas al árbol." : "Choose this person's mother and father from people already in the tree."}</p>}<label className="md:col-span-3"><span className="field-label">{t.notes}</span><textarea className="textarea !min-h-20" name="notes" maxLength={300} defaultValue={selectedPerson?.notes ?? ""} /></label>{!asMe && <><label className="md:col-span-2"><span className="field-label">{t.email}</span><input className="input" name="email" type="email" defaultValue={selectedPerson?.email ?? ""} /></label><label className="flex items-end gap-2 pb-3 text-sm font-bold"><input type="checkbox" name="canReadTimeline" defaultChecked={Boolean(selectedPerson?.canReadTimeline)} />{t.share}</label><p className="md:col-span-3 text-xs leading-5 text-[var(--muted)]">{t.shareHelp}</p></>}<div className="flex items-end"><button disabled={pending} className="btn btn-primary w-full" type="submit"><Plus size={16} />{selectedPerson ? t.update : t.save}</button></div></form></section>}
    {error && <p className="field-error mt-3">{error}</p>}
    {people.length === 0 ? <section className="card mt-8 p-8 sm:p-12"><div className="text-center"><UsersRound className="mx-auto text-[var(--moss)]" size={28} /><h2 className="display mt-4 text-3xl">{t.empty}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">{t.emptyBody}</p>{!readOnly && <button onClick={() => setPersonOpen(true)} className="btn btn-primary mt-6">{t.person}</button>}</div><div className="mt-8"><p className="text-center text-xs font-bold uppercase tracking-[.08em] text-[var(--muted)]">{t.example}</p><div className="placeholder-preview family-ghost-canvas mt-4" aria-hidden="true"><div className="family-ghost-line" style={{ left: "50%", top: "38%", width: 1, height: 52 }} /><div className="family-ghost-line" style={{ left: "28%", top: "22%", width: "44%", height: 1 }} /><div className="family-ghost-partner-icon" style={{ left: "50%", top: "22%" }}><HeartHandshake size={14} /></div><div className="family-ghost-node" style={{ left: "calc(50% - 3.75rem)", top: "12%" }}><strong>{locale === "es" ? "María" : "Mary"}</strong><span>{locale === "es" ? "Madre" : "Mother"}</span></div><div className="family-ghost-node" style={{ left: "calc(50% - 3.75rem)", top: "58%" }}><strong>{locale === "es" ? "Tú" : "You"}</strong><span>{locale === "es" ? "Persona principal" : "Main person"}</span></div><div className="family-ghost-node" style={{ left: "calc(72% - 3.75rem)", top: "12%" }}><strong>{locale === "es" ? "Luis" : "Louis"}</strong><span>{locale === "es" ? "Padre" : "Father"}</span></div><span className="placeholder-badge absolute right-4 top-4">{locale === "es" ? "Ejemplo" : "Example"}</span></div></div></section> : <section className="card mt-8 w-full overflow-hidden"><div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-3"><p className="text-xs font-semibold text-[var(--muted)]">{t.mapHelp}</p><span className="pill">{people.length} {locale === "es" ? "personas" : "people"}</span></div><div className="relative h-[clamp(400px,58vh,620px)] w-full"><FamilyTreeCanvas readOnly={readOnly} nodes={nodes} edges={graph.edges} subjectId={subject?.id} onNodesChange={onNodesChange} onNodeDragStop={(nodeId) => { manualNodeIds.current.add(nodeId); }} onPaneClick={() => setSelectedPerson(undefined)} onNodeClick={(node) => { const person = people.find((item) => item.id === node.id); if (person) { setSelectedPerson(person); setPersonOpen(false); } }} />{selectedPerson && !personOpen && <aside className="absolute right-4 top-4 z-10 w-[min(300px,calc(100%-2rem))] rounded-2xl border border-[var(--moss)]/30 bg-[var(--paper)]/95 p-4 shadow-2xl backdrop-blur"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{youPersonId && selectedPerson.id === youPersonId ? (locale === "es" ? "Tú en este árbol" : "You in this tree") : selectedPerson.isSubject ? (youPersonId ? (locale === "es" ? "Protagonista" : "Storyteller") : (locale === "es" ? "Tu persona" : "You")) : t.details}</p><h2 className="display mt-1 text-xl">{selectedPerson.fullName}</h2></div><button aria-label={t.close} className="btn btn-quiet !p-1" onClick={() => setSelectedPerson(undefined)}><X size={16} /></button></div><dl className="mt-4 grid gap-2 text-xs"><div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{t.birth}</dt><dd>{selectedPerson.birthDate ?? "—"}</dd></div><div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{t.death}</dt><dd>{selectedPerson.deathDate ?? "—"}</dd></div><div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{t.city}</dt><dd className="text-right">{selectedPerson.birthCity ?? "—"}</dd></div><div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{t.country}</dt><dd className="text-right">{selectedPerson.birthCountry ?? "—"}</dd></div>{(selectedParents.mother || selectedParents.father) && <div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{t.parents}</dt><dd className="text-right">{[selectedParents.mother?.fullName, selectedParents.father?.fullName].filter(Boolean).join(" · ") || "—"}</dd></div>}{selectedPerson.baptized !== null && <div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{t.baptized}</dt><dd className="text-right">{selectedPerson.baptized ? t.baptizedYes : t.baptizedNo}</dd></div>}{selectedPerson.notes && <div><dt className="font-bold text-[var(--muted)]">{t.notes}</dt><dd className="mt-1 text-[var(--ink)]">{selectedPerson.notes}</dd></div>}{!readOnly && selectedPerson.email && <div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{t.email}</dt><dd className="text-right">{selectedPerson.email}</dd></div>}{!readOnly && selectedPerson.canReadTimeline && <div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{t.share}</dt><dd className="text-right">{t.shared}</dd></div>}</dl>{!readOnly && <button className="btn btn-primary mt-4 w-full" onClick={() => setPersonOpen(true)}><Pencil size={15} />{t.edit}</button>}</aside>}</div></section>}
  </div>;
}

function buildGraph(people: FamilyPerson[], relationships: FamilyRelationship[], subjectId: string | undefined, locale: "es" | "en", youPersonId?: string, hideContact?: boolean) {
  const { positions: autoPositions } = buildFamilyPositions(people, relationships, subjectId);
  const positions = mergeSavedLayoutPositions(autoPositions, people);
  const nodes: Node[] = people.map((person) => {
    const position = positions.get(person.id) ?? { x: 0, y: FAMILY_LAYOUT.paddingY };
    const isYou = youPersonId ? person.id === youPersonId : person.isSubject;
    return {
      id: person.id,
      type: "familyPerson",
      position: { x: position.x, y: position.y },
      style: {
        width: FAMILY_LAYOUT.nodeWidth,
        ...(isYou ? { border: "2px solid #3d654c", background: "#eef5ec", boxShadow: "0 0 0 4px #dbe8d8, 0 12px 24px #244a3630" } : {}),
      },
      data: {
        label: <FamilyNode person={person} label={relationToSubject(person.id, subjectId, relationships, people, locale)} locale={locale} isYou={isYou} sharedView={Boolean(youPersonId)} hideContact={hideContact} />,
      },
    };
  });

  const parentEdges: Edge[] = filterParentEdgesForDisplay(relationships, people).map((relationship) => ({
    id: relationship.id,
    source: relationship.sourcePersonId,
    target: relationship.targetPersonId,
    sourceHandle: "bottom",
    targetHandle: "top",
    style: { stroke: "#7fa87f", strokeWidth: 1.5 },
  }));

  const partnerEdges: Edge[] = listPartnerLinks(relationships).map((link) => {
    const oriented = orientPartnerEdge(link.source, link.target, positions);
    return {
      id: link.id,
      type: "familyPartner",
      source: oriented.source,
      target: oriented.target,
      sourceHandle: oriented.sourceHandle,
      targetHandle: oriented.targetHandle,
      data: { kind: link.kind },
    };
  });

  const siblingEdges: Edge[] = relationships
    .filter((relationship) => relationship.relationshipType === "sibling")
    .map((relationship) => ({
      id: relationship.id,
      source: relationship.sourcePersonId,
      target: relationship.targetPersonId,
      label: "↔",
      style: { stroke: "#c89f78", strokeWidth: 1.5, strokeDasharray: "5 4" },
      labelStyle: { fill: "#6b746d", fontSize: 12 },
    }));

  return { nodes, edges: [...parentEdges, ...partnerEdges, ...siblingEdges] };
}

function baptizedLabel(person: FamilyPerson, locale: "es" | "en") {
  if (person.baptized === true) return locale === "es" ? "Bautizado/a" : "Baptized";
  if (person.baptized === false) return locale === "es" ? "No bautizado/a" : "Not baptized";
  return null;
}

function FamilyNode({ person, label, locale, isYou, sharedView, hideContact }: { person: FamilyPerson; label: string; locale: "es" | "en"; isYou: boolean; sharedView?: boolean; hideContact?: boolean }) {
  const hasDates = person.birthDate || person.deathDate;
  const baptism = baptizedLabel(person, locale);
  const relationStyle = isYou ? "bg-[var(--moss-deep)] text-white" : "bg-[#f4eee5] text-[#765b43]";
  const youBadge = sharedView ? (locale === "es" ? "ERES TÚ" : "YOU") : (locale === "es" ? "TÚ" : "YOU");
  const badge = isYou ? youBadge : person.isSubject && sharedView ? (locale === "es" ? "Protagonista" : "Storyteller") : label;
  return <div className="min-w-52 max-w-56 space-y-2 p-1 text-center">
    <strong className="block truncate text-center text-base font-extrabold leading-tight tracking-normal text-[var(--ink)]" title={person.fullName}>{person.fullName}</strong>
    {(isYou || person.isSubject || label) && <span className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${relationStyle}`}>{badge}</span>}
    {baptism && <span className="block text-[10px] font-semibold text-[#8a5a3d]">{baptism}</span>}
    {hasDates && <span className="flex w-full items-center justify-center gap-1.5 text-center text-[10px] font-semibold tabular-nums text-[var(--muted)]"><CalendarDays size={13} className="shrink-0 text-[var(--moss)]" />{formatNodeDate(person.birthDate)} <span className="text-[#b7a99a]">/</span> {formatNodeDate(person.deathDate)}</span>}
    {(person.birthCity || person.birthCountry) && <span className="flex w-full items-center justify-center gap-1.5 truncate text-center text-[10px] font-medium text-[var(--muted)]"><MapPin size={13} className="shrink-0 text-[#b7835f]" />{person.birthCity}{person.birthCity && person.birthCountry ? ", " : ""}{person.birthCountry}</span>}
    {person.notes && <span className="block px-1 text-[10px] leading-4 text-[var(--muted)]">{person.notes}</span>}
    {!hideContact && (person.email || person.canReadTimeline) && (
      <span className="flex w-full items-center justify-center gap-1.5 truncate text-[10px] font-semibold text-[var(--moss-deep)]">
        <Mail size={12} className="shrink-0" />
        {person.canReadTimeline ? (locale === "es" ? "Lee el cronograma" : "Reads the timeline") : person.email}
      </span>
    )}
  </div>;
}

function formatNodeDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}
