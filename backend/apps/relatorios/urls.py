from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.relatorios.views import (
    CicloAvaliacaoViewSet,
    CoordenacaoComentariosModeracaoView,
    CoordenacaoParticipacaoView,
    PerguntaViewSet,
    ProfessorResultadosView,
)

router = DefaultRouter()
router.register(r"coordenacao/ciclos", CicloAvaliacaoViewSet, basename="coordenacao-ciclos")
router.register(r"coordenacao/perguntas", PerguntaViewSet, basename="coordenacao-perguntas")

urlpatterns = [
    # Coordenação
    path(
        "coordenacao/participacao/",
        CoordenacaoParticipacaoView.as_view(),
        name="coordenacao-participacao",
    ),
    path(
        "coordenacao/comentarios/",
        CoordenacaoComentariosModeracaoView.as_view(),
        name="coordenacao-comentarios",
    ),
    path(
        "coordenacao/comentarios/<int:pk>/",
        CoordenacaoComentariosModeracaoView.as_view(),
        name="coordenacao-comentario-moderar",
    ),
    # Professor
    path("professor/resultados/", ProfessorResultadosView.as_view(), name="professor-resultados"),
    # Viewsets de CRUD
    path("", include(router.urls)),
]
