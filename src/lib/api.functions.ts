import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CAN_CREATE, average, isValidScore, tempPassword, type Role } from "./rules";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function admin(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type Ctx = { supabase: any; userId: string };

async function caller(ctx: Ctx) {
  const { data: roles } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  const { data: profile } = await ctx.supabase.from("profiles").select("*").eq("id", ctx.userId).maybeSingle();
  return { roles: (roles ?? []).map((r: any) => r.role as Role), profile };
}

async function need(ctx: Ctx, role: Role) {
  const c = await caller(ctx);
  if (!c.roles.includes(role)) throw new Error("Sem permissão");
  return c;
}

function check(error: any) {
  if (error) throw new Error(error.message);
}

/* ---------------- Público: primeiro administrador ---------------- */

export const hasAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { count } = await db.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return { hasAdmin: (count ?? 0) > 0 };
});

export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { full_name: string; email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const { count } = await db.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Já existe um administrador.");
    if (data.password.length < 8) throw new Error("A senha precisa de pelo menos 8 caracteres.");
    const { data: u, error } = await db.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    check(error);
    await db.from("user_roles").insert({ user_id: u.user.id, role: "admin" });
    return { ok: true };
  });

/* ---------------- Comum ---------------- */

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = await caller(context as Ctx);
    let school: { name: string } | null = null;
    if (c.profile?.school_id) {
      const db = await admin();
      const { data } = await db.from("schools").select("name").eq("id", c.profile.school_id).maybeSingle();
      school = data;
    }
    return { roles: c.roles, profile: c.profile, school };
  });

export const updateMyName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { full_name: string }) => d)
  .handler(async ({ data, context }) => {
    const db = await admin();
    check((await db.from("profiles").update({ full_name: data.full_name.trim() }).eq("id", context.userId)).error);
    return { ok: true };
  });

export const markPasswordSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    await db.from("profiles").update({ must_set_password: false }).eq("id", context.userId);
    return { ok: true };
  });

async function createAccount(creator: Role, role: Role, input: { full_name: string; email: string; school_id: string | null }) {
  if (!CAN_CREATE[creator].includes(role)) throw new Error("Sem permissão");
  const db = await admin();
  const password = tempPassword();
  const { data: u, error } = await db.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name },
  });
  if (error) throw new Error(error.message.includes("already") ? `E-mail já cadastrado: ${input.email}` : error.message);
  await db.from("profiles").update({ full_name: input.full_name, school_id: input.school_id, must_set_password: true }).eq("id", u.user.id);
  await db.from("user_roles").insert({ user_id: u.user.id, role });
  return { id: u.user.id as string, email: input.email, password };
}

/* ---------------- Admin ---------------- */

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await need(context as Ctx, "admin");
    const db = await admin();
    const c = async (t: string, f?: (q: any) => any) => {
      let q = db.from(t).select("*", { count: "exact", head: true });
      if (f) q = f(q);
      return (await q).count ?? 0;
    };
    return {
      schools: await c("schools"),
      users: await c("profiles"),
      activeCycles: await c("cycles", (q) => q.eq("status", "aberto")),
    };
  });

export const listSchools = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await need(context as Ctx, "admin");
    const db = await admin();
    const { data } = await db.from("schools").select("*").order("name");
    return (data ?? []) as { id: string; name: string; city: string }[];
  });

export const saveSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; city: string }) => d)
  .handler(async ({ data, context }) => {
    await need(context as Ctx, "admin");
    const db = await admin();
    const row = { name: data.name.trim(), city: data.city.trim() };
    check((data.id ? await db.from("schools").update(row).eq("id", data.id) : await db.from("schools").insert(row)).error);
    return { ok: true };
  });

export const deleteSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await need(context as Ctx, "admin");
    const db = await admin();
    check((await db.from("schools").delete().eq("id", data.id)).error);
    return { ok: true };
  });

async function peopleWithRole(role: Role, schoolId?: string) {
  const db = await admin();
  const { data: r } = await db.from("user_roles").select("user_id").eq("role", role);
  const ids = (r ?? []).map((x: any) => x.user_id);
  if (!ids.length) return [];
  let q = db.from("profiles").select("id, full_name, email, school_id, must_set_password").in("id", ids).order("full_name");
  if (schoolId) q = q.eq("school_id", schoolId);
  const { data } = await q;
  return (data ?? []) as { id: string; full_name: string; email: string; school_id: string | null; must_set_password: boolean }[];
}

export const listCoordinators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await need(context as Ctx, "admin");
    return peopleWithRole("coordenacao");
  });

