import random
from collections import defaultdict

from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsCoordenacaoOrAdmin, IsProfessor
from apps.avaliacoes.models import (
    Avaliacao,
    CicloAvaliacao,
    CicloStatus,
    ModeracaoStatus,
    Participacao,
    Pergunta,
    RespostaTexto,
)
from apps.escolas.mixins import EscolaIsolationMixin
from apps.escolas.models import Matricula, Turma
from apps.relatorios.models import ResumoVinculo
from apps.relatorios.serializers import (
    CicloAvaliacaoCrudSerializer,
    ModeracaoComentarioSerializer,
    ModerarComentarioUpdateSerializer,
    PerguntaCrudSerializer,
    ResumoVinculoProfessorSerializer,
)
from apps.relatorios.services import FechamentoCicloService

# ==============================================================================
# ENDPOINTS DE COORDENAÇÃO
# ==============================================================================


class CicloAvaliacaoViewSet(EscolaIsolationMixin, viewsets.ModelViewSet):
    """
    CRUD completo de ciclos de avaliação pela Coordenação/Admin.
    Ações: abrir, fechar, publicar.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoordenacaoOrAdmin]
    serializer_class = CicloAvaliacaoCrudSerializer
    queryset = CicloAvaliacao.objects.all()

    def perform_create(self, serializer):
        escola = self.request.user.escola
        serializer.save(escola=escola)

    @action(detail=True, methods=["post"])
    def abrir(self, request, pk=None):
        ciclo = self.get_object()
        ciclo.status = CicloStatus.ABERTO
        ciclo.save(update_fields=["status", "updated_at"])
        return Response(
            {"detail": f"Ciclo '{ciclo.nome}' aberto com sucesso.", "status": ciclo.status},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def fechar(self, request, pk=None):
        ciclo = self.get_object()
        resumos = FechamentoCicloService.fechar_e_gerar_resumos(ciclo)
        return Response(
            {
                "detail": f"Ciclo '{ciclo.nome}' fechado com sucesso.",
                "status": ciclo.status,
                "total_resumos": len(resumos),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def publicar(self, request, pk=None):
        ciclo = self.get_object()
        if ciclo.status != CicloStatus.FECHADO:
            # Se ainda não estiver fechado, fecha e processa primeiro
            FechamentoCicloService.fechar_e_gerar_resumos(ciclo)

        ciclo.status = CicloStatus.PUBLICADO
        ciclo.save(update_fields=["status", "updated_at"])
        return Response(
            {"detail": f"Ciclo '{ciclo.nome}' publicado com sucesso.", "status": ciclo.status},
            status=status.HTTP_200_OK,
        )


class PerguntaViewSet(viewsets.ModelViewSet):
    """
    CRUD de perguntas por ciclo de avaliação.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoordenacaoOrAdmin]
    serializer_class = PerguntaCrudSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Pergunta.objects.all()
        if user.role != "ADMIN" or user.escola:
            queryset = queryset.filter(ciclo__escola=user.escola)

        ciclo_id = self.request.query_params.get("ciclo")
        if ciclo_id:
            queryset = queryset.filter(ciclo_id=ciclo_id)
        return queryset


class CoordenacaoParticipacaoView(APIView):
    """
    GET /api/coordenacao/participacao/?ciclo={id}
    Retorna a taxa de adesão AGREGADA por turma.
    REGRA INEGOCIÁVEL:
    - NUNCA retorna nomes de alunos.
    - Apenas total de alunos matriculados e alunos que já responderam (ao menos uma avaliação).
    """

    permission_classes = [permissions.IsAuthenticated, IsCoordenacaoOrAdmin]

    def get(self, request, *args, **kwargs):
        escola = request.user.escola
        ciclo_id = request.query_params.get("ciclo")

        ciclo_qs = CicloAvaliacao.objects.all()
        if escola:
            ciclo_qs = ciclo_qs.filter(escola=escola)

        if ciclo_id:
            ciclo = get_object_or_404(ciclo_qs, id=ciclo_id)
        else:
            ciclo = ciclo_qs.filter(status=CicloStatus.ABERTO).first()
            if not ciclo:
                ciclo = ciclo_qs.order_by("-id").first()

        if not ciclo:
            return Response([], status=status.HTTP_200_OK)

        # Turmas da escola
        turmas = Turma.objects.filter(escola=ciclo.escola)
        dados_adesao = []

        for turma in turmas:
            total_matriculados = Matricula.objects.filter(turma=turma).count()

            # Alunos que registraram pelo menos uma participação neste ciclo para esta turma
            alunos_participantes = (
                Participacao.objects.filter(
                    ciclo=ciclo,
                    vinculo__turma=turma,
                )
                .values("aluno_id")
                .distinct()
                .count()
            )

            taxa = (
                round((alunos_participantes / total_matriculados) * 100, 1)
                if total_matriculados > 0
                else 0.0
            )

            dados_adesao.append(
                {
                    "turma_id": turma.id,
                    "turma_nome": turma.nome,
                    "ano_letivo": turma.ano_letivo,
                    "total_alunos": total_matriculados,
                    "alunos_responderam": alunos_participantes,
                    "taxa_adesao_percentual": taxa,
                }
            )

        return Response(
            {
                "ciclo_id": ciclo.id,
                "ciclo_nome": ciclo.nome,
                "status": ciclo.status,
                "turmas": dados_adesao,
            },
            status=status.HTTP_200_OK,
        )


