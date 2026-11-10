from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.permissions import IsAluno
from apps.avaliacoes.models import (
    Avaliacao,
    CicloAvaliacao,
    CicloStatus,
    Participacao,
    Pergunta,
    RespostaEscala,
    RespostaTexto,
)
from apps.avaliacoes.serializers import (
    EnviarAvaliacaoSerializer,
    PerguntaSerializer,
    VinculoPendenteSerializer,
)
from apps.escolas.models import Matricula, Vinculo


class AvaliacaoSubmitThrottle(ScopedRateThrottle):
    scope = "avaliacao_submit"


class AlunoPendenciasView(APIView):
    """
    GET /api/aluno/pendencias/
    Retorna os vínculos (professores/disciplinas da sua turma) ainda não avaliados
    pelo aluno em ciclos de avaliação atualmente com status ABERTO na sua escola.
    """

    permission_classes = [permissions.IsAuthenticated, IsAluno]

    def get(self, request, *args, **kwargs):
        aluno = request.user
        escola = aluno.escola

        if not escola:
            return Response(
                {"detail": "Aluno não possui escola vinculada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ciclos_abertos = CicloAvaliacao.objects.filter(escola=escola, status=CicloStatus.ABERTO)
        if not ciclos_abertos.exists():
            return Response([], status=status.HTTP_200_OK)

        # Turmas em que o aluno está matriculado
        turmas_ids = Matricula.objects.filter(aluno=aluno).values_list("turma_id", flat=True)

        # Todos os vínculos ativos dessas turmas
        vinculos_turma = Vinculo.objects.filter(
            turma_id__in=turmas_ids,
            ativo=True,
        ).select_related("professor", "disciplina", "turma")

        pendencias = []
        for ciclo in ciclos_abertos:
            vinculos_ja_avaliados = set(
                Participacao.objects.filter(
                    aluno=aluno,
                    ciclo=ciclo,
                ).values_list("vinculo_id", flat=True)
            )

            vinculos_pendentes = [v for v in vinculos_turma if v.id not in vinculos_ja_avaliados]
            if vinculos_pendentes:
                pendencias.append(
                    {
                        "ciclo_id": ciclo.id,
                        "ciclo_nome": ciclo.nome,
                        "abre_em": ciclo.abre_em,
                        "fecha_em": ciclo.fecha_em,
                        "vinculos": VinculoPendenteSerializer(vinculos_pendentes, many=True).data,
                    }
                )

        return Response(pendencias, status=status.HTTP_200_OK)


class AlunoQuestionarioView(APIView):
    """
    GET /api/aluno/ciclos/{ciclo_id}/vinculos/{vinculo_id}/questionario/
    Retorna as perguntas do questionário de um ciclo e vínculo específicos,
    validando que o ciclo está ABERTO, que o aluno pertence à turma do vínculo
    e que ainda não enviou avaliação.
    """

    permission_classes = [permissions.IsAuthenticated, IsAluno]

    def get(self, request, ciclo_id, vinculo_id, *args, **kwargs):
        aluno = request.user
        ciclo = get_object_or_404(CicloAvaliacao, id=ciclo_id, escola=aluno.escola)

        if ciclo.status != CicloStatus.ABERTO:
            return Response(
                {"detail": "Este ciclo de avaliação não está aberto."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        vinculo = get_object_or_404(
            Vinculo.objects.select_related("professor", "disciplina", "turma"),
            id=vinculo_id,
        )

        # Valida matrícula do aluno na turma do vínculo
        esta_matriculado = Matricula.objects.filter(
            aluno=aluno,
            turma=vinculo.turma,
        ).exists()
        if not esta_matriculado:
            return Response(
                {"detail": "Você não está matriculado na turma deste vínculo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Verifica se já avaliou
        ja_avaliou = Participacao.objects.filter(
            aluno=aluno,
            ciclo=ciclo,
            vinculo=vinculo,
        ).exists()
        if ja_avaliou:
            return Response(
                {"detail": "Você já respondeu à avaliação deste professor neste ciclo."},
                status=status.HTTP_409_CONFLICT,
            )

        perguntas = Pergunta.objects.filter(ciclo=ciclo).order_by("ordem", "id")
        return Response(
            {
                "ciclo": {
                    "id": ciclo.id,
                    "nome": ciclo.nome,
                    "status": ciclo.status,
                },
                "vinculo": VinculoPendenteSerializer(vinculo).data,
                "perguntas": PerguntaSerializer(perguntas, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class AlunoEnviarAvaliacaoView(APIView):
    """
    POST /api/aluno/avaliacoes/
    REGRA INEGOCIÁVEL, ANONIMATO POR ARQUITETURA:
    - Participacao(aluno, ciclo, vinculo) registra QUEM já avaliou. Não guarda conteúdo.
    - Avaliacao(id UUID, ciclo, vinculo) e suas respostas guardam O QUÊ foi dito.
      NÃO têm FK, hash ou chave comum com o aluno, e NÃO têm created_at/timestamp.
    - As duas são gravadas na mesma transaction.atomic.
    - Se duplicado, retorna 409 sem criar nada.
    - Nunca logar corpo de requisição nas rotas de avaliação. Nunca gravar IP junto da avaliação.
    """

    permission_classes = [permissions.IsAuthenticated, IsAluno]
    throttle_classes = [AvaliacaoSubmitThrottle]

    def post(self, request, *args, **kwargs):
        serializer = EnviarAvaliacaoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        aluno = request.user
        ciclo_id = serializer.validated_data["ciclo_id"]
        vinculo_id = serializer.validated_data["vinculo_id"]
        respostas_escala = serializer.validated_data.get("respostas_escala", [])
        respostas_texto = serializer.validated_data.get("respostas_texto", [])

        # 1. Validar ciclo
        ciclo = get_object_or_404(CicloAvaliacao, id=ciclo_id, escola=aluno.escola)
        if ciclo.status != CicloStatus.ABERTO:
            return Response(
                {"detail": "O ciclo avaliativo não está aberto para respostas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Validar vínculo e matrícula
        vinculo = get_object_or_404(Vinculo, id=vinculo_id)
        esta_matriculado = Matricula.objects.filter(
            aluno=aluno,
            turma=vinculo.turma,
        ).exists()
        if not esta_matriculado:
            return Response(
                {"detail": "Você não está matriculado na turma deste vínculo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 3. Gravação atômica de Participacao e Avaliacao
        try:
            with transaction.atomic():
                # Tenta registrar Participacao (garante unicidade via banco e lock)
                # Se já existir, o unique_together estoura IntegrityError
                if Participacao.objects.filter(aluno=aluno, ciclo=ciclo, vinculo=vinculo).exists():
                    return Response(
                        {"detail": "Você já avaliou este vínculo neste ciclo."},
                        status=status.HTTP_409_CONFLICT,
                    )

                Participacao.objects.create(
                    aluno=aluno,
                    ciclo=ciclo,
                    vinculo=vinculo,
                )

                # Cria a Avaliacao (sem aluno, id UUID, sem created_at)
                avaliacao = Avaliacao.objects.create(
                    ciclo=ciclo,
                    vinculo=vinculo,
                )

                # Cria respostas em lote
                escala_objs = [
                    RespostaEscala(
                        avaliacao=avaliacao,
                        pergunta_id=r["pergunta_id"],
                        valor=r["valor"],
                    )
                    for r in respostas_escala
                ]
                if escala_objs:
                    RespostaEscala.objects.bulk_create(escala_objs)

                texto_objs = [
                    RespostaTexto(
                        avaliacao=avaliacao,
                        pergunta_id=r["pergunta_id"],
                        texto=r["texto"],
                    )
                    for r in respostas_texto
                ]
                if texto_objs:
                    RespostaTexto.objects.bulk_create(texto_objs)

        except IntegrityError:
            return Response(
                {"detail": "Avaliação já registrada anteriormente."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {"detail": "Avaliação enviada com sucesso e arquivada de forma anônima."},
            status=status.HTTP_201_CREATED,
        )
