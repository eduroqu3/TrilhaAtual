from rest_framework import permissions, status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsCoordenacaoOrAdmin
from apps.escolas.mixins import EscolaIsolationMixin
from apps.escolas.models import Disciplina, Escola, Matricula, Turma, Vinculo
from apps.escolas.serializers import (
    DisciplinaSerializer,
    EscolaSerializer,
    MatriculaSerializer,
    TurmaSerializer,
    VinculoSerializer,
)
from apps.escolas.services import ImportacaoCSVSerializer, ImportacaoEscolaService


class ImportarCSVView(APIView):
    permission_classes = [IsCoordenacaoOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        serializer = ImportacaoCSVSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        arquivo = serializer.validated_data["arquivo"]
        escola_id = serializer.validated_data.get("escola_id")

        resultado = ImportacaoEscolaService.process_csv(
            file_obj=arquivo,
            escola_id=escola_id,
            user=request.user,
        )

        if not resultado["sucesso"]:
            return Response(resultado, status=status.HTTP_400_BAD_REQUEST)

        return Response(resultado, status=status.HTTP_201_CREATED)


class EscolaViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EscolaSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == "ADMIN" and not user.escola:
            return Escola.objects.all()
        if user.escola:
            return Escola.objects.filter(id=user.escola_id)
        return Escola.objects.none()


class TurmaViewSet(EscolaIsolationMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TurmaSerializer
    queryset = Turma.objects.all()


class DisciplinaViewSet(EscolaIsolationMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DisciplinaSerializer
    queryset = Disciplina.objects.all()


class MatriculaViewSet(EscolaIsolationMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MatriculaSerializer
    queryset = Matricula.objects.all()
    escola_lookup = "turma__escola"


class VinculoViewSet(EscolaIsolationMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VinculoSerializer
    queryset = Vinculo.objects.all()
    escola_lookup = "turma__escola"