export const inviteCoordinator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { full_name: string; email: string; school_id: string }) => d)
  .handler(async ({ data, context }) => {
    await need(context as Ctx, "admin");
    return createAccount("admin", "coordenacao", data);
  });

export const updatePerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; full_name: string; school_id?: string }) => d)
  .handler(async ({ data, context }) => {
    const c = await caller(context as Ctx);
    const db = await admin();
    if (c.roles.includes("admin")) {
      check((await db.from("profiles").update({ full_name: data.full_name, school_id: data.school_id ?? null }).eq("id", data.id)).error);
    } else if (c.roles.includes("coordenacao")) {
      check((await db.from("profiles").update({ full_name: data.full_name }).eq("id", data.id).eq("school_id", c.profile.school_id)).error);
    } else throw new Error("Sem permissão");
    return { ok: true };
  });

export const removePerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const c = await caller(context as Ctx);
    const db = await admin();
    const { data: p } = await db.from("profiles").select("school_id").eq("id", data.id).maybeSingle();
    const { data: r } = await db.from("user_roles").select("role").eq("user_id", data.id);
    const targetRoles = (r ?? []).map((x: any) => x.role);
    const ok =
      (c.roles.includes("admin") && targetRoles.includes("coordenacao")) ||
      (c.roles.includes("coordenacao") && p?.school_id === c.profile.school_id && targetRoles.every((x: string) => x === "professor" || x === "aluno"));
    if (!ok || data.id === context.userId) throw new Error("Sem permissão");
    check((await db.auth.admin.deleteUser(data.id)).error);
    return { ok: true };
  });

/* ---------------- Coordenação ---------------- */

async function coord(ctx: Ctx) {
  const c = await need(ctx, "coordenacao");
  if (!c.profile?.school_id) throw new Error("Sua conta não está ligada a uma escola.");
  return c.profile.school_id as string;
}

export const coordOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const schoolId = await coord(context as Ctx);
    const db = await admin();
    const { data: cycle } = await db.from("cycles").select("*").eq("school_id", schoolId).eq("status", "aberto").order("starts_on", { ascending: false }).limit(1).maybeSingle();
    const { data: classes } = await db.from("classes").select("id").eq("school_id", schoolId);
    const classIds = (classes ?? []).map((c: any) => c.id);
    let expected = 0;
    let done = 0;
    if (classIds.length) {
      const { data: ct } = await db.from("class_teachers").select("class_id, teacher_id").in("class_id", classIds);
      const { data: cs } = await db.from("class_students").select("class_id, student_id").in("class_id", classIds);
      const pairs = new Set<string>();
      for (const s of cs ?? []) for (const t of ct ?? []) if (t.class_id === s.class_id) pairs.add(`${t.teacher_id}:${s.student_id}`);
      expected = pairs.size;
      if (cycle) {
        const { count } = await db.from("evaluation_receipts").select("*", { count: "exact", head: true }).eq("cycle_id", cycle.id);
        done = count ?? 0;
      }
    }
    const teachers = (await peopleWithRole("professor", schoolId)).length;
    const students = (await peopleWithRole("aluno", schoolId)).length;
    return { cycle, expected, done, classes: classIds.length, teachers, students };
  });

export const coordRegistry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const schoolId = await coord(context as Ctx);
    const db = await admin();
    const { data: classes } = await db.from("classes").select("*").eq("school_id", schoolId).order("name");
    const ids = (classes ?? []).map((c: any) => c.id);
    const { data: ct } = ids.length ? await db.from("class_teachers").select("*").in("class_id", ids) : { data: [] };
    const { data: cs } = ids.length ? await db.from("class_students").select("*").in("class_id", ids) : { data: [] };
    return {
      classes: (classes ?? []) as { id: string; name: string }[],
      classTeachers: (ct ?? []) as { class_id: string; teacher_id: string; subject: string }[],
      classStudents: (cs ?? []) as { class_id: string; student_id: string }[],
      teachers: await peopleWithRole("professor", schoolId),
      students: await peopleWithRole("aluno", schoolId),
    };
  });

export const saveClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; teachers: { id: string; subject: string }[]; students: string[] }) => d)
  .handler(async ({ data, context }) => {
    const schoolId = await coord(context as Ctx);
    const db = await admin();
    let id = data.id;
    if (id) {
      check((await db.from("classes").update({ name: data.name }).eq("id", id).eq("school_id", schoolId)).error);
    } else {
      const { data: row, error } = await db.from("classes").insert({ name: data.name, school_id: schoolId }).select("id").single();
      check(error);
      id = row.id;
    }
    await db.from("class_teachers").delete().eq("class_id", id);
    await db.from("class_students").delete().eq("class_id", id);
    if (data.teachers.length) await db.from("class_teachers").insert(data.teachers.map((t) => ({ class_id: id, teacher_id: t.id, subject: t.subject })));
    if (data.students.length) await db.from("class_students").insert(data.students.map((s) => ({ class_id: id, student_id: s })));
    return { ok: true };
  });

