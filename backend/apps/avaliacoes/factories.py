from datetime import timedelta

import factory
from django.utils import timezone
from factory.django import DjangoModelFactory

from apps.avaliacoes.models import (
    Avaliacao,
    CicloAvaliacao,
    CicloStatus,
    Participacao,
    Pergunta,
    PerguntaTipo,
    RespostaEscala,
    RespostaTexto,
)
from apps.escolas.factories import EscolaFactory, MatriculaFactory, VinculoFactory


class CicloAvaliacaoFactory(DjangoModelFactory):
    class Meta:
        model = CicloAvaliacao

    escola = factory.SubFactory(EscolaFactory)
    nome = factory.Sequence(lambda n: f"Ciclo de Avaliação {n}")
    abre_em = factory.LazyFunction(lambda: timezone.now() - timedelta(days=1))
    fecha_em = factory.LazyFunction(lambda: timezone.now() + timedelta(days=10))
    status = CicloStatus.ABERTO


class PerguntaFactory(DjangoModelFactory):
    class Meta:
        model = Pergunta

    ciclo = factory.SubFactory(CicloAvaliacaoFactory)
    texto = factory.Sequence(lambda n: f"Como você avalia o aspecto didático {n}?")
    tipo = PerguntaTipo.ESCALA_1_5
    dimensao = "Didática"
    ordem = factory.Sequence(lambda n: n + 1)


class ParticipacaoFactory(DjangoModelFactory):
    class Meta:
        model = Participacao

    ciclo = factory.SubFactory(CicloAvaliacaoFactory)
    vinculo = factory.LazyAttribute(lambda o: VinculoFactory(turma__escola=o.ciclo.escola))
    aluno = factory.LazyAttribute(lambda o: MatriculaFactory(turma=o.vinculo.turma).aluno)


class AvaliacaoFactory(DjangoModelFactory):
    class Meta:
        model = Avaliacao

    ciclo = factory.SubFactory(CicloAvaliacaoFactory)
    vinculo = factory.LazyAttribute(lambda o: VinculoFactory(turma__escola=o.ciclo.escola))


class RespostaEscalaFactory(DjangoModelFactory):
    class Meta:
        model = RespostaEscala

    avaliacao = factory.SubFactory(AvaliacaoFactory)
    pergunta = factory.LazyAttribute(lambda o: PerguntaFactory(ciclo=o.avaliacao.ciclo))
    valor = 5


class RespostaTextoFactory(DjangoModelFactory):
    class Meta:
        model = RespostaTexto

    avaliacao = factory.SubFactory(AvaliacaoFactory)
    pergunta = factory.LazyAttribute(
        lambda o: PerguntaFactory(ciclo=o.avaliacao.ciclo, tipo=PerguntaTipo.TEXTO)
    )
    texto = "Excelente professor, muito atencioso e claro."
