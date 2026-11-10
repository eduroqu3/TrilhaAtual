from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.accounts.models import RoleChoices
from apps.avaliacoes.models import (
    Avaliacao,
    CicloAvaliacao,
    CicloStatus,
    ModeracaoStatus,
    Participacao,
    Pergunta,
    PerguntaTipo,
    RespostaEscala,
    RespostaTexto,
)
from apps.escolas.models import Disciplina, Escola, Matricula, Turma, Vinculo

Usuario = get_user_model()


class Command(BaseCommand):
    help = (
        "Cria dados fictícios para demonstração da Trilha (apenas em desenvolvimento)."
    )

    def handle(self, *args, **options):
        if not settings.DEBUG and not getattr(settings, "TESTING", False):
            raise CommandError("O comando seed_demo só pode ser executado em desenvolvimento.")

        self.stdout.write("Iniciando criação de dados de demonstração (seed_demo)...")

        # 1. Escola
        escola, _ = Escola.objects.get_or_create(
            nome="Colégio Pedagógico Trilha do Saber",
            defaults={"limiar_minimo": 5},
        )
        self.stdout.write(f"- Escola: {escola.nome} (Limiar mínimo: {escola.limiar_minimo})")

        # 2. Usuários
        # Admin Global
        admin_user, _ = Usuario.objects.get_or_create(
            username="admin.demo",
            defaults={
                "email": "admin@trilha.demo",
                "first_name": "Administrador",
                "last_name": "Global",
                "role": RoleChoices.ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin_user.set_password("demo1234")
        admin_user.save()

        # Coordenação
        coord_user, _ = Usuario.objects.get_or_create(
            username="coord.demo",
            defaults={
                "email": "coordenacao@trilha.demo",
                "first_name": "Helena",
                "last_name": "Coordenadora",
                "role": RoleChoices.COORDENACAO,
                "escola": escola,
                "is_staff": True,
            },
        )
        coord_user.set_password("demo1234")
        coord_user.save()

        # Professores
        prof_mat, _ = Usuario.objects.get_or_create(
            username="prof.matematica",
            defaults={
                "email": "marcos@trilha.demo",
                "first_name": "Marcos",
                "last_name": "Paulo",
                "role": RoleChoices.PROFESSOR,
                "escola": escola,
            },
        )
        prof_mat.set_password("demo1234")
        prof_mat.save()

        prof_hist, _ = Usuario.objects.get_or_create(
            username="prof.historia",
            defaults={
                "email": "clara@trilha.demo",
                "first_name": "Clara",
                "last_name": "Mendes",
                "role": RoleChoices.PROFESSOR,
                "escola": escola,
            },
        )
        prof_hist.set_password("demo1234")
        prof_hist.save()

        # Alunos da Turma A (6 alunos para permitir atingir o limiar de 5)
        alunos = []
        for i in range(1, 8):
            aluno, _ = Usuario.objects.get_or_create(
                username=f"aluno{i}.demo",
                defaults={
                    "email": f"aluno{i}@trilha.demo",
                    "first_name": f"Estudante {i}",
                    "last_name": "Silva",
                    "role": RoleChoices.ALUNO,
                    "escola": escola,
                },
            )
            aluno.set_password("demo1234")
            aluno.save()
            alunos.append(aluno)

        self.stdout.write(
            "- Usuários criados com senha 'demo1234':\n"
            "  * Coordenação: coord.demo\n"
            "  * Professores: prof.matematica, prof.historia\n"
            "  * Alunos: aluno1.demo até aluno7.demo"
        )

        # 3. Turmas e Disciplinas
        turma_a, _ = Turma.objects.get_or_create(
            escola=escola,
            nome="3º Ano Ensino Médio A",
            ano_letivo=2026,
        )

        disc_mat, _ = Disciplina.objects.get_or_create(
            escola=escola,
            nome="Matemática Aplicada",
            defaults={"codigo": "MAT-301"},
        )

        disc_hist, _ = Disciplina.objects.get_or_create(
            escola=escola,
            nome="História Contemporânea",
            defaults={"codigo": "HIS-301"},
        )

        # 4. Matrículas
        for aluno in alunos:
            Matricula.objects.get_or_create(aluno=aluno, turma=turma_a)

        # 5. Vínculos docentes
        vinculo_mat, _ = Vinculo.objects.get_or_create(
            professor=prof_mat,
            turma=turma_a,
            disciplina=disc_mat,
            defaults={"ativo": True},
        )

        vinculo_hist, _ = Vinculo.objects.get_or_create(
            professor=prof_hist,
            turma=turma_a,
            disciplina=disc_hist,
            defaults={"ativo": True},
        )

        # 6. Ciclo de Avaliação Aberto (Atual)
        agora = timezone.now()
        ciclo_aberto, _ = CicloAvaliacao.objects.get_or_create(
            escola=escola,
            nome="Ciclo Diagnóstico 2026 - 1º Bimestre",
            defaults={
                "abre_em": agora - timedelta(days=5),
                "fecha_em": agora + timedelta(days=15),
                "status": CicloStatus.ABERTO,
            },
        )

        # Perguntas do ciclo
        p1, _ = Pergunta.objects.get_or_create(
            ciclo=ciclo_aberto,
            ordem=1,
            defaults={
                "texto": "O professor explica os conteúdos com clareza e ritmo adequado?",
                "tipo": PerguntaTipo.ESCALA_1_5,
                "dimensao": "Didática e Clareza",
            },
        )

        p2, _ = Pergunta.objects.get_or_create(
            ciclo=ciclo_aberto,
            ordem=2,
            defaults={
                "texto": "Há espaço e acolhimento para tirar dúvidas durante a aula?",
                "tipo": PerguntaTipo.ESCALA_1_5,
                "dimensao": "Acolhimento de Dúvidas",
            },
        )

        p3, _ = Pergunta.objects.get_or_create(
            ciclo=ciclo_aberto,
            ordem=3,
            defaults={
                "texto": "Compartilhe uma sugestão construtiva para melhorar as aulas:",
                "tipo": PerguntaTipo.TEXTO,
                "dimensao": "Sugestões Pedagógicas",
            },
        )

        # 7. Criar 5 avaliações anônimas para Matemática (atingindo o limiar)
        # Respeitando a REGRA INEGOCIÁVEL: Participacao com aluno; Avaliacao SEM aluno
        comentarios_exemplo = [
            "Gosto muito das conexões que o professor faz com problemas do dia a dia.",
            "As listas de exercícios são excelentes, mas às vezes o ritmo do quadro é rápido.",
            "Professor muito paciente e dedicado a explicar até todos entenderem.",
            "As aulas são muito boas e produtivas.",
            "Gostaria de mais exemplos práticos em sala.",
        ]

        for idx, aluno in enumerate(alunos[:5]):
            if not Participacao.objects.filter(
                aluno=aluno, ciclo=ciclo_aberto, vinculo=vinculo_mat
            ).exists():
                Participacao.objects.create(aluno=aluno, ciclo=ciclo_aberto, vinculo=vinculo_mat)
                # Criação da Avaliação ANÔNIMA (sem chave para aluno, sem data/hora)
                avaliacao = Avaliacao.objects.create(ciclo=ciclo_aberto, vinculo=vinculo_mat)
                RespostaEscala.objects.create(
                    avaliacao=avaliacao,
                    pergunta=p1,
                    valor=4 if idx % 2 == 0 else 5,
                )
                RespostaEscala.objects.create(
                    avaliacao=avaliacao,
                    pergunta=p2,
                    valor=5 if idx % 2 == 0 else 4,
                )
                RespostaTexto.objects.create(
                    avaliacao=avaliacao,
                    pergunta=p3,
                    texto=comentarios_exemplo[idx],
                    status_moderacao=ModeracaoStatus.PENDENTE,
                )

        self.stdout.write(
            f"- Ciclo ABERTO criado: '{ciclo_aberto.nome}' (ID: {ciclo_aberto.id})\n"
            f"  * 5 avaliações anônimas já submetidas para Matemática (aluno1 a aluno5).\n"
            f"  * aluno6.demo e aluno7.demo possuem pendências para avaliar!\n"
            f"  * História possui 0 avaliações (ideal para demonstrar 'dados insuficientes')."
        )
        self.stdout.write(self.style.SUCCESS("Dados de demonstração carregados com sucesso!"))