export const deleteClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const schoolId = await coord(context as Ctx);
    const db = await admin();
    check((await db.from("classes").delete().eq("id", data.id).eq("school_id", schoolId)).error);
    return { ok: true };
  });

export const createPeople = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { role: "professor" | "aluno"; people: { full_name: string; email: string }[] }) => d)
  .handler(async ({ data, context }) => {
    const schoolId = await coord(context as Ctx);
    const created: { email: string; password: string }[] = [];
    const errors: string[] = [];
    for (const p of data.people) {
      try {
        const r = await createAccount("coordenacao", data.role, { ...p, school_id: schoolId });
        created.push({ email: r.email, password: r.password });
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    return { created, errors };
  });

export const listCycles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = await caller(context as Ctx);
    const schoolId = c.profile?.school_id;
    if (!schoolId) return [];
    const db = await admin();
    const { data } = await db.from("cycles").select("*").eq("school_id", schoolId).order("starts_on", { ascending: false });
    const ids = (data ?? []).map((x: any) => x.id);
    const { data: qs } = ids.length ? await db.from("questions").select("*").in("cycle_id", ids).order("position") : { data: [] };
    return (data ?? []).map((cy: any) => ({ ...cy, questions: (qs ?? []).filter((q: any) => q.cycle_id === cy.id) })) as {
      id: string; name: string; starts_on: string; ends_on: string; status: string; questions: { id: string; text: string; position: number }[];
    }[];
  });

export const saveCycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; starts_on: string; ends_on: string; status: string; questions: { id?: string; text: string }[] }) => d)
  .handler(async ({ data, context }) => {
    const schoolId = await coord(context as Ctx);
    const db = await admin();
    if (data.ends_on < data.starts_on) throw new Error("A data final deve ser depois da inicial.");
    const row = { name: data.name, starts_on: data.starts_on, ends_on: data.ends_on, status: data.status, school_id: schoolId };
    let id = data.id;
    if (id) check((await db.from("cycles").update(row).eq("id", id).eq("school_id", schoolId)).error);
    else {
      const { data: r, error } = await db.from("cycles").insert(row).select("id").single();
      check(error);
      id = r.id;
    }
    const { count } = await db.from("evaluations").select("*", { count: "exact", head: true }).eq("cycle_id", id);
    if ((count ?? 0) === 0) {
      await db.from("questions").delete().eq("cycle_id", id);
      const qs = data.questions.filter((q) => q.text.trim());
      if (qs.length) await db.from("questions").insert(qs.map((q, i) => ({ cycle_id: id, text: q.text.trim(), position: i })));
    }
    return { ok: true, questionsLocked: (count ?? 0) > 0 };
  });

async function teacherResults(teacherId: string, cycleId: string) {
  const db = await admin();
  const { data: qs } = await db.from("questions").select("*").eq("cycle_id", cycleId).order("position");
  const { data: evs } = await db.from("evaluations").select("id, comment, created_at").eq("cycle_id", cycleId).eq("teacher_id", teacherId);
  const evIds = (evs ?? []).map((e: any) => e.id);
  const { data: ans } = evIds.length ? await db.from("answers").select("*").in("evaluation_id", evIds) : { data: [] };
  const questions = (qs ?? []).map((q: any) => ({
    id: q.id as string,
    text: q.text as string,
    avg: average((ans ?? []).filter((a: any) => a.question_id === q.id).map((a: any) => a.score)),
  }));
  return {
    count: evIds.length,
    overall: average((ans ?? []).map((a: any) => a.score)),
    questions,
    comments: (evs ?? []).filter((e: any) => e.comment?.trim()).map((e: any) => e.comment as string),
  };
}

export const coordResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cycleId?: string }) => d)
  .handler(async ({ data, context }) => {
    const schoolId = await coord(context as Ctx);
    const db = await admin();
    const { data: cycles } = await db.from("cycles").select("id, name, status").eq("school_id", schoolId).order("starts_on", { ascending: false });
    const cycleId = data.cycleId ?? cycles?.[0]?.id;
    const teachers = await peopleWithRole("professor", schoolId);
    const rows = cycleId
      ? await Promise.all(teachers.map(async (t) => ({ teacher: t, ...(await teacherResults(t.id, cycleId)) })))
      : [];
    return { cycles: (cycles ?? []) as { id: string; name: string; status: string }[], cycleId: cycleId ?? null, rows };
  });

