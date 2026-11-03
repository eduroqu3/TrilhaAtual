import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ArrowRight, Check, Plus, Minus, Search, Star, Quote } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trilha — Sua experiência pode melhorar a próxima aula" },
      {
        name: "description",
        content:
          "Um espaço para estudantes compartilharem como aprendem e para escolas transformarem percepções em melhorias pedagógicas.",
      },
      { property: "og:title", content: "Trilha — Escuta que vira caminho" },
      {
        property: "og:description",
        content: "Avaliações de estudantes como ponto de partida para escuta e melhoria pedagógica — não vereditos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const wrap = "mx-auto w-full max-w-6xl px-6 md:px-10";

function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full border ${light ? "border-primary-foreground/60" : "border-primary"}`}
      >
        <svg viewBox="0 0 20 20" className={`h-4 w-4 ${light ? "text-mustard" : "text-primary"}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 15c3-1 4-4 6-7s3-4 6-4" />
          <circle cx="16" cy="4" r="1.2" fill="currentColor" />
        </svg>
      </span>
      <span className={`font-serif text-2xl font-medium ${light ? "text-primary-foreground" : "text-foreground"}`}>trilha</span>
    </span>
  );
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p className={`eyebrow flex items-center gap-3 ${light ? "text-accent" : ""}`}>
      <span className="h-px w-8 bg-mustard" />
      {children}
    </p>
  );
}

function PrimaryButton({ children, href, variant = "solid" }: { children: ReactNode; href: string; variant?: "solid" | "cream" }) {
  const cls =
    variant === "solid"
      ? "bg-primary text-primary-foreground hover:bg-foreground"
      : "bg-background text-primary hover:bg-accent";
  return (
    <a href={href} className={`group inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mustard ${cls}`}>
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </a>
  );
}

function TextLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <a href={href} className="group inline-flex items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline">
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </a>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className={`${wrap} flex h-20 items-center justify-between gap-6`}>
        <a href="#inicio" className="flex items-center gap-3">
          <Logo />
          <span className="hidden text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted-foreground sm:inline">Nome de trabalho</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-foreground lg:flex">
          <a href="#estudantes" className="hover:text-primary">Para estudantes</a>
          <a href="#perfis" className="hover:text-primary">Perfis docentes</a>
          <a href="#escolas" className="hover:text-primary">Para escolas</a>
          <a href="#duvidas" className="hover:text-primary">Dúvidas</a>
        </nav>
        <PrimaryButton href="#percurso">Como funciona</PrimaryButton>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="inicio" className={`${wrap} grid items-center gap-16 py-20 md:py-28 lg:grid-cols-[1.1fr_1fr]`}>
      <div>
        <Eyebrow>Escuta que vira caminho</Eyebrow>
        <h1 className="mt-6 max-w-xl text-5xl leading-[1.02] font-medium text-foreground md:text-7xl">
          Sua experiência pode <em className="text-primary">melhorar</em> a próxima aula.
        </h1>
        <p className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground">
          Um espaço para estudantes compartilharem como aprendem — e para escolas transformarem essas percepções em conversas e melhorias pedagógicas.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-6">
          <PrimaryButton href="#estudantes">Entenda a proposta</PrimaryButton>
          <TextLink href="#perfis">Conheça os perfis docentes</TextLink>
        </div>
        <p className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-px w-6 shrink-0 bg-mustard" />
          Avaliações são pontos de partida para compreender experiências — não vereditos.
        </p>
      </div>
      <figure className="relative mx-auto w-full max-w-md">
        <div className="relative aspect-square">
          <div className="absolute inset-4 rounded-full bg-accent" />
          <svg className="absolute -left-4 top-6 h-24 w-24 text-mustard" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 70 Q40 10 90 30" /><path d="M20 85 Q50 40 85 55" />
          </svg>
          <div className="absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2 -rotate-3 rounded-lg border border-border bg-card p-6 shadow-duo">
            <div className="mx-auto -mt-9 mb-4 h-5 w-16 rounded-sm bg-sage" />
            {[80, 60, 72, 50].map((w, i) => (
              <div key={i} className="mb-4 flex items-center gap-3">
                <span className={`flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${i === 1 ? "bg-primary" : ""}`}>
                  {i === 1 && <Check className="h-3 w-3 text-primary-foreground" />}
                </span>
                <span className="h-1.5 rounded-full bg-primary/40" style={{ width: `${w}%` }} />
              </div>
            ))}
            <div className="mt-6 h-1.5 w-1/2 rounded-full bg-border" />
          </div>
          <div className="absolute bottom-6 right-6 h-28 w-2.5 rotate-[30deg] rounded-full bg-mustard" />
          <div className="absolute -bottom-2 left-0 max-w-[14rem] rounded-md border border-border bg-background p-4 shadow-sage">
            <p className="eyebrow text-[0.6rem]">Uma conversa em construção</p>
            <p className="mt-1 font-serif text-xl italic text-foreground">Ouvir também ensina.</p>
          </div>
        </div>
        <figcaption className="mt-8 text-center text-sm text-muted-foreground">Cada percurso de aprendizagem é feito de muitas vozes.</figcaption>
      </figure>
    </section>
  );
}

