from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.escolas.views import (
    DisciplinaViewSet,
    EscolaViewSet,
    ImportarCSVView,
    MatriculaViewSet,
    TurmaViewSet,
    VinculoViewSet,
)

router = DefaultRouter()
router.register(r"turmas", TurmaViewSet, basename="turma")
router.register(r"disciplinas", DisciplinaViewSet, basename="disciplina")
router.register(r"matriculas", MatriculaViewSet, basename="matricula")
router.register(r"vinculos", VinculoViewSet, basename="vinculo")
router.register(r"info", EscolaViewSet, basename="escola")

urlpatterns = [
    path("importar/", ImportarCSVView.as_view(), name="escolas-importar"),
    path("", include(router.urls)),
]