/* ---------------- Professor ---------------- */

export const myResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cycleId?: string }) => d)
  .handler(async ({ data, context }) => {
    const c = await need(context as Ctx, "professor");
    const db = await admin();
    const { data: cycles } = await db.from("cycles").select("id, name, status, starts_on, ends_on").eq("school_id", c.profile.school_id).neq("status", "rascunho").order("starts_on", { ascending: false });
    const cycleId = data.cycleId ?? cycles?.[0]?.id;
    const result = cycleId ? await teacherResults(context.userId, cycleId) : null;
    return { cycles: (cycles ?? []) as { id: string; name: string; status: string; starts_on: string; ends_on: string }[], cycleId: cycleId ?? null, result };
  });

/* ---------------- Aluno ---------------- */

async function studentContext(studentId: string, schoolId: string | null) {
  const db = await admin();
  const { data: cycle } = await db.from("cycles").select("*").eq("school_id", schoolId).eq("status", "aberto").order("starts_on", { ascending: false }).limit(1).maybeSingle();
  const { data: cs } = await db.from("class_students").select("class_id").eq("student_id", studentId);
  const classIds = (cs ?? []).map((x: any) => x.class_id);
  const { data: ct } = classIds.length ? await db.from("class_teachers").select("teacher_id, subject, class_id").in("class_id", classIds) : { data: [] };
  const teacherIds = [...new Set((ct ?? []).map((x: any) => x.teacher_id))];
  const { data: profs } = teacherIds.length ? await db.from("profiles").select("id, full_name").in("id", teacherIds) : { data: [] };
  const { data: rec } = cycle ? await db.from("evaluation_receipts").select("teacher_id").eq("cycle_id", cycle.id).eq("student_id", studentId) : { data: [] };
  const done = new Set((rec ?? []).map((r: any) => r.teacher_id));
  const teachers = (profs ?? []).map((p: any) => ({
    id: p.id as string,
    full_name: p.full_name as string,
    subject: (ct ?? []).filter((x: any) => x.teacher_id === p.id).map((x: any) => x.subject).filter(Boolean).join(", "),
    done: done.has(p.id),
  }));
  return { cycle, teachers };
}

export const studentPanel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = await need(context as Ctx, "aluno");
    return studentContext(context.userId, c.profile.school_id);
  });

export const evaluationForm = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { teacherId: string }) => d)
  .handler(async ({ data, context }) => {
    const c = await need(context as Ctx, "aluno");
    const s = await studentContext(context.userId, c.profile.school_id);
    const teacher = s.teachers.find((t: { id: string }) => t.id === data.teacherId);
    if (!s.cycle || !teacher) throw new Error("Avaliação indisponível.");
    const db = await admin();
    const { data: qs } = await db.from("questions").select("id, text").eq("cycle_id", s.cycle.id).order("position");
    return { cycle: { id: s.cycle.id as string, name: s.cycle.name as string }, teacher, questions: (qs ?? []) as { id: string; text: string }[] };
  });

export const submitEvaluation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { teacherId: string; scores: Record<string, number>; comment: string }) => d)
  .handler(async ({ data, context }) => {
    const c = await need(context as Ctx, "aluno");
    const s = await studentContext(context.userId, c.profile.school_id);
    const teacher = s.teachers.find((t: { id: string }) => t.id === data.teacherId);
    if (!s.cycle || !teacher) throw new Error("Avaliação indisponível.");
    if (teacher.done) throw new Error("Você já avaliou este professor neste ciclo.");
    const db = await admin();
    const { data: qs } = await db.from("questions").select("id").eq("cycle_id", s.cycle.id);
    for (const q of qs ?? []) if (!isValidScore(Number(data.scores[q.id]))) throw new Error("Responda todas as perguntas com notas de 1 a 5.");
    // Receipt first (unique) so the same student can't submit twice; evaluation stores no student id.
    check((await db.from("evaluation_receipts").insert({ cycle_id: s.cycle.id, teacher_id: teacher.id, student_id: context.userId })).error);
    const { data: ev, error } = await db.from("evaluations").insert({ cycle_id: s.cycle.id, teacher_id: teacher.id, comment: data.comment.trim() || null }).select("id").single();
    check(error);
    if (qs?.length) await db.from("answers").insert(qs.map((q: any) => ({ evaluation_id: ev.id, question_id: q.id, score: Number(data.scores[q.id]) })));
    return { ok: true };
  });