class CoordenacaoComentariosModeracaoView(APIView):
    """
    Fila de moderação de comentários da coordenação:
    GET  /api/coordenacao/comentarios/
         Retorna comentários em ordem aleatória, sem autoria, sem data.
    PATCH /api/coordenacao/comentarios/{id}/
         Aprova ou rejeita comentário individualmente.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoordenacaoOrAdmin]

    def get(self, request, *args, **kwargs):
        escola = request.user.escola
        status_filtro = request.query_params.get("status", ModeracaoStatus.PENDENTE)

        comentarios = RespostaTexto.objects.all()
        if escola:
            comentarios = comentarios.filter(avaliacao__ciclo__escola=escola)

        if status_filtro:
            comentarios = comentarios.filter(status_moderacao=status_filtro)

        comentarios_list = list(comentarios.select_related("pergunta__ciclo"))
        # Embaralha a ordem para não permitir correlação cronológica
        random.shuffle(comentarios_list)

        serializer = ModeracaoComentarioSerializer(comentarios_list, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk=None, *args, **kwargs):
        escola = request.user.escola
        qs = RespostaTexto.objects.all()
        if escola:
            qs = qs.filter(avaliacao__ciclo__escola=escola)

        comentario = get_object_or_404(qs, id=pk)
        serializer = ModerarComentarioUpdateSerializer(comentario, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "detail": f"Comentário {comentario.id} atualizado com sucesso.",
                "status_moderacao": comentario.status_moderacao,
            },
            status=status.HTTP_200_OK,
        )


# ==============================================================================
# ENDPOINT DO PROFESSOR
# ==============================================================================


class ProfessorResultadosView(APIView):
    """
    GET /api/professor/resultados/?ciclo={id}
    REGRA INEGOCIÁVEL:
    - Apenas resultados do PRÓPRIO professor autenticado.
    - Só retorna de ciclos com status PUBLICADO.
    - Só exibe resultados onde o limiar mínimo de avaliações foi atingido.
    - Comentários apenas com status_moderacao APROVADO, embaralhados (ordem aleatória) e sem data.
    - NUNCA retorna rankings.
    """

    permission_classes = [permissions.IsAuthenticated, IsProfessor]

    def get(self, request, *args, **kwargs):
        professor = request.user
        ciclo_id = request.query_params.get("ciclo")

        if not ciclo_id:
            return Response(
                {"detail": "Parâmetro 'ciclo' é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Busca ciclo da mesma escola do professor
        ciclo = get_object_or_404(
            CicloAvaliacao,
            id=ciclo_id,
            escola=professor.escola,
        )

        # Bloqueia se o ciclo não estiver PUBLICADO
        if ciclo.status != CicloStatus.PUBLICADO:
            return Response(
                {"detail": "Os resultados deste ciclo ainda não foram publicados."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Resumos apenas dos vínculos deste professor que atingiram o limiar
        resumos = ResumoVinculo.objects.filter(
            ciclo=ciclo,
            vinculo__professor=professor,
            limiar_atingido=True,
        ).select_related("vinculo__disciplina", "vinculo__turma")

        # Coleta e embaralha comentários aprovados de cada vínculo
        vinculos_ids = [r.vinculo_id for r in resumos]
        avaliacoes = Avaliacao.objects.filter(ciclo=ciclo, vinculo_id__in=vinculos_ids)

        comentarios_qs = RespostaTexto.objects.filter(
            avaliacao__in=avaliacoes,
            status_moderacao=ModeracaoStatus.APROVADO,
        ).values("avaliacao__vinculo_id", "texto", "pergunta__dimensao")

        comentarios_por_vinculo = defaultdict(list)
        for c in comentarios_qs:
            comentarios_por_vinculo[c["avaliacao__vinculo_id"]].append(
                {
                    "texto": c["texto"],
                    "dimensao": c["pergunta__dimensao"],
                }
            )

        # Embaralha os comentários de cada vínculo
        for v_id in comentarios_por_vinculo:
            random.shuffle(comentarios_por_vinculo[v_id])

        serializer = ResumoVinculoProfessorSerializer(
            resumos,
            many=True,
            context={"comentarios_map": comentarios_por_vinculo},
        )

        return Response(
            {
                "ciclo_id": ciclo.id,
                "ciclo_nome": ciclo.nome,
                "resultados": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
