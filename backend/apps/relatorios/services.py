from django.db import transaction
from django.db.models import Avg

from apps.avaliacoes.models import (
    Avaliacao,
    CicloAvaliacao,
    CicloStatus,
    RespostaEscala,
)
from apps.escolas.models import Vinculo
from apps.relatorios.models import ResumoVinculo


class FechamentoCicloService:
    """
    Serviço que processa o fechamento de um ciclo e calcula os resumos por vínculo.
    REGRA INEGOCIÁVEL:
    - Resultados só são gerados / gravados quando n_avaliacoes >= escola.limiar_minimo.
    - Se n_avaliacoes < limiar_minimo, as médias não são expostas para preservar anonimato.
    """

    @classmethod
    @transaction.atomic
    def fechar_e_gerar_resumos(cls, ciclo: CicloAvaliacao):
        escola = ciclo.escola
        limiar_minimo = escola.limiar_minimo

        # Atualiza status do ciclo para FECHADO
        ciclo.status = CicloStatus.FECHADO
        ciclo.save(update_fields=["status", "updated_at"])

        # Identifica todos os vínculos que possuem avaliações neste ciclo
        vinculos_com_avaliacao = (
            Avaliacao.objects.filter(ciclo=ciclo).values_list("vinculo_id", flat=True).distinct()
        )

        resumos_gerados = []

        for vinculo_id in vinculos_com_avaliacao:
            vinculo = Vinculo.objects.get(id=vinculo_id)
            avaliacoes = Avaliacao.objects.filter(ciclo=ciclo, vinculo=vinculo)
            n_avaliacoes = avaliacoes.count()

            if n_avaliacoes >= limiar_minimo:
                # Agrupa médias por dimensão pedagógica
                respostas = (
                    RespostaEscala.objects.filter(avaliacao__in=avaliacoes)
                    .values("pergunta__dimensao")
                    .annotate(media=Avg("valor"))
                )

                medias_por_dimensao = {}
                soma_medias = 0.0
                count_dimensoes = 0

                for r in respostas:
                    dimensao = r["pergunta__dimensao"]
                    media = round(float(r["media"]), 2)
                    medias_por_dimensao[dimensao] = media
                    soma_medias += media
                    count_dimensoes += 1

                media_geral = (
                    round(soma_medias / count_dimensoes, 2) if count_dimensoes > 0 else 0.0
                )

                resumo, _ = ResumoVinculo.objects.update_or_create(
                    ciclo=ciclo,
                    vinculo=vinculo,
                    defaults={
                        "n_avaliacoes": n_avaliacoes,
                        "medias_por_dimensao": medias_por_dimensao,
                        "media_geral": media_geral,
                        "limiar_atingido": True,
                    },
                )
                resumos_gerados.append(resumo)
            else:
                # Registra o resumo indicando que o limiar não foi atingido
                # SEM expor as médias por dimensão para não quebrar o anonimato
                resumo, _ = ResumoVinculo.objects.update_or_create(
                    ciclo=ciclo,
                    vinculo=vinculo,
                    defaults={
                        "n_avaliacoes": n_avaliacoes,
                        "medias_por_dimensao": {},
                        "media_geral": 0.0,
                        "limiar_atingido": False,
                    },
                )
                resumos_gerados.append(resumo)

        return resumos_gerados