function Banner() {
  return (
    <section className="bg-primary py-10 text-primary-foreground">
      <div className={`${wrap} flex items-center justify-center gap-5 text-center`}>
        <span className="hidden text-mustard md:inline">✦</span>
        <p className="font-serif text-xl md:text-3xl">Uma avaliação não resume uma aula. O contexto faz parte da conversa.</p>
        <span className="hidden text-mustard md:inline">✦</span>
      </div>
    </section>
  );
}

function NumberedList({ items }: { items: { t?: string; d: string }[] }) {
  return (
    <ol className="mt-10 border-t border-border">
      {items.map((it, i) => (
        <li key={i} className="flex gap-6 border-b border-border py-6">
          <span className="font-serif text-2xl text-primary">{String(i + 1).padStart(2, "0")}</span>
          <div>
            {it.t && <h3 className="text-xl font-medium text-foreground">{it.t}</h3>}
            <p className={`${it.t ? "mt-1.5" : ""} leading-relaxed text-muted-foreground`}>{it.d}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Students() {
  const dims = [
    ["Clareza nas aulas", 4.3],
    ["Espaço para dúvidas", 4.0],
    ["Ritmo de aprendizagem", 4.5],
  ] as const;
  return (
    <section id="estudantes" className="bg-secondary py-24 md:py-32">
      <div className={`${wrap} grid items-center gap-16 lg:grid-cols-2`}>
        <div>
          <Eyebrow>A experiência começa com você</Eyebrow>
          <h2 className="mt-6 text-4xl leading-tight font-medium md:text-5xl">O que acontece na aula merece ser escutado.</h2>
          <p className="mt-6 max-w-lg leading-relaxed text-muted-foreground">
            Suas observações ajudam a compor uma visão mais ampla do ensino. O valor está no que se aprende ao olhar para diferentes experiências — não em reduzir uma pessoa a uma nota.
          </p>
          <NumberedList
            items={[
              { t: "Compartilhe sua perspectiva", d: "Conte como foi aprender: o que ajudou, o que poderia mudar e em qual contexto." },
              { t: "Acrescente contexto", d: "Uma percepção ganha sentido quando sabemos a que aspecto da experiência ela se refere." },
              { t: "Ajude a abrir caminhos", d: "O conjunto das avaliações pode apoiar conversas pedagógicas e melhorias na escola." },
            ]}
          />
        </div>
        <div className="relative">
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full border border-primary/20" />
          <article className="relative rounded-lg border border-border bg-card p-8 shadow-sage">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent font-serif text-lg text-primary">LM</span>
                <div>
                  <h3 className="text-xl font-medium">Luiza Martins</h3>
                  <p className="text-sm text-muted-foreground">Ciências · Ensino Fundamental</p>
                </div>
              </div>
              <span className="rounded-full border border-mustard px-3 py-1 text-[0.6rem] font-bold tracking-widest text-foreground">EXEMPLO ILUSTRATIVO</span>
            </div>
            <div className="mt-8 flex items-end gap-5 border-y border-border py-6">
              <span className="font-serif text-6xl leading-none text-foreground">4,2</span>
              <div>
                <div className="flex gap-0.5 text-mustard">
                  {[0, 1, 2, 3].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  <Star className="h-4 w-4" />
                </div>
                <p className="mt-1 font-serif italic text-foreground">Uma leitura entre várias</p>
                <p className="text-xs text-muted-foreground">Exemplo de nota agregada</p>
              </div>
            </div>
            <p className="mt-5 rounded-md bg-secondary p-4 text-sm leading-relaxed text-muted-foreground">
              Uma nota oferece apenas um recorte. Conhecer o contexto e as diferentes dimensões ajuda a formar uma leitura mais cuidadosa.
            </p>
            <ul className="mt-6 space-y-4">
              {dims.map(([l, v]) => (
                <li key={l}>
                  <div className="flex justify-between text-sm"><span>{l}</span><span className="font-bold">{v.toFixed(1).replace(".", ",")}</span></div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-accent"><div className="h-full rounded-full bg-primary" style={{ width: `${(v / 5) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
              Nome, disciplina, notas e dimensões são dados inventados para demonstrar a interface. Não representam uma pessoa ou avaliação real.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function Profiles() {
  return (
    <section id="perfis" className={`${wrap} grid items-center gap-16 py-24 md:py-32 lg:grid-cols-2`}>
      <div className="rounded-xl bg-accent p-6 md:p-10">
        <div className="rounded-lg border border-border bg-card p-6 shadow-mustard">
          <div className="flex items-center justify-between">
            <Logo />
            <span className="eyebrow text-[0.6rem]">Explorar perfis</span>
          </div>
          <form className="mt-6 flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <label className="sr-only" htmlFor="busca">Buscar perfis</label>
            <input id="busca" placeholder="Busque por disciplina ou nome" className="min-w-0 flex-1 rounded-md border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            <button aria-label="Buscar" className="rounded-md bg-primary px-4 text-primary-foreground"><Search className="h-4 w-4" /></button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">Demonstração de busca com conteúdo ilustrativo.</p>
          <div className="mt-6 flex items-center gap-4 rounded-md border border-border p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-serif text-primary">?</span>
            <div className="flex-1">
              <p className="font-serif text-lg">Uma consulta com contexto</p>
              <p className="text-sm text-muted-foreground">Perfis públicos para conhecer experiências</p>
            </div>
            <ArrowRight className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-6 text-center text-[0.6rem] font-bold tracking-widest text-muted-foreground">INTERAÇÃO DEMONSTRATIVA · DADOS FICTÍCIOS</p>
        </div>
      </div>
      <div>
        <Eyebrow>Além da primeira impressão</Eyebrow>
        <h2 className="mt-6 text-4xl leading-tight font-medium md:text-5xl">Perfis públicos para conhecer, não para rotular.</h2>
        <p className="mt-6 leading-relaxed text-muted-foreground">
          Os perfis docentes apresentam avaliações como parte de uma conversa maior sobre a experiência de aprender. Consulte as dimensões e considere que toda pontuação mostra só um recorte.
        </p>
        <ul className="mt-8 space-y-4">
          {[
            "Veja as avaliações em relação ao que está sendo observado.",
            "Use a nota como referência inicial, nunca como retrato completo.",
            "Reconheça que contextos e experiências podem ser diferentes.",
          ].map((t) => (
            <li key={t} className="flex items-start gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent"><ArrowRight className="h-3.5 w-3.5 text-primary" /></span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8"><TextLink href="#duvidas">Por que contexto importa?</TextLink></div>
      </div>
    </section>
  );
}

function QuoteSection() {
  return (
    <section className="bg-primary py-24 text-primary-foreground">
      <div className={`${wrap} grid gap-10 md:grid-cols-[1fr_2fr]`}>
        <div>
          <Quote className="h-10 w-10 fill-mustard text-mustard" />
          <p className="eyebrow mt-5 text-accent">Uma ideia para levar com você</p>
        </div>
        <blockquote>
          <p className="font-serif text-3xl leading-snug md:text-5xl">“Uma nota é uma pergunta para aprofundar — não uma resposta definitiva sobre quem ensina.”</p>
          <footer className="mt-6 text-sm text-primary-foreground/70">Princípio de leitura da TRILHA. Não é um depoimento de estudante.</footer>
        </blockquote>
      </div>
    </section>
  );
}

function Schools() {
  return (
    <section id="escolas" className="bg-secondary py-24 md:py-32">
      <div className={`${wrap} grid items-center gap-16 lg:grid-cols-2`}>
        <div>
          <Eyebrow>Uma escuta que volta para a escola</Eyebrow>
          <h2 className="mt-6 text-4xl leading-tight font-medium md:text-5xl">Avaliar também é aprender a melhorar.</h2>
          <p className="mt-6 leading-relaxed text-muted-foreground">
            Para escolas, as avaliações podem contribuir com a avaliação interna e apoiar reflexões pedagógicas. A intenção é olhar para padrões e possibilidades de desenvolvimento, com responsabilidade e espaço para contexto.
          </p>
          <NumberedList
            items={[
              { d: "Reunir percepções de estudantes como insumo para a conversa pedagógica." },
              { d: "Identificar aspectos da experiência de aprendizagem que merecem atenção." },
              { d: "Usar a avaliação interna para orientar possibilidades de melhoria." },
            ]}
          />
        </div>
        <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-mustard md:rotate-2">
          <p className="eyebrow text-[0.6rem]">Exemplo ilustrativo · Uso interno</p>
          <h3 className="mt-4 text-2xl font-medium">Perguntas que ajudam a escola a escutar</h3>
          {["O que está funcionando?", "Onde há espaço para evoluir?"].map((q, i) => (
            <div key={q} className="mt-5 flex items-center gap-4 border-t border-border pt-5">
              <span className="font-serif text-2xl text-mustard">0{i + 1}</span>
              <p className="font-serif text-lg italic">{q}</p>
            </div>
          ))}
          <div className="mt-8 flex h-24 items-end gap-3 border-b border-border">
            {[40, 65, 50, 85, 70, 95].map((h, i) => <div key={i} className="flex-1 rounded-t-sm bg-sage" style={{ height: `${h}%` }} />)}
          </div>
          <p className="mt-4 text-[0.6rem] font-bold tracking-widest text-muted-foreground">ELEMENTOS VISUAIS SEM DADOS REAIS</p>
        </div>
      </div>
    </section>
  );
}

function Process() {
  const steps = [
    ["Experiência", "Estudantes compartilham suas percepções sobre as aulas e o processo de aprendizagem."],
    ["Leitura", "As avaliações são consideradas em conjunto, com atenção ao contexto de cada experiência."],
    ["Melhoria", "Escolas podem usar esse insumo em sua avaliação interna e em conversas pedagógicas."],
  ];
  return (
    <section id="percurso" className={`${wrap} py-24 md:py-32`}>
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <Eyebrow>Um percurso em três tempos</Eyebrow>
          <h2 className="mt-6 text-4xl font-medium md:text-6xl">Escutar. Refletir. Aprimorar.</h2>
        </div>
        <p className="max-w-xs text-muted-foreground">Um ciclo para manter a experiência dos estudantes próxima das decisões pedagógicas.</p>
      </div>
      <div className="relative mt-16">
        <div className="absolute left-0 right-0 top-0 hidden h-px bg-border md:block" />
        <ol className="grid gap-10 md:grid-cols-3">
          {steps.map(([t, d], i) => (
            <li key={t} className="relative md:pt-10">
              <span className="absolute -top-1.5 left-0 hidden h-3 w-3 rotate-45 bg-mustard md:block" />
              <span className="font-serif text-6xl text-primary">0{i + 1}</span>
              <h3 className="mt-3 text-2xl font-medium">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const faqs = [
  ["Uma nota define se um professor é bom?", "Não. Uma nota é apenas um recorte de algumas experiências. Ela serve como ponto de partida para entender o que acontece em aula, nunca como um julgamento completo sobre quem ensina."],
  ["Para que servem as avaliações dos estudantes?", "Para trazer a perspectiva de quem aprende para perto das conversas pedagógicas, ajudando escolas e docentes a perceber o que funciona e onde há espaço para evoluir."],
  ["O que encontro em um perfil docente?", "Informações sobre disciplina e etapa de ensino, uma leitura agregada das avaliações e dimensões específicas da experiência, sempre acompanhadas de lembretes sobre contexto."],
  ["Como a TRILHA trata as avaliações?", "Como sinais para iniciar conversas. Elas são lidas em conjunto, com atenção ao contexto, e sem linguagem de ranking ou exposição."],
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="duvidas" className="bg-secondary py-24 md:py-32">
      <div className={`${wrap} grid gap-12 lg:grid-cols-[1fr_1.4fr]`}>
        <div>
          <Eyebrow>Dúvidas honestas</Eyebrow>
          <h2 className="mt-6 text-4xl font-medium md:text-5xl">Antes de seguir o caminho.</h2>
          <p className="mt-5 text-muted-foreground">Uma ferramenta de avaliação precisa ser compreendida com cuidado.</p>
        </div>
        <ul className="border-t border-border">
          {faqs.map(([q, a], i) => (
            <li key={q} className="border-b border-border">
              <button
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-6 py-6 text-left font-serif text-xl text-foreground hover:text-primary"
              >
                {q}
                {open === i ? <Minus className="h-5 w-5 shrink-0 text-primary" /> : <Plus className="h-5 w-5 shrink-0 text-primary" />}
              </button>
              {open === i && <p className="max-w-xl pb-6 leading-relaxed text-muted-foreground">{a}</p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-primary py-24 text-primary-foreground md:py-32">
      <div className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full border border-primary-foreground/15" />
      <div className="absolute -right-16 -top-16 h-[20rem] w-[20rem] rounded-full border border-primary-foreground/15" />
      <div className={`${wrap} relative`}>
        <Eyebrow light>O próximo passo começa ouvindo</Eyebrow>
        <h2 className="mt-6 max-w-3xl text-4xl leading-tight font-medium md:text-6xl">Mais escuta pode abrir espaço para uma aula melhor.</h2>
        <div className="mt-10"><PrimaryButton href="#inicio" variant="cream">Voltar ao início</PrimaryButton></div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-forest py-12 text-primary-foreground">
      <div className={`${wrap} flex flex-col gap-6 md:flex-row md:items-center md:justify-between`}>
        <Logo light />
        <p className="max-w-md text-sm text-primary-foreground/70">TRILHA é um nome de trabalho. Esta proposta não implica disponibilidade de marca ou domínio.</p>
        <p className="font-serif italic text-accent">Escuta respeitosa. Aprendizagem em movimento.</p>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <Banner />
        <Students />
        <Profiles />
        <QuoteSection />
        <Schools />
        <Process />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
