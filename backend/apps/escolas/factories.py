import factory
from factory.django import DjangoModelFactory

from apps.accounts.factories import UsuarioFactory
from apps.escolas.models import Disciplina, Escola, Matricula, Turma, Vinculo


class EscolaFactory(DjangoModelFactory):
    class Meta:
        model = Escola

    nome = factory.Sequence(lambda n: f"Escola Modelo {n}")
    limiar_minimo = 5


class TurmaFactory(DjangoModelFactory):
    class Meta:
        model = Turma

    escola = factory.SubFactory(EscolaFactory)
    nome = factory.Sequence(lambda n: f"Turma {n}A")
    ano_letivo = 2026


class DisciplinaFactory(DjangoModelFactory):
    class Meta:
        model = Disciplina

    escola = factory.SubFactory(EscolaFactory)
    nome = factory.Sequence(lambda n: f"Disciplina {n}")
    codigo = factory.Sequence(lambda n: f"DISC_{n}")


class MatriculaFactory(DjangoModelFactory):
    class Meta:
        model = Matricula

    aluno = factory.SubFactory(
        UsuarioFactory,
        role="ALUNO",
        escola=factory.SelfAttribute("..turma.escola"),
    )
    turma = factory.SubFactory(TurmaFactory)


class VinculoFactory(DjangoModelFactory):
    class Meta:
        model = Vinculo

    professor = factory.SubFactory(
        UsuarioFactory,
        role="PROFESSOR",
        escola=factory.SelfAttribute("..turma.escola"),
    )
    turma = factory.SubFactory(TurmaFactory)
    disciplina = factory.LazyAttribute(lambda o: DisciplinaFactory(escola=o.turma.escola))
    ativo = True
