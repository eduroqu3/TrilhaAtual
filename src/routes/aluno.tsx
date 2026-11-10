import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle, Clock } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/app/Card";
import { Button } from "@/components/app/Button";
import { EmptyState } from "@/components/app/EmptyState";
import { AvisoAnonimato } from "@/components/app/AvisoAnonimato";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Usuario } from "@/types/api";

interface VinculoPendente {
  id: number;
  professor_nome: string;
  disciplina_nome: string;
  turma_nome: string;
}

interface CicloPendencias {
  ciclo_id: number;
  ciclo_nome: string;
  abre_em: string;
  fecha_em: string;
  vinculos: VinculoPendente[];
}

export const Route = createFileRoute("/aluno")({
  beforeLoad: ({ location }) => requireAuth({ allowedRoles: ["ALUNO"], location }),
  component: AlunoPage,
});

function AlunoPage() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [pendencias, setPendencias] = useState<CicloPendencias[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [userData, pendenciasData] = await Promise.all([
          api.get<Usuario>("/api/auth/me/"),
          api.get<CicloPendencias[]>("/api/aluno/pendencias/"),
        ]);
        if (isMounted) {
          setUser(userData);
          setPendencias(pendenciasData);
        }
      } catch (err) {
        if (isMounted) {
          setError("Não foi possível carregar suas pendências no momento.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayName = user?.first_name || user?.username || "Estudante";

  // Total de vínculos pendentes em todos os ciclos abertos
  const totalPendencias = pendencias.reduce((acc, c) => acc + (c.vinculos?.length || 0), 0);

  return (
    <AppShell userName={displayName}>
      <div className="space-y-8">
        <div>
          <p className="eyebrow flex items-center gap-3">
            <span className="h-px w-8 bg-mustard" />
            Painel do Estudante
          </p>
          <h1 className="mt-4 text-3xl font-medium md:text-4xl">Suas Avaliações</h1>
          <p className="mt-2 text-muted-foreground">
            Acesse suas avaliações pendentes e participe da escuta pedagógica que transforma sua escola.
          </p>
        </div>

        <AvisoAnonimato />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Clock className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm font-medium">Buscando avaliações em aberto...</p>
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-6 text-center text-destructive">
            <p className="font-medium">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : totalPendencias === 0 ? (
          <EmptyState
            icon={<CheckCircle className="h-8 w-8 text-primary" />}
            title="Tudo em dia com suas avaliações!"
            description="Não há avaliações pendentes para você no momento. Quando um novo ciclo de escuta pedagógica for aberto pela coordenação, ele aparecerá aqui."
          />
        ) : (
          <div className="space-y-8">
            {pendencias.map((ciclo) => (
              <section key={ciclo.ciclo_id} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3 gap-2">
                  <div>
                    <h2 className="font-serif text-2xl font-medium text-foreground">{ciclo.ciclo_nome}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Período do ciclo: {new Date(ciclo.abre_em).toLocaleDateString("pt-BR")} até{" "}
                      {new Date(ciclo.fecha_em).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">
                    {ciclo.vinculos.length} {ciclo.vinculos.length === 1 ? "pendente" : "pendentes"}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {ciclo.vinculos.map((vinculo) => (
                    <Card key={vinculo.id} shadow="sage" className="flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                            <BookOpen className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold uppercase tracking-wider text-primary">
                              {vinculo.disciplina_nome}
                            </p>
                            <h3 className="truncate font-medium text-foreground text-lg" title={vinculo.professor_nome}>
                              {vinculo.professor_nome}
                            </h3>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Turma: {vinculo.turma_nome}</p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-border/60">
                        <Link
                          to="/aluno/avaliar/$vinculoId"
                          params={{ vinculoId: String(vinculo.id) }}
                          search={{ cicloId: ciclo.ciclo_id }}
                          className="w-full"
                        >
                          <Button variant="primary" fullWidth iconRight={<ArrowRight className="h-4 w-4" />}>
                            Avaliar
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
